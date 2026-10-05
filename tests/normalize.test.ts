import { describe, expect, it } from 'vitest';
import { extractAmounts, extractMobiles, extractUrls, normalizeMessage, normalizeText, tokenize } from '../src/core/normalize.js';

describe('normalizeText', () => {
  it('maps Arabic code points to Urdu', () => {
    expect(normalizeText('كوڈ')).toBe('کوڈ'); // ك → ک
    expect(normalizeText('ي')).toBe('ی'); // ي → ی
    expect(normalizeText('ه')).toBe('ہ'); // ه → ہ
  });

  it('strips zero-width characters and diacritics', () => {
    expect(normalizeText('O​T​P')).toBe('otp');
    expect(normalizeText('اِنعام')).toBe('انعام');
  });

  it('folds Cyrillic look-alikes and Urdu digits', () => {
    expect(normalizeText('ОТР')).toBe('otp');
    expect(normalizeText('۸۱۷۱')).toBe('8171');
  });
});

describe('tokenize', () => {
  it('re-joins spaced-out single letters and splits letter/digit runs', () => {
    expect(tokenize(normalizeText('Apna O.T.P share karein'))).toEqual(['apna', 'otp', 'share', 'karein']);
    expect(tokenize('24ghante otp1234')).toEqual(['24', 'ghante', 'otp', '1234']);
  });
});

describe('extractAmounts', () => {
  it('parses South-Asian grouping and multipliers', () => {
    expect(extractAmounts(normalizeText('Rs 25,00,000 ka inaam'))).toEqual([2_500_000]);
    expect(extractAmounts(normalizeText('25 lakh mubarak'))).toEqual([2_500_000]);
    expect(extractAmounts(normalizeText('Rs.25000'))).toEqual([25_000]);
    expect(extractAmounts(normalizeText('25 ہزار روپے'))).toEqual([25_000]);
  });

  it('ignores bare numbers such as phone numbers and codes', () => {
    expect(extractAmounts(normalizeText('call 03001234567, code 4821'))).toEqual([]);
  });
});

describe('extractUrls / extractMobiles', () => {
  it('finds bare and scheme URLs', () => {
    const hosts = extractUrls(normalizeText('Update: bit.ly/3xY and https://www.jazzcash-verify.xyz/a')).map((u) => u.host);
    expect(hosts.sort()).toEqual(['bit.ly', 'jazzcash-verify.xyz']);
  });

  it('does not treat sentence punctuation as a domain', () => {
    expect(extractUrls(normalizeText('Mubarak ho.Wasool karein. Rs.500 bhejein'))).toEqual([]);
  });

  it('canonicalises mobiles including masked ones', () => {
    expect(extractMobiles(normalizeText('Call +92 300 1234567 or 0341-XXXXXXX'))).toEqual(['03001234567', '0341xxxxxxx']);
  });

  it('extracts an embedded sender prefix', () => {
    expect(normalizeMessage('0341-XXXXXXX: Mubarak ho').embeddedSender).toBe('0341-xxxxxxx');
  });
});
