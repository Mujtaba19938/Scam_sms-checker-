/**
 * Official sender list, v1 seed — transcribed ONLY from the project plan §3.1
 * ("Official Sources & Verified Sender List"). Do not add entries that are not
 * backed by an official or reputable source; new tips go to a review queue (§3.3).
 *
 * Rule (§3.3): an entry may only produce a "matches official sender" signal if
 * confidence is High AND verified_on is under 6 months old. Nothing auto-promotes.
 *
 * Bank alphanumeric sender masks are deliberately absent (§3.1: "Not verified — do not hard-code").
 */

export type Confidence = 'High' | 'Medium' | 'Uncertain' | 'Unverified';

export type EntryKind =
  /** An SMS sender the entity legitimately sends FROM. Only these can produce the P1 signal. */
  | 'sms_sender'
  /** A number people call or message for help (inbound). */
  | 'helpline'
  /** A shortcode users send TO (reporting, DNCR, lookups) — not a sender. */
  | 'service_code'
  /** Official website / portal host. */
  | 'domain';

export interface OfficialEntry {
  entity: string;
  kind: EntryKind;
  value: string;
  purpose: string;
  never_does: string[];
  confidence: Confidence;
  /** ISO date the entry was last verified. */
  verified_on: string;
  source: string;
}

/** The plan's research date (October 2026). Re-verify monthly (§3.3). */
const PLAN_VERIFIED_ON = '2026-10-01';

const BISP_NEVER = [
  'promise money without verification',
  'ask you to call a mobile number',
  'ask for a fee',
  'send a link to click',
  'threaten removal from the programme',
];
const NEVER_ASK_SECRETS = ['ask for PIN, OTP, password or CNIC photo via SMS/WhatsApp/call'];

export const OFFICIAL_ENTRIES: readonly OfficialEntry[] = [
  {
    entity: 'BISP', kind: 'sms_sender', value: '8171',
    purpose: 'All official BISP messages; beneficiaries can SMS their CNIC to 8171 to check status',
    never_does: BISP_NEVER, confidence: 'High', verified_on: PLAN_VERIFIED_ON,
    source: 'BISP spokesperson via Radio Pakistan (2024): "all BISP messages are sent from 8171 only"',
  },
  {
    entity: 'BISP', kind: 'domain', value: '8171.bisp.gov.pk',
    purpose: 'BISP 8171 web portal', never_does: BISP_NEVER, confidence: 'High', verified_on: PLAN_VERIFIED_ON,
    source: 'Plan §3.1 (BISP row)',
  },
  {
    entity: 'BISP', kind: 'helpline', value: '0800-26477',
    purpose: 'Call to verify (inbound only)', never_does: BISP_NEVER, confidence: 'High', verified_on: PLAN_VERIFIED_ON,
    source: 'Radio Pakistan; PTA awareness campaign',
  },
  {
    entity: 'PTA', kind: 'service_code', value: '9000',
    purpose: 'Where users send spam/fraud reports ("spammer number, space, message")',
    never_does: NEVER_ASK_SECRETS, confidence: 'High', verified_on: PLAN_VERIFIED_ON,
    source: 'PTA SMS alert (TechJuice); Geo; Business Recorder',
  },
  {
    entity: 'PTA', kind: 'service_code', value: '3627',
    purpose: 'Do Not Call Register ("REG" to join)', never_does: NEVER_ASK_SECRETS, confidence: 'High',
    verified_on: PLAN_VERIFIED_ON, source: 'Geo; ProPakistani',
  },
  {
    entity: 'PTA', kind: 'sms_sender', value: '668',
    purpose: 'SIM-count reply after you SMS your CNIC (also cnic.sims.pk)', never_does: NEVER_ASK_SECRETS,
    confidence: 'High', verified_on: PLAN_VERIFIED_ON, source: 'PTA FAQ',
  },
  {
    entity: 'PTA', kind: 'domain', value: 'cnic.sims.pk',
    purpose: 'SIM count lookup', never_does: NEVER_ASK_SECRETS, confidence: 'High', verified_on: PLAN_VERIFIED_ON,
    source: 'PTA FAQ',
  },
  {
    entity: 'PTA', kind: 'helpline', value: '0800-55055',
    purpose: 'Complaint channel (not an SMS sender)', never_does: NEVER_ASK_SECRETS, confidence: 'High',
    verified_on: PLAN_VERIFIED_ON, source: 'PTA advisories',
  },
  {
    entity: 'PTA', kind: 'domain', value: 'complaint.pta.gov.pk',
    purpose: 'Complaint portal', never_does: NEVER_ASK_SECRETS, confidence: 'High', verified_on: PLAN_VERIFIED_ON,
    source: 'PTA advisories',
  },
  {
    entity: 'PTA / operators', kind: 'service_code', value: '420',
    purpose: 'Block a number', never_does: [], confidence: 'Medium', verified_on: PLAN_VERIFIED_ON,
    source: 'Business Recorder (single mention)',
  },
  {
    entity: 'MNP', kind: 'service_code', value: '667',
    purpose: 'MNP / SIM status query', never_does: [], confidence: 'Uncertain', verified_on: PLAN_VERIFIED_ON,
    source: 'TechJuice only; no official page found',
  },
  {
    entity: 'NADRA', kind: 'sms_sender', value: '8008',
    purpose: 'Family-tree / CNIC re-verification SMS', never_does: NEVER_ASK_SECRETS, confidence: 'High',
    verified_on: PLAN_VERIFIED_ON, source: 'Express Tribune (2016 data, marked High in plan)',
  },
  {
    entity: 'NADRA', kind: 'sms_sender', value: '8400',
    purpose: 'CNIC/NICOP application tracking', never_does: NEVER_ASK_SECRETS, confidence: 'Medium',
    verified_on: PLAN_VERIFIED_ON, source: 'Secondary guides',
  },
  {
    entity: 'FBR', kind: 'sms_sender', value: '9966',
    purpose: 'Active Taxpayer List check ("ATL <CNIC>")', never_does: NEVER_ASK_SECRETS,
    // Plan lists "Medium–High" and §13 says treat as Medium until confirmed.
    confidence: 'Medium', verified_on: PLAN_VERIFIED_ON, source: 'Secondary/consumer sources; not fetched from fbr.gov.pk',
  },
  {
    entity: 'JazzCash', kind: 'sms_sender', value: '8558',
    purpose: 'Transaction confirmation SMS', never_does: NEVER_ASK_SECRETS, confidence: 'High',
    verified_on: PLAN_VERIFIED_ON, source: 'JazzCash official: "you will receive a confirmation SMS from 8558"',
  },
  {
    entity: 'JazzCash', kind: 'helpline', value: '4444',
    purpose: 'Customer helpline', never_does: NEVER_ASK_SECRETS, confidence: 'High', verified_on: PLAN_VERIFIED_ON,
    source: 'JazzCash contact page',
  },
  {
    entity: 'JazzCash', kind: 'helpline', value: '111-124-444',
    purpose: 'Customer helpline', never_does: NEVER_ASK_SECRETS, confidence: 'High', verified_on: PLAN_VERIFIED_ON,
    source: 'JazzCash contact page',
  },
  {
    entity: 'JazzCash', kind: 'helpline', value: '0325-4444786',
    purpose: 'Customer helpline (WhatsApp)', never_does: NEVER_ASK_SECRETS, confidence: 'High',
    verified_on: PLAN_VERIFIED_ON, source: 'JazzCash contact page',
  },
  {
    entity: 'Easypaisa', kind: 'helpline', value: '3737',
    purpose: 'Helpline (Telenor)', never_does: NEVER_ASK_SECRETS, confidence: 'High', verified_on: PLAN_VERIFIED_ON,
    source: 'Easypaisa FAQ & awareness page',
  },
  {
    entity: 'Easypaisa', kind: 'sms_sender', value: '3737',
    purpose: 'Reported as transaction-SMS sender', never_does: NEVER_ASK_SECRETS, confidence: 'Medium',
    verified_on: PLAN_VERIFIED_ON, source: 'Easypaisa FAQ (sender use is Medium per plan)',
  },
  {
    entity: 'Easypaisa', kind: 'helpline', value: '042-111-003-737',
    purpose: 'Helpline', never_does: NEVER_ASK_SECRETS, confidence: 'High', verified_on: PLAN_VERIFIED_ON,
    source: 'Easypaisa FAQ',
  },
  {
    entity: 'Punjab Safe Cities (PSCA)', kind: 'sms_sender', value: '9915',
    purpose: 'Official Punjab e-challan SMS (replaced 8070)', never_does: ['include links', 'request payment by SMS'],
    confidence: 'High', verified_on: PLAN_VERIFIED_ON, source: 'The Nation (Jan 2026); APP; Dawn',
  },
  {
    entity: 'TCS', kind: 'sms_sender', value: '8591',
    purpose: 'Official TCS channel', never_does: ['ask for payment or address change via SMS link'],
    confidence: 'Medium', verified_on: PLAN_VERIFIED_ON, source: 'TCS Pakistan official account (Dec 2025)',
  },
  {
    entity: 'TCS', kind: 'helpline', value: '021-111-123-456',
    purpose: 'Official TCS channel', never_does: [], confidence: 'Medium', verified_on: PLAN_VERIFIED_ON,
    source: 'TCS Pakistan official account',
  },
  {
    entity: 'TCS', kind: 'helpline', value: '021-332-63458',
    purpose: 'Official TCS channel (WhatsApp)', never_does: [], confidence: 'Medium', verified_on: PLAN_VERIFIED_ON,
    source: 'TCS Pakistan official account',
  },
  {
    entity: 'Pakistan Post', kind: 'domain', value: 'ep.gov.pk',
    purpose: 'Official site', never_does: ['ask for any online payment'], confidence: 'High',
    verified_on: PLAN_VERIFIED_ON, source: 'Pakistan Post fraud notice PDF',
  },
  {
    entity: 'Pakistan Post', kind: 'domain', value: 'pakpost.gov.pk',
    purpose: 'Official site', never_does: ['ask for any online payment'], confidence: 'High',
    verified_on: PLAN_VERIFIED_ON, source: 'Pakistan Post fraud notice PDF',
  },
  {
    entity: 'Pakistan Post', kind: 'sms_sender', value: '8899',
    purpose: 'Shortcode (unverified)', never_does: [], confidence: 'Unverified', verified_on: PLAN_VERIFIED_ON,
    source: 'Plan §3.1: shortcode 8899 unverified',
  },
  {
    entity: 'NCCIA', kind: 'domain', value: 'complaint.nccia.gov.pk',
    purpose: 'Complaint portal', never_does: [], confidence: 'High', verified_on: PLAN_VERIFIED_ON,
    source: 'PTA advisory; legal site',
  },
  {
    entity: 'NCCIA', kind: 'helpline', value: '1799',
    purpose: 'Complaint helpline', never_does: [], confidence: 'Medium', verified_on: PLAN_VERIFIED_ON,
    source: 'PTA advisory; legal site',
  },
  {
    entity: 'SBP', kind: 'domain', value: 'sunwai.sbp.org.pk',
    purpose: 'Banking complaint portal (no shortcode)', never_does: [], confidence: 'High',
    verified_on: PLAN_VERIFIED_ON, source: 'PTA "Protect Yourself" page; SBP',
  },
];

const SIX_MONTHS_MS = 183 * 24 * 60 * 60 * 1000;

export function digitsOnly(value: string): string {
  return value.replace(/[^\dx]/gi, '').toLowerCase();
}

function isFresh(entry: OfficialEntry, now: Date): boolean {
  const verified = Date.parse(entry.verified_on);
  return Number.isFinite(verified) && now.getTime() - verified < SIX_MONTHS_MS && verified <= now.getTime();
}

/** High-confidence, recently verified SMS sender for this shortcode (P1 eligibility, §3.3). */
export function findTrustedSender(sender: string, now: Date): OfficialEntry | undefined {
  const d = digitsOnly(sender);
  return OFFICIAL_ENTRIES.find(
    (e) => e.kind === 'sms_sender' && digitsOnly(e.value) === d && e.confidence === 'High' && isFresh(e, now),
  );
}

/** Any number on the official list (helplines included), regardless of confidence. Used to avoid
 *  treating an official helpline in the text as a "call this number" red flag. */
export function isOfficialNumber(number: string): boolean {
  const d = digitsOnly(number);
  return OFFICIAL_ENTRIES.some((e) => e.kind !== 'domain' && digitsOnly(e.value) === d);
}

/** True when host is (a subdomain of) a High-confidence official domain from the list. */
export function isOfficialHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, '');
  return OFFICIAL_ENTRIES.some(
    (e) => e.kind === 'domain' && e.confidence === 'High' && (h === e.value || h.endsWith(`.${e.value}`)),
  );
}

/** Official helpline to suggest for an impersonated entity, if the plan lists a High-confidence one. */
export function helplineFor(entity: string | null): string | null {
  if (!entity) return null;
  const e = OFFICIAL_ENTRIES.find(
    (x) => x.kind === 'helpline' && x.confidence === 'High' && x.entity.toLowerCase() === entity.toLowerCase(),
  );
  return e?.value ?? null;
}
