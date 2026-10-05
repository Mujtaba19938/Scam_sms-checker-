import { describe, expect, it } from 'vitest';
import { decide, scoreRules } from '../src/core/decision.js';
import { llmOutput, rulesFor } from './helpers.js';

describe('scoreRules (§6.2)', () => {
  it('H1/H2/H3 → SCAM_CONFIRMED; H4/H5 → LIKELY_SCAM', () => {
    expect(scoreRules(rulesFor('code batayein')).verdict).toBe('SCAM_CONFIRMED');
    expect(scoreRules(rulesFor('Your parcel is held: bit.ly/x')).verdict).toBe('LIKELY_SCAM');
  });
  it('2 soft → LIKELY_SCAM; 1 soft → defer (UNSURE); none → defer (UNSURE); P1 → LIKELY_SAFE', () => {
    expect(scoreRules(rulesFor('foran is number par call karein'))).toMatchObject({ verdict: 'LIKELY_SCAM', deferred: false });
    expect(scoreRules(rulesFor('foran aayein'))).toMatchObject({ verdict: 'UNSURE', deferred: true });
    expect(scoreRules(rulesFor('kal milte hain'))).toMatchObject({ verdict: 'UNSURE', deferred: true });
    expect(scoreRules(rulesFor('Aap ke CNIC par 3 SIMs registered hain.', '668'))).toMatchObject({ verdict: 'LIKELY_SAFE' });
  });
});

describe('decide — LLM can never override rules', () => {
  it('LLM "safe" cannot lower a hard-rule verdict', () => {
    const r = rulesFor('Apna OTP code bhejein');
    expect(decide(r, llmOutput({ verdict: 'LIKELY_SAFE' })).verdict).toBe('SCAM_CONFIRMED');
    expect(decide(r, llmOutput({ verdict: 'UNSURE' })).verdict).toBe('SCAM_CONFIRMED');
  });
  it('LLM cannot lower a 2-soft LIKELY_SCAM', () => {
    const r = rulesFor('foran is number par call karein');
    expect(decide(r, llmOutput({ verdict: 'LIKELY_SAFE' })).verdict).toBe('LIKELY_SCAM');
  });
  it('LLM may raise severity on hard flags', () => {
    const r = rulesFor('Your parcel is held: bit.ly/x');
    expect(decide(r, llmOutput({ verdict: 'SCAM_CONFIRMED', confidence: 0.9 })).verdict).toBe('SCAM_CONFIRMED');
  });
  it('deferred: LLM decides, but LIKELY_SAFE is blocked when a soft flag exists', () => {
    const r = rulesFor('foran aayein');
    expect(decide(r, llmOutput({ verdict: 'LIKELY_SAFE' })).verdict).toBe('UNSURE');
    expect(decide(r, llmOutput({ verdict: 'LIKELY_SCAM', confidence: 0.9 })).verdict).toBe('LIKELY_SCAM');
  });
  it('deferred: LLM scam verdicts need confidence ≥ 0.75 and cannot be SCAM_CONFIRMED without a hard rule', () => {
    const r = rulesFor('kal milte hain');
    expect(decide(r, llmOutput({ verdict: 'LIKELY_SCAM', confidence: 0.6 })).verdict).toBe('UNSURE');
    expect(decide(r, llmOutput({ verdict: 'SCAM_CONFIRMED', confidence: 0.95 })).verdict).toBe('LIKELY_SCAM');
    expect(decide(r, llmOutput({ verdict: 'LIKELY_SAFE' })).verdict).toBe('LIKELY_SAFE');
  });
  it('without an LLM the rule verdict stands', () => {
    expect(decide(rulesFor('kal milte hain'), null)).toMatchObject({ verdict: 'UNSURE', decidedBy: 'rules' });
  });
});
