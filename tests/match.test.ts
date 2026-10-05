import { describe, expect, it } from 'vitest';
import { ASK_VERBS, PAY } from '../src/core/keywords.js';
import { findHits, fuzzyTokenEqual, near } from '../src/core/match.js';

describe('fuzzy matching (Roman Urdu)', () => {
  it('accepts spelling variants', () => {
    expect(fuzzyTokenEqual('inam', 'inaam')).toBe(true);
    expect(fuzzyTokenEqual('mubarik', 'mubarak')).toBe(true);
    expect(fuzzyTokenEqual('bhejen', 'bhejein')).toBe(true);
  });

  it('rejects short or differently-shaped words', () => {
    // short Roman words such as "dein" are listed for exact matching only
    expect(findHits(['do', 'din', 'mein'], ASK_VERBS)).toEqual([]);
    expect(fuzzyTokenEqual('been', 'bhejen')).toBe(false);
    // the everyday "karein" must not read as a payment instruction
    expect(findHits(['call', 'karein'], PAY)).toEqual([]);
    expect(fuzzyTokenEqual('imam', 'inaam')).toBe(false);
  });

  it('matches multi-token phrases and measures proximity', () => {
    const tokens = ['is', 'number', 'par', 'call', 'karein'];
    const a = findHits(tokens, { english: ['is number'] });
    const b = findHits(tokens, { english: ['call'] });
    expect(a).toHaveLength(1);
    expect(near(a, b, 1)).toBe(true);
    expect(near(a, b, 0)).toBe(false);
  });
});
