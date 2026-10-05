/**
 * Stage 1 — deterministic rules engine (plan §6.2, rules v1).
 *
 *   H1 HARD  Mentions BISP/Benazir/Kafaalat/Ehsaas and sender ≠ 8171 (or sender is 03xx mobile)
 *   H2 HARD  Asks for OTP / PIN / code / password
 *   H3 HARD  Prize/lottery + must call/pay/send to claim
 *   H4 HARD  Claims govt/telco/bank/courier but asks to pay via mobile wallet/scratch card
 *   H5 HARD  Official e-challan/courier claim containing a link
 *   S1 SOFT  Urgency / threat
 *   S2 SOFT  Call-this-number instruction
 *   S3 SOFT  Asks for CNIC / photo of CNIC / biometric
 *   S4 SOFT  Link present; shortener or look-alike domain
 *   S5 SOFT  Very large amount for government aid
 *   S6 SOFT  "Money sent by mistake" or family emergency + money
 *   P1 POS   Sender matches High-confidence official list and no asks, no links, no call-back
 *
 * Pure and deterministic: same input + same `now` → same output. No network, no LLM.
 */
import * as K from './keywords.js';
import { findHits, near, uniqueKeywords, withoutOverlap, type Hit, type KeywordSet } from './match.js';
import type { NormalizedMessage, UrlInfo } from './normalize.js';
import { findTrustedSender, isOfficialHost, isOfficialNumber, type OfficialEntry } from './officialSenders.js';
import type { SenderInfo } from './sender.js';
import type { Flag, FlagType, RuleId } from './types.js';
import { FLAG_LABELS } from './wording.js';

export const RULES_VERSION = '1.0.0';

/** Proximity window (tokens) between an ask verb and the thing being asked for. */
const ASK_WINDOW = 5;
/** S5 threshold. The plan gives "25,00,000" / "25 lakh" as examples but no number; 1 lakh is our cut-off. */
export const LARGE_AID_AMOUNT = 100_000;

export interface LinkAssessment {
  host: string;
  official: boolean;
  shortener: boolean;
  lookalike: boolean;
}

export interface RuleSignals {
  mentionsBisp: boolean;
  /** Entity names the message claims to come from (for scam_type / impersonated_entity). */
  claimedEntities: string[];
  links: LinkAssessment[];
  trustedSender: OfficialEntry | null;
  prize: boolean;
  echallan: boolean;
  courier: boolean;
  mistake: boolean;
  emergency: boolean;
  /** Did the message ask the reader to call, pay, send a secret or a CNIC? */
  hasAsk: boolean;
}

export interface RuleResult {
  hard: Flag[];
  soft: Flag[];
  positive: Flag[];
  signals: RuleSignals;
}

function flag(id: RuleId, type: FlagType, code: string, evidence: string[]): Flag {
  return { id, type, code, label: FLAG_LABELS[id], evidence: evidence.slice(0, 5) };
}

function assessLink(u: UrlInfo): LinkAssessment {
  const official = isOfficialHost(u.host);
  const shortener = K.URL_SHORTENERS.some((s) => u.host === s || u.host.endsWith(`.${s}`));
  const squashed = u.host.replace(/[.-]/g, '');
  const lookalike = !official && K.BRAND_FRAGMENTS.some((b) => squashed.includes(b.replace(/[.-]/g, '')));
  return { host: u.host, official, shortener, lookalike };
}

/**
 * Ask-verb hits that are not part of a safety warning ("kisi ko na batayein", "do not share").
 * A negation preceded by a conditional ("agar code na bataya to…") is a threat, not a warning,
 * so the ask stays active.
 */
function activeAsks(tokens: readonly string[], asks: Hit[]): Hit[] {
  const negs = [...findHits(tokens, K.NEGATORS), ...findHits(tokens, K.SHORT_NEGATORS)];
  const conds = findHits(tokens, K.CONDITIONALS);
  return asks.filter((a) => {
    const negated = negs.some((n) => {
      const inWindow = n.index >= a.index - 3 && n.index <= a.index + a.length + 1 && n.index !== a.index;
      if (!inWindow) return false;
      const conditional = conds.some((c) => c.index < n.index && c.index >= n.index - 6);
      return !conditional;
    });
    return !negated;
  });
}

function hits(tokens: readonly string[], set: KeywordSet): Hit[] {
  return findHits(tokens, set);
}

export function evaluateRules(msg: NormalizedMessage, sender: SenderInfo, now: Date): RuleResult {
  const t = msg.tokens;
  const hard: Flag[] = [];
  const soft: Flag[] = [];
  const positive: Flag[] = [];

  // --- entity / topic detection ---
  const bisp = hits(t, K.BISP);
  const govt = hits(t, K.GOVT);
  const telco = hits(t, K.TELCO);
  const bank = hits(t, K.BANK_WALLET);
  const courier = hits(t, K.COURIER);
  const echallan = hits(t, K.ECHALLAN);

  // --- asks ---
  const asks = activeAsks(t, hits(t, K.ASK_VERBS));
  const secrets = hits(t, K.SECRETS);
  const calls = hits(t, K.CALL);
  const pays = hits(t, K.PAY);
  const payChannels = hits(t, K.PAY_CHANNEL);
  const cnic = hits(t, K.CNIC);

  const asksSecret = asks.length > 0 && secrets.length > 0 && near(asks, secrets, ASK_WINDOW);
  const asksCnic = asks.length > 0 && cnic.length > 0 && near(asks, cnic, ASK_WINDOW);
  const unofficialMobiles = msg.mobiles.filter((m) => !isOfficialNumber(m));
  const thisNumber = hits(t, K.THIS_NUMBER);
  const callInstruction = calls.length > 0;
  const callThisNumber = callInstruction && (unofficialMobiles.length > 0 || thisNumber.length > 0);
  const payInstruction = pays.length > 0;
  const sendInstruction = asks.length > 0;

  // --- prize ---
  const prizeNouns = hits(t, K.PRIZE);
  const winVerbs = hits(t, K.WIN_VERBS);
  const prize = prizeNouns.length > 0 || (winVerbs.length > 0 && msg.amounts.length > 0);

  // --- links ---
  const links = msg.urls.map(assessLink);
  const unofficialLinks = links.filter((l) => !l.official);

  const mentionsBisp = bisp.length > 0;

  // H1 — BISP claim from anything other than 8171. Unknown sender cannot fire H1 (→ needs_sender).
  if (mentionsBisp && sender.kind !== 'unknown' && sender.value !== '8171') {
    hard.push(flag('H1', 'HARD', 'NOT_FROM_8171', [...uniqueKeywords(bisp), `sender:${sender.kind}`]));
  }

  // H2 — asks for OTP / PIN / code / password.
  if (asksSecret) {
    hard.push(flag('H2', 'HARD', 'ASKS_FOR_OTP_PIN', uniqueKeywords(secrets, asks)));
  }

  // H3 — prize + must call / pay / send to claim.
  if (prize && (callInstruction || payInstruction || sendInstruction)) {
    hard.push(
      flag('H3', 'HARD', 'PRIZE_REQUIRES_ACTION', uniqueKeywords(prizeNouns, winVerbs, calls, pays, asks)),
    );
  }

  // H4 — claims govt/telco/bank/courier but asks for payment via wallet / scratch card.
  // A wallet named only as the payment channel ("Easypaisa par bhejein") is not a claim.
  const claims = withoutOverlap([...bisp, ...govt, ...telco, ...bank, ...courier, ...echallan], payChannels);
  if (claims.length > 0 && payChannels.length > 0 && (payInstruction || sendInstruction)) {
    hard.push(flag('H4', 'HARD', 'PAY_VIA_WALLET_OR_CARD', uniqueKeywords(payChannels, pays, asks)));
  }

  // H5 — e-challan / courier message containing a link.
  if ((echallan.length > 0 || courier.length > 0) && links.length > 0) {
    hard.push(
      flag('H5', 'HARD', 'LINK_IN_CHALLAN_OR_COURIER', [...uniqueKeywords(echallan, courier), ...links.map((l) => l.host)]),
    );
  }

  // S1 — urgency / threat.
  const urgency = hits(t, K.URGENCY);
  if (urgency.length > 0) soft.push(flag('S1', 'SOFT', 'URGENCY_THREAT', uniqueKeywords(urgency)));

  // S2 — call-this-number instruction (official helplines in the text don't count).
  if (callThisNumber) {
    soft.push(flag('S2', 'SOFT', 'ASKS_TO_CALL', [...uniqueKeywords(calls, thisNumber), ...unofficialMobiles]));
  }

  // S3 — asks for CNIC / CNIC photo / biometric.
  if (asksCnic) soft.push(flag('S3', 'SOFT', 'ASKS_FOR_CNIC', uniqueKeywords(cnic, asks)));

  // S4 — any link that is not an official host; evidence says why.
  if (unofficialLinks.length > 0) {
    const ev = unofficialLinks.map(
      (l) => `${l.host}${l.shortener ? ' (shortener)' : l.lookalike ? ' (look-alike)' : ''}`,
    );
    soft.push(flag('S4', 'SOFT', 'SUSPICIOUS_LINK', ev));
  }

  // S5 — very large amount for government aid.
  const aid = mentionsBisp || hits(t, K.AID_CONTEXT).length > 0;
  const maxAmount = msg.amounts.length > 0 ? Math.max(...msg.amounts) : 0;
  if (aid && maxAmount >= LARGE_AID_AMOUNT) {
    soft.push(flag('S5', 'SOFT', 'LARGE_AID_AMOUNT', [`Rs ${maxAmount.toLocaleString('en-PK')}`]));
  }

  // S6 — "sent by mistake" or family emergency + money.
  const mistake = hits(t, K.MISTAKE);
  const emergency = hits(t, K.EMERGENCY);
  const money = hits(t, K.MONEY);
  const mentionsMoney = money.length > 0 || msg.amounts.length > 0;
  if ((mistake.length > 0 || emergency.length > 0) && mentionsMoney) {
    soft.push(flag('S6', 'SOFT', 'MISTAKE_OR_EMERGENCY_MONEY', uniqueKeywords(mistake, emergency, money)));
  }

  // P1 — High-confidence, fresh official sender with no asks, no links, no call-back.
  // Only for senders given explicitly (never parsed out of the message body).
  const hasAsk = asksSecret || asksCnic || callThisNumber || payInstruction || sendInstruction;
  const trusted = sender.source === 'provided' && sender.value ? findTrustedSender(sender.value, now) ?? null : null;
  if (trusted && hard.length === 0 && soft.length === 0 && links.length === 0 && !hasAsk) {
    positive.push(flag('P1', 'POSITIVE', 'OFFICIAL_SENDER_TEMPLATE', [`${trusted.entity} ${trusted.value}`]));
  }

  const claimedEntities = [
    ...(mentionsBisp ? ['BISP'] : []),
    ...uniqueKeywords(govt, telco, bank, courier).map((k) => k.toUpperCase()),
  ];

  return {
    hard,
    soft,
    positive,
    signals: {
      mentionsBisp,
      claimedEntities: [...new Set(claimedEntities)],
      links,
      trustedSender: trusted,
      prize,
      echallan: echallan.length > 0,
      courier: courier.length > 0,
      mistake: mistake.length > 0,
      emergency: emergency.length > 0,
      hasAsk,
    },
  };
}
