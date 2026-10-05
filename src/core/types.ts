/** Verdict scale from the project plan §5.3. There is deliberately no "SAFE" verdict. */
export const VERDICTS = ['LIKELY_SAFE', 'UNSURE', 'LIKELY_SCAM', 'SCAM_CONFIRMED'] as const;
export type Verdict = (typeof VERDICTS)[number];

export const VERDICT_RANK: Record<Verdict, number> = {
  LIKELY_SAFE: 0,
  UNSURE: 1,
  LIKELY_SCAM: 2,
  SCAM_CONFIRMED: 3,
};

export function maxVerdict(a: Verdict, b: Verdict): Verdict {
  return VERDICT_RANK[a] >= VERDICT_RANK[b] ? a : b;
}

/** Scam types from the output schema in plan §6.6. */
export const SCAM_TYPES = [
  'fake_bisp_welfare',
  'fake_prize_lottery',
  'wallet_bank_otp',
  'sim_block_pta',
  'fake_courier',
  'fake_echallan',
  'authority_threat',
  'family_emergency',
  'money_sent_by_mistake',
  'phishing_link',
  'job_investment',
  'other',
  'none',
] as const;
export type ScamType = (typeof SCAM_TYPES)[number];

/** Recommended actions from plan §6.5 / §6.6. */
export const ACTIONS = [
  'do_not_call',
  'do_not_pay',
  'do_not_click',
  'verify_helpline',
  'report_9000',
  'no_action_needed',
] as const;
export type RecommendedAction = (typeof ACTIONS)[number];

export interface Labels {
  ur: string;
  roman: string;
  en: string;
}

export type RuleId = 'H1' | 'H2' | 'H3' | 'H4' | 'H5' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'P1';
export type FlagType = 'HARD' | 'SOFT' | 'POSITIVE';

export interface Flag {
  id: RuleId;
  type: FlagType;
  code: string;
  label: Labels;
  /** Matched keywords / hosts / numbers that triggered the rule (never the full message). */
  evidence: string[];
}
