/**
 * Keyword matching over token arrays.
 *
 * - English and Urdu-script keywords match exactly (after normalization).
 * - Roman Urdu keywords also match fuzzily, because spellings vary ("inaam / inam / enaam").
 *   Plan §6.3 suggests Levenshtein ≤ 2; to keep short words from colliding we scale it:
 *   ≤3 chars exact, 4–5 chars ≤1, ≥6 chars ≤2; the first letter must match and lengths may differ by ≤1.
 *   Spelling variants with a different first letter are listed explicitly.
 */

import { normalizeText, tokenize } from './normalize.js';

export interface KeywordSet {
  english?: readonly string[];
  roman?: readonly string[];
  urdu?: readonly string[];
}

export interface Hit {
  /** Index of first token of the match. */
  index: number;
  /** Number of tokens covered. */
  length: number;
  keyword: string;
  /** The message tokens that matched. */
  text: string;
}

interface CompiledKeyword {
  keyword: string;
  tokens: string[];
  fuzzy: boolean;
}

const compiled = new WeakMap<KeywordSet, CompiledKeyword[]>();

/** Keywords go through the same normalization + tokenization as messages. */
function splitKeyword(k: string): string[] {
  return tokenize(normalizeText(k));
}

function compile(set: KeywordSet): CompiledKeyword[] {
  let c = compiled.get(set);
  if (c) return c;
  c = [];
  for (const k of set.english ?? []) c.push({ keyword: k, tokens: splitKeyword(k), fuzzy: false });
  for (const k of set.urdu ?? []) c.push({ keyword: k, tokens: splitKeyword(k), fuzzy: false });
  for (const k of set.roman ?? []) c.push({ keyword: k, tokens: splitKeyword(k), fuzzy: true });
  compiled.set(set, c);
  return c;
}

export function levenshtein(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length]!;
}

export function fuzzyTokenEqual(token: string, keyword: string): boolean {
  if (token === keyword) return true;
  if (/\d/.test(keyword) || /\d/.test(token)) return false;
  const len = keyword.length;
  const max = len <= 3 ? 0 : len <= 5 ? 1 : 2;
  // Same first letter and at most one character longer/shorter ("been" must not match "bhejen").
  if (max === 0 || token[0] !== keyword[0] || Math.abs(token.length - len) > 1) return false;
  return levenshtein(token, keyword, max) <= max;
}

export function findHits(tokens: readonly string[], set: KeywordSet): Hit[] {
  const hits: Hit[] = [];
  for (const kw of compile(set)) {
    const n = kw.tokens.length;
    if (n === 0) continue;
    for (let i = 0; i + n <= tokens.length; i++) {
      let ok = true;
      for (let j = 0; j < n; j++) {
        const t = tokens[i + j]!;
        const k = kw.tokens[j]!;
        if (!(kw.fuzzy ? fuzzyTokenEqual(t, k) : t === k)) {
          ok = false;
          break;
        }
      }
      if (ok) hits.push({ index: i, length: n, keyword: kw.keyword, text: tokens.slice(i, i + n).join(' ') });
    }
  }
  return hits;
}

/** True when some hit in `a` and some hit in `b` are within `window` tokens of each other. */
export function near(a: readonly Hit[], b: readonly Hit[], window: number): boolean {
  for (const x of a) {
    for (const y of b) {
      const gap = x.index <= y.index ? y.index - (x.index + x.length) : x.index - (y.index + y.length);
      if (gap <= window) return true;
    }
  }
  return false;
}

/** Distinct matched texts, for flag evidence. */
export function uniqueKeywords(...groups: readonly Hit[][]): string[] {
  return [...new Set(groups.flat().map((h) => h.text))];
}

/** Hits in `a` that do not overlap any hit in `b`. */
export function withoutOverlap(a: readonly Hit[], b: readonly Hit[]): Hit[] {
  return a.filter((x) => !b.some((y) => x.index < y.index + y.length && y.index < x.index + x.length));
}
