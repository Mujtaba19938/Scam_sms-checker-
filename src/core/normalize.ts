/**
 * Text normalization (plan §6.1 "Normalize" step).
 *
 * - Unicode NFKC (folds Arabic presentation forms, full-width letters)
 * - strips zero-width / bidi control characters
 * - lowercases (Roman Urdu / English)
 * - maps Arabic code points to their Urdu equivalents (ي/ى→ی, ك→ک, ه→ہ)
 * - folds common Cyrillic/Greek look-alike letters used to dodge keyword filters
 * - strips Arabic diacritics, converts Arabic-Indic / Urdu digits to ASCII
 * - extracts URLs, Pakistani mobile numbers and money amounts ("25,00,000", "25 lakh")
 */

const ZERO_WIDTH = /[­͏؜᠎​-‏‪-‮⁠-⁤﻿]/g;
const DIACRITICS = /[ً-ٰٟۖ-ۭ]/g;

const CHAR_MAP: Record<string, string> = {
  // Arabic → Urdu
  'ي': 'ی', // ي → ی
  'ى': 'ی', // ى → ی
  'ك': 'ک', // ك → ک
  'ه': 'ہ', // ه → ہ
  // Cyrillic look-alikes (after lowercasing)
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'х': 'x', 'у': 'y', 'і': 'i', 'ј': 'j', 'ѕ': 's', 'к': 'k',
  'т': 't', 'м': 'm', 'һ': 'h', 'ԁ': 'd', 'ӏ': 'l',
  // Greek look-alikes
  'ο': 'o', 'α': 'a', 'ρ': 'p', 'ι': 'i', 'κ': 'k', 'τ': 't',
};
const CHAR_MAP_RE = new RegExp(`[${Object.keys(CHAR_MAP).join('')}]`, 'g');

export function normalizeText(input: string): string {
  let s = input.normalize('NFKC');
  s = s.replace(ZERO_WIDTH, '');
  s = s.toLowerCase();
  s = s.replace(CHAR_MAP_RE, (c) => CHAR_MAP[c] ?? c);
  s = s.replace(DIACRITICS, '');
  // Arabic-Indic (U+0660–0669) and Extended/Urdu (U+06F0–06F9) digits → ASCII
  s = s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  s = s.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/**
 * Split normalized text into word tokens. Latin letters and digits glued together
 * ("otp1234", "24ghante") are separated, and runs of single Latin letters
 * ("o t p", "p.i.n") are re-joined so spaced-out keywords are still found.
 */
export function tokenize(normalized: string): string[] {
  const spaced = normalized
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-z])/g, '$1 $2');
  const raw = spaced.split(/[^\p{L}\p{M}\p{N}]+/u).filter((t) => t.length > 0);
  const out: string[] = [];
  let run: string[] = [];
  const flush = () => {
    if (run.length >= 2) out.push(run.join(''));
    else out.push(...run);
    run = [];
  };
  for (const t of raw) {
    if (/^[a-z]$/.test(t)) {
      run.push(t);
    } else {
      flush();
      out.push(t);
    }
  }
  flush();
  return out;
}

export interface UrlInfo {
  raw: string;
  host: string;
}

const TLDS = [
  'com', 'pk', 'ly', 'xyz', 'net', 'org', 'info', 'top', 'online', 'site', 'me', 'men', 'co', 'in', 'link',
  'click', 'app', 'io', 'cc', 'gl', 'at', 'id', 'live', 'shop', 'store', 'tk', 'ml', 'ga', 'cf', 'gq', 'biz',
  'club', 'win', 'vip', 'icu', 'buzz', 'cn', 'ru', 'us', 'uk', 'pw', 'work', 'support', 'help', 'claim', 'gift',
];
const BARE_URL_RE = new RegExp(
  `(?<![\\p{L}\\p{N}@.-])((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:${TLDS.join('|')}))(?::\\d+)?(?:/[^\\s]*)?(?![\\p{L}\\p{N}-])`,
  'gu',
);
const SCHEME_URL_RE = /https?:\/\/([^\s/?#:]+)[^\s]*/g;

export function extractUrls(normalized: string): UrlInfo[] {
  const found = new Map<string, UrlInfo>();
  const add = (raw: string, host: string) => {
    const h = host.replace(/^www\./, '').replace(/\.$/, '');
    if (!found.has(h)) found.set(h, { raw, host: h });
  };
  let withoutScheme = normalized;
  for (const m of normalized.matchAll(SCHEME_URL_RE)) {
    add(m[0], m[1]!);
    withoutScheme = withoutScheme.replace(m[0], ' ');
  }
  for (const m of withoutScheme.matchAll(BARE_URL_RE)) {
    add(m[0], m[1]!);
  }
  return [...found.values()];
}

const MOBILE_RE = /(?<![\dx])(?:\+?92[\s-]?|0)(3\d{2})[\s-]?([\dx]{7})(?![\dx])/g;

/** Pakistani mobile numbers (03xx-xxxxxxx, +92 3xx…), canonicalised to 03xxxxxxxxx. Masked digits (x) are kept. */
export function extractMobiles(normalized: string): string[] {
  const out = new Set<string>();
  for (const m of normalized.matchAll(MOBILE_RE)) out.add(`0${m[1]}${m[2]}`);
  return [...out];
}

const MULTIPLIERS: Record<string, number> = {
  lakh: 100_000, lakhs: 100_000, lac: 100_000, lacs: 100_000, laakh: 100_000, 'لاکھ': 100_000,
  crore: 10_000_000, crores: 10_000_000, karor: 10_000_000, 'کروڑ': 10_000_000,
  hazar: 1_000, hazaar: 1_000, 'ہزار': 1_000, k: 1_000,
};
const AMOUNT_RE =
  /(?<![\p{L}\p{N}])(?:(rs\.?|pkr|rupees?|rupay|rupaye)\s*)?(\d{1,3}(?:,\d{2,3})+|\d+(?:\.\d+)?)(?:\s*(lakhs?|lacs?|laakh|لاکھ|crores?|karor|کروڑ|hazaa?r|ہزار|k))?(?:\s*(rupees?|rupay|rupaye|روپے|pkr))?(?![\p{L}\p{N}])/gu;

/**
 * Money amounts in rupees. A bare number only counts when it has a currency marker,
 * a multiplier (lakh/crore/hazar) or South-Asian comma grouping, so phone numbers
 * and codes are not mistaken for amounts.
 */
export function extractAmounts(normalized: string): number[] {
  const out: number[] = [];
  for (const m of normalized.matchAll(AMOUNT_RE)) {
    const [, pre, num, mult, post] = m;
    const hasComma = num!.includes(',');
    if (!pre && !mult && !post && !hasComma) continue;
    const base = Number(num!.replace(/,/g, ''));
    if (!Number.isFinite(base)) continue;
    out.push(base * (mult ? (MULTIPLIERS[mult] ?? 1) : 1));
  }
  return out;
}

export interface NormalizedMessage {
  /** Normalized text (lowercase, Urdu-normalized). Never persisted. */
  text: string;
  tokens: string[];
  urls: UrlInfo[];
  mobiles: string[];
  amounts: number[];
  /** Sender found at the start of pasted text, e.g. "0341-XXXXXXX: …". */
  embeddedSender?: string;
}

const EMBEDDED_SENDER_RE = /^\s*((?:\+?92[\s-]?|0)3\d{2}[\s-]?[\dx]{7}|\d{3,5})\s*[:：]/;

export function normalizeMessage(raw: string): NormalizedMessage {
  const text = normalizeText(raw);
  const embedded = EMBEDDED_SENDER_RE.exec(text)?.[1];
  return {
    text,
    tokens: tokenize(text),
    urls: extractUrls(text),
    mobiles: extractMobiles(text),
    amounts: extractAmounts(text),
    ...(embedded ? { embeddedSender: embedded } : {}),
  };
}
