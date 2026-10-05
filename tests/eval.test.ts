/**
 * Regression eval over the labelled fixture set (plan §10.3), rules-only.
 * Blocks any change that produces a "dangerous miss" (scam → LIKELY_SAFE).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkMessage } from '../src/check.js';
import { NOW } from './helpers.js';

interface Sample { id: string; text: string; sender?: string }
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/messages.json', import.meta.url), 'utf8')) as {
  scam: Sample[];
  legit: Sample[];
};

const scamSide = (v: string) => v === 'SCAM_CONFIRMED' || v === 'LIKELY_SCAM';

describe('fixture eval (rules-only)', async () => {
  const scam = await Promise.all(fixtures.scam.map(async (s) => ({ s, r: await checkMessage(s, { llm: null, now: NOW }) })));
  const legit = await Promise.all(fixtures.legit.map(async (s) => ({ s, r: await checkMessage(s, { llm: null, now: NOW }) })));

  it('has zero dangerous misses (scam → LIKELY_SAFE)', () => {
    const misses = scam.filter(({ r }) => r.verdict === 'LIKELY_SAFE').map(({ s }) => s.id);
    expect(misses).toEqual([]);
  });

  it('meets the rules-alone recall target (≥ 80% of the scam set, plan week 3)', () => {
    const caught = scam.filter(({ r }) => scamSide(r.verdict)).length;
    expect(caught / scam.length).toBeGreaterThanOrEqual(0.8);
  });

  it('keeps false positives on legit messages ≤ 5%', () => {
    const fps = legit.filter(({ r }) => scamSide(r.verdict)).map(({ s }) => s.id);
    expect(fps.length / legit.length).toBeLessThanOrEqual(0.05);
  });

  it('never gives LIKELY_SAFE without a verified official sender', () => {
    const unsafe = [...scam, ...legit].filter(({ r }) => r.verdict === 'LIKELY_SAFE' && r.rule_flags.positive.length === 0);
    expect(unsafe).toEqual([]);
  });
});
