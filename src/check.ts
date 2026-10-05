/**
 * The /check pipeline (plan §6.1):
 *   normalize → Stage 1 rules → Stage 2 LLM (optional) → Stage 3 decision → wording.
 *
 * Nothing here stores or logs message content. The LLM is optional: without
 * GEMINI_API_KEY (or on timeout / invalid output) the result is rules-only.
 */
import { decide, capLlmVerdict, type Decision } from './core/decision.js';
import { normalizeMessage } from './core/normalize.js';
import { helplineFor, isOfficialNumber } from './core/officialSenders.js';
import { redact } from './core/redact.js';
import { evaluateRules, RULES_VERSION, type RuleResult } from './core/rules.js';
import { resolveSender, type SenderInfo } from './core/sender.js';
import type { Flag, Labels, RecommendedAction, ScamType, Verdict } from './core/types.js';
import { DISCLAIMER, SAFETY_TIP, VERDICT_HEADLINE } from './core/wording.js';
import { createClassifierFromEnv, timeoutFromEnv, type LlmClassifier } from './llm/provider.js';
import { PROMPT_VERSION } from './llm/prompt.js';
import type { LlmOutput } from './llm/schema.js';

export const MAX_MESSAGE_CHARS = 4000;

export interface CheckInput {
  text: string;
  /** Sender as shown on the phone ("8171", "0341-1234567", "unknown"). Optional. */
  sender?: string | undefined;
}

export interface CheckOptions {
  /** LLM classifier; `null` forces rules-only. Defaults to `createClassifierFromEnv()`. */
  llm?: LlmClassifier | null;
  now?: Date;
  timeoutMs?: number;
}

export interface RedFlag {
  code: string;
  label_ur: string;
  label_roman?: string;
  label_en: string;
}

export interface CheckResult {
  verdict: Verdict;
  emoji: string;
  headline: Labels;
  confidence: number;
  scam_type: ScamType;
  impersonated_entity: string | null;
  red_flags: RedFlag[];
  explanation: Labels;
  safety_tip: Labels;
  disclaimer: Labels;
  recommended_action: RecommendedAction;
  official_helpline: string | null;
  needs_sender: boolean;
  /** Pre-composed PTA 9000 report (§9.3). The product never reports automatically. */
  report: { sms_to: '9000'; body: string } | null;
  rule_flags: { hard: Flag[]; soft: Flag[]; positive: Flag[] };
  meta: {
    rules_version: string;
    prompt_version: string;
    rule_verdict: Verdict;
    decided_by: Decision['decidedBy'];
    llm: { status: 'disabled' | 'ok' | 'error'; provider?: string; model?: string; error?: string };
    latency_ms: number;
  };
}

/** Heuristic confidences for rules-only verdicts. */
const RULE_CONFIDENCE: Record<Verdict, number> = {
  SCAM_CONFIRMED: 0.95,
  LIKELY_SCAM: 0.8,
  UNSURE: 0.5,
  LIKELY_SAFE: 0.6,
};

const isScamSide = (v: Verdict) => v === 'SCAM_CONFIRMED' || v === 'LIKELY_SCAM';

function ruleFlags(r: RuleResult): Flag[] {
  return [...r.hard, ...r.soft];
}

function inferScamType(r: RuleResult): ScamType {
  const ids = new Set(ruleFlags(r).map((f) => f.id));
  if (ids.size === 0) return 'none';
  const s = r.signals;
  if (ids.has('H1') || s.mentionsBisp) return 'fake_bisp_welfare';
  if (s.echallan && (ids.has('H5') || ids.has('S4'))) return 'fake_echallan';
  if (s.courier && (ids.has('H5') || ids.has('S4'))) return 'fake_courier';
  if (ids.has('H3') || s.prize) return 'fake_prize_lottery';
  if (ids.has('S6') && s.mistake) return 'money_sent_by_mistake';
  if (ids.has('S6') && s.emergency) return 'family_emergency';
  if (s.claimedEntities.includes('PTA') && ids.has('S1')) return 'sim_block_pta';
  if (ids.has('H2') || ids.has('H4')) return 'wallet_bank_otp';
  if (ids.has('S4')) return 'phishing_link';
  return 'other';
}

function ruleImpersonatedEntity(r: RuleResult): string | null {
  if (r.signals.mentionsBisp) return 'BISP';
  return r.signals.claimedEntities[0] ?? null;
}

function ruleAction(verdict: Verdict, r: RuleResult): RecommendedAction {
  if (verdict === 'LIKELY_SAFE') return 'no_action_needed';
  if (verdict === 'UNSURE') return 'verify_helpline';
  const ids = new Set(ruleFlags(r).map((f) => f.id));
  if (ids.has('S4') || ids.has('H5')) return 'do_not_click';
  if (ids.has('S2') || ids.has('H1') || ids.has('H3')) return 'do_not_call';
  if (ids.has('H4')) return 'do_not_pay';
  if (ids.has('H2') || ids.has('S3')) return 'verify_helpline';
  return 'report_9000';
}

function ruleExplanation(verdict: Verdict, flags: Flag[]): Labels {
  const h = VERDICT_HEADLINE[verdict];
  const top = flags.slice(0, 3);
  if (top.length === 0) return { ur: h.ur, roman: h.roman, en: h.en };
  return {
    ur: `${h.ur} ${top.map((f) => f.label.ur).join('۔ ')}۔`,
    roman: `${h.roman} ${top.map((f) => f.label.roman).join('. ')}.`,
    en: `${h.en} ${top.map((f) => f.label.en).join('. ')}.`,
  };
}

async function runLlm(
  llm: LlmClassifier,
  redacted: string,
  sender: SenderInfo,
  rules: RuleResult,
  timeoutMs: number,
): Promise<{ output: LlmOutput | null; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const output = await llm.classify(
      {
        message_text: redacted,
        sender: sender.value ?? 'unknown',
        rule_flags: [...rules.hard, ...rules.soft, ...rules.positive].map(({ id, type, code }) => ({ id, type, code })),
      },
      controller.signal,
    );
    return { output };
  } catch (err) {
    // Error names only — never the message content.
    const name = controller.signal.aborted ? 'timeout' : err instanceof Error ? err.name || 'error' : 'error';
    return { output: null, error: name === 'Error' && err instanceof Error ? err.message.slice(0, 80) : name };
  } finally {
    clearTimeout(timer);
  }
}

export async function checkMessage(input: CheckInput, opts: CheckOptions = {}): Promise<CheckResult> {
  const started = performance.now();
  const now = opts.now ?? new Date();
  const llm = opts.llm === undefined ? createClassifierFromEnv() : opts.llm;
  const text = input.text.slice(0, MAX_MESSAGE_CHARS);

  // Stage 0 — normalize + sender
  const msg = normalizeMessage(text);
  const sender = resolveSender(input.sender, msg.embeddedSender);

  // Stage 1 — deterministic rules
  const rules = evaluateRules(msg, sender, now);
  const redacted = redact(text);

  // Stage 2 — optional LLM
  let llmOut: LlmOutput | null = null;
  let llmMeta: CheckResult['meta']['llm'] = { status: 'disabled' };
  if (llm) {
    const { output, error } = await runLlm(llm, redacted, sender, rules, opts.timeoutMs ?? timeoutFromEnv());
    llmOut = output;
    llmMeta = output
      ? { status: 'ok', provider: llm.provider, model: llm.model }
      : { status: 'error', provider: llm.provider, model: llm.model, error: error ?? 'error' };
  }

  // Stage 3 — decision (rules can never be overridden)
  const decision = decide(rules, llmOut);
  const verdict = decision.verdict;
  const llmAgrees = llmOut !== null && capLlmVerdict(rules, llmOut) === verdict;

  const flags = ruleFlags(rules);
  const redFlags: RedFlag[] = flags.map((f) => ({
    code: f.code,
    label_ur: f.label.ur,
    label_roman: f.label.roman,
    label_en: f.label.en,
  }));
  if (llmOut && llmAgrees && verdict !== 'LIKELY_SAFE') {
    for (const lf of llmOut.red_flags) {
      if (!redFlags.some((r) => r.code === lf.code)) redFlags.push({ ...lf });
    }
  }

  const entity = (llmAgrees ? llmOut?.impersonated_entity : null) ?? ruleImpersonatedEntity(rules);
  const llmHelpline =
    llmAgrees && llmOut?.official_helpline && isOfficialNumber(llmOut.official_helpline)
      ? llmOut.official_helpline
      : null;
  const helpline = verdict === 'LIKELY_SAFE' ? null : (helplineFor(entity) ?? llmHelpline);

  let action: RecommendedAction = llmAgrees && llmOut ? llmOut.recommended_action : ruleAction(verdict, rules);
  if (action === 'no_action_needed' && verdict !== 'LIKELY_SAFE') action = ruleAction(verdict, rules);

  const scamType: ScamType =
    llmAgrees && llmOut && llmOut.scam_type !== 'none' ? llmOut.scam_type : inferScamType(rules);

  const explanation: Labels =
    llmAgrees && llmOut
      ? { ur: llmOut.explanation_ur, roman: llmOut.explanation_roman, en: llmOut.explanation_en }
      : ruleExplanation(verdict, flags);

  const needsSender =
    sender.kind === 'unknown' &&
    verdict !== 'SCAM_CONFIRMED' &&
    (rules.signals.mentionsBisp || (llmOut?.needs_sender ?? false));

  const reportNumber = sender.kind === 'mobile' || sender.kind === 'other' ? sender.value : null;
  const report = isScamSide(verdict)
    ? {
        sms_to: '9000' as const,
        body: `${reportNumber ?? '<sender number>'} ${redacted.replace(/\s+/g, ' ').trim().slice(0, 120)}`,
      }
    : null;

  const head = VERDICT_HEADLINE[verdict];
  return {
    verdict,
    emoji: head.emoji,
    headline: { ur: head.ur, roman: head.roman, en: head.en },
    confidence: decision.decidedBy === 'llm' && llmOut ? llmOut.confidence : RULE_CONFIDENCE[verdict],
    scam_type: isScamSide(verdict) || verdict === 'UNSURE' ? scamType : 'none',
    impersonated_entity: verdict === 'LIKELY_SAFE' ? null : entity,
    red_flags: redFlags.slice(0, 3),
    explanation,
    safety_tip: SAFETY_TIP,
    disclaimer: DISCLAIMER,
    recommended_action: action,
    official_helpline: helpline,
    needs_sender: needsSender,
    report,
    rule_flags: { hard: rules.hard, soft: rules.soft, positive: rules.positive },
    meta: {
      rules_version: RULES_VERSION,
      prompt_version: PROMPT_VERSION,
      rule_verdict: decision.ruleVerdict,
      decided_by: decision.decidedBy,
      llm: llmMeta,
      latency_ms: Math.round(performance.now() - started),
    },
  };
}
