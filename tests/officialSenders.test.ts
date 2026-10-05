import { describe, expect, it } from 'vitest';
import { findTrustedSender, helplineFor, isOfficialHost, OFFICIAL_ENTRIES } from '../src/core/officialSenders.js';
import { NOW } from './helpers.js';

describe('official sender list', () => {
  it('trusts only High-confidence SMS senders', () => {
    for (const code of ['8171', '668', '8008', '8558', '9915']) expect(findTrustedSender(code, NOW)).toBeDefined();
    for (const code of ['9000', '3627', '8400', '9966', '3737', '8591', '8899', '667', '1234']) {
      expect(findTrustedSender(code, NOW)).toBeUndefined();
    }
  });
  it('9915 belongs to Punjab Safe Cities, not PTA (plan §3.2)', () => {
    expect(findTrustedSender('9915', NOW)?.entity).toMatch(/PSCA/);
  });
  it('matches official hosts exactly or as subdomains only', () => {
    expect(isOfficialHost('8171.bisp.gov.pk')).toBe(true);
    expect(isOfficialHost('www.pakpost.gov.pk')).toBe(true);
    expect(isOfficialHost('pakpost.gov.pk.evil.xyz')).toBe(false);
    expect(isOfficialHost('epgovpk.men')).toBe(false);
  });
  it('helplines come only from the list', () => {
    expect(helplineFor('BISP')).toBe('0800-26477');
    expect(helplineFor('Some Bank')).toBeNull();
  });
  it('every entry has a source and a valid verified_on date', () => {
    for (const e of OFFICIAL_ENTRIES) {
      expect(e.source.length).toBeGreaterThan(0);
      expect(Number.isFinite(Date.parse(e.verified_on))).toBe(true);
    }
  });
});
