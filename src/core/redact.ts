/**
 * Redaction before any LLM call or report text (plan §8.2).
 * Masks CNIC numbers, IBANs, long account/card numbers and OTP-like codes.
 * The scammer's phone number is kept (needed for reporting to PTA 9000).
 */
export function redact(text: string): string {
  return text
    .replace(/(?<!\d)\d{5}[\s-]?\d{7}[\s-]?\d(?!\d)/g, '[CNIC]')
    .replace(/\bPK\d{2}\s?[A-Z]{4}(?:\s?\d){16}\b/gi, '[IBAN]')
    .replace(
      /(otp|code|pin|password|passcode|کوڈ|پن)([^\d\n]{0,15}?)(\d{4,8})(?!\d)/giu,
      (_m, k: string, mid: string) => `${k}${mid}[CODE]`,
    )
    // 13–19 contiguous digits, or a card number in 4-digit groups; phone numbers are left alone.
    .replace(/(?<![\d+])(?:\d{13,19}|\d{4}(?:[\s-]\d{4}){3})(?!\d)/g, '[ACCOUNT]');
}
