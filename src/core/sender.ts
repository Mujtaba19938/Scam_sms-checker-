import { digitsOnly } from './officialSenders.js';

export type SenderKind = 'shortcode' | 'mobile' | 'alphanumeric' | 'other' | 'unknown';

export interface SenderInfo {
  kind: SenderKind;
  /** Canonical value: digits for numbers (03xxxxxxxxx for mobiles), lowercase text for masks. */
  value: string | null;
  /**
   * provided — given explicitly by the user / channel;
   * embedded — parsed from the start of pasted text ("0341-XXXXXXX: …");
   * none — unknown.
   * Embedded senders are written by whoever wrote the message, so they are never trusted
   * as "official" (no P1); they are only used as negative evidence (H1).
   */
  source: 'provided' | 'embedded' | 'none';
}

const UNKNOWN: SenderInfo = { kind: 'unknown', value: null, source: 'none' };

export function classifySenderValue(raw: string): Omit<SenderInfo, 'source'> {
  const s = raw.trim().toLowerCase();
  if (!s || s === 'unknown' || s === 'pata nahi') return { kind: 'unknown', value: null };
  const compact = s.replace(/[\s()-]/g, '');
  const mobile = /^(?:\+?92|0092|0)?(3\d{2}[\dx]{7})$/.exec(compact);
  if (mobile) return { kind: 'mobile', value: `0${mobile[1]}` };
  if (/^\d{3,6}$/.test(compact)) return { kind: 'shortcode', value: compact };
  if (/[a-z]/.test(compact) && !/^\+?\d/.test(compact)) return { kind: 'alphanumeric', value: compact };
  return { kind: 'other', value: digitsOnly(compact) || compact };
}

export function resolveSender(provided: string | undefined, embedded: string | undefined): SenderInfo {
  if (provided !== undefined) {
    const c = classifySenderValue(provided);
    if (c.kind !== 'unknown') return { ...c, source: 'provided' };
  }
  if (embedded !== undefined) {
    const c = classifySenderValue(embedded);
    // A body that starts with "8171:" proves nothing — treat as unknown rather than as BISP.
    if (c.kind === 'unknown' || c.value === '8171') return UNKNOWN;
    return { ...c, source: 'embedded' };
  }
  return UNKNOWN;
}
