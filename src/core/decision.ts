/**
 * Stage 3 — decision layer (plan §6.1, §6.2 scoring, §5.3 verdict semantics).
 *
 * Rule scoring (§6.2):
 *   any H1/H2/H3            → SCAM_CONFIRMED
 *   any other HARD (H4/H5)  → LIKELY_SCAM
 *   ≥ 2 SOFT                → LIKELY_SCAM
 *   1 SOFT                  → defer to the LLM   (rules-only: UNSURE)
 *   P1 alone                → at most LIKELY_SAFE
 *   nothing                 → defer to the LLM   (rules-only: UNSURE)
 *
 * Merging the LLM (it can never override the rules):
 *   - When the rules decided (HARD, ≥2 SOFT, P1), final = max(rule verdict, LLM verdict):
 *     the LLM may raise severity, never lower it.
 *   - When the rules deferred, the LLM verdict is used, with these caps:
 *       • LLM scam verdicts with confidence < 0.75 become UNSURE (§5.3: LIKELY_SCAM needs ≥ 0.75);
 *       • SCAM_CONFIRMED requires a hard rule (§5.3), so an LLM-only scam is LIKELY_SCAM;
 *       • LIKELY_SAFE is impossible if any HARD/SOFT flag, link or ask is present (§6.5) → UNSURE.
 */
import type { LlmOutput } from '../llm/schema.js';
import type { RuleResult } from './rules.js';
import { maxVerdict, type Verdict } from './types.js';

export type RuleBasis = 'hard_confirmed' | 'hard' | 'soft_multiple' | 'soft_single' | 'positive' | 'none';

export interface RuleScore {
  verdict: Verdict;
  basis: RuleBasis;
  /** True when §6.2 says "defer to the LLM". */
  deferred: boolean;
}

const CONFIRMING_HARD = new Set(['H1', 'H2', 'H3']);
export const LLM_SCAM_MIN_CONFIDENCE = 0.75;

export function scoreRules(r: RuleResult): RuleScore {
  if (r.hard.some((f) => CONFIRMING_HARD.has(f.id))) {
    return { verdict: 'SCAM_CONFIRMED', basis: 'hard_confirmed', deferred: false };
  }
  if (r.hard.length > 0) return { verdict: 'LIKELY_SCAM', basis: 'hard', deferred: false };
  if (r.soft.length >= 2) return { verdict: 'LIKELY_SCAM', basis: 'soft_multiple', deferred: false };
  if (r.soft.length === 1) return { verdict: 'UNSURE', basis: 'soft_single', deferred: true };
  if (r.positive.length > 0) return { verdict: 'LIKELY_SAFE', basis: 'positive', deferred: false };
  return { verdict: 'UNSURE', basis: 'none', deferred: true };
}

/** The LLM's verdict after applying the caps above (before combining with the rule verdict). */
export function capLlmVerdict(r: RuleResult, llm: LlmOutput): Verdict {
  let v = llm.verdict;
  if (v === 'LIKELY_SCAM' || v === 'SCAM_CONFIRMED') {
    if (llm.confidence < LLM_SCAM_MIN_CONFIDENCE) v = 'UNSURE';
    else if (v === 'SCAM_CONFIRMED' && r.hard.length === 0) v = 'LIKELY_SCAM';
  }
  if (v === 'LIKELY_SAFE') {
    const blocked = r.hard.length > 0 || r.soft.length > 0 || r.signals.links.length > 0 || r.signals.hasAsk;
    if (blocked) v = 'UNSURE';
  }
  return v;
}

export interface Decision {
  verdict: Verdict;
  ruleVerdict: Verdict;
  basis: RuleBasis;
  /** Which stage determined the final verdict. */
  decidedBy: 'rules' | 'llm';
}

export function decide(r: RuleResult, llm: LlmOutput | null): Decision {
  const score = scoreRules(r);
  if (!llm) return { verdict: score.verdict, ruleVerdict: score.verdict, basis: score.basis, decidedBy: 'rules' };

  const capped = capLlmVerdict(r, llm);
  const verdict = score.deferred ? capped : maxVerdict(score.verdict, capped);
  return {
    verdict,
    ruleVerdict: score.verdict,
    basis: score.basis,
    decidedBy: verdict === score.verdict && !score.deferred ? 'rules' : 'llm',
  };
}
