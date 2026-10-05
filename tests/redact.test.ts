import { describe, expect, it } from 'vitest';
import { redact } from '../src/core/redact.js';

describe('redact', () => {
  it('masks CNIC, IBAN, OTP codes and account numbers but keeps phone numbers', () => {
    const out = redact(
      'CNIC 42101-1234567-1, IBAN PK36SCBL0000001123456702, OTP is 482913, card 4111 1111 1111 1111, call 03001234567',
    );
    expect(out).toContain('[CNIC]');
    expect(out).toContain('[IBAN]');
    expect(out).toContain('OTP is [CODE]');
    expect(out).toContain('[ACCOUNT]');
    expect(out).toContain('03001234567');
    expect(out).not.toMatch(/42101|482913|4111/);
  });
});
