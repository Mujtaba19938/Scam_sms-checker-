import { describe, expect, it } from 'vitest';
import { ids, NOW, rulesFor } from './helpers.js';

const CONCEPT =
  'Mubarak ho! BISP ki taraf se aap ne Rs 25,00,000 ka inaam jeeta hai. Wasool karne ke liye is number par call karein.';

describe('H1 — BISP not from 8171', () => {
  it('fires for a 03xx mobile sender', () => {
    expect(ids(rulesFor(CONCEPT, '0341-XXXXXXX'))).toContain('H1');
  });
  it('fires for an alphanumeric or other shortcode sender', () => {
    expect(ids(rulesFor('BISP: aap ki qist', 'BISP-GOV'))).toContain('H1');
    expect(ids(rulesFor('BISP: aap ki qist', '8172'))).toContain('H1');
  });
  it('does not fire for 8171 or an unknown sender', () => {
    expect(ids(rulesFor('BISP: aap ki qist', '8171'))).not.toContain('H1');
    expect(ids(rulesFor('BISP: aap ki qist'))).not.toContain('H1');
  });
  it('uses an embedded mobile sender but never an embedded 8171', () => {
    expect(ids(rulesFor('0341-1234567: BISP ki taraf se paigham'))).toContain('H1');
    const r = rulesFor('8171: BISP ki taraf se paigham');
    expect(ids(r)).not.toContain('H1');
    expect(ids(r)).not.toContain('P1');
  });
});

describe('H2 — asks for OTP/PIN', () => {
  it('fires on Roman Urdu, English and Urdu script', () => {
    expect(ids(rulesFor('verify karne ke liye code batayein'))).toContain('H2');
    expect(ids(rulesFor('Please share the OTP you received'))).toContain('H2');
    expect(ids(rulesFor('اپنا کوڈ بتائیں'))).toContain('H2');
  });
  it('does not fire on genuine safety warnings', () => {
    expect(ids(rulesFor('Aap ka OTP 482913 hai. Yeh code kisi ko na batayein.'))).not.toContain('H2');
    expect(ids(rulesFor('Your OTP is 482913. Do not share this code with anyone.'))).not.toContain('H2');
    expect(ids(rulesFor('اپنا کوڈ کسی کو نہ بتائیں'))).not.toContain('H2');
  });
  it('still fires when the negation is a conditional threat', () => {
    expect(ids(rulesFor('Agar aap ne code na bataya to account band ho jayega'))).toContain('H2');
  });
});

describe('H3 — prize + call/pay/send', () => {
  it('fires for a prize with a call instruction', () => {
    expect(ids(rulesFor(CONCEPT))).toContain('H3');
  });
  it('does not fire for everyday "jeeta" without money', () => {
    expect(ids(rulesFor('Pakistan ne match jeeta! Shaam ko call karna'))).not.toContain('H3');
    expect(ids(rulesFor('Imam sahab ko call karein'))).not.toContain('H3');
  });
});

describe('H4 — pay via wallet / scratch card', () => {
  it('fires when an institution asks for wallet payment', () => {
    expect(ids(rulesFor('Ehsaas: processing fee Rs 2,000 Easypaisa par bhejein'))).toContain('H4');
    expect(ids(rulesFor('Jazz ka inaam: scratch card ka number bhejein'))).toContain('H4');
  });
  it('does not treat the wallet used as a channel as the claimed entity', () => {
    expect(ids(rulesFor('Bhai 500 easypaisa kar do'))).not.toContain('H4');
  });
});

describe('H5 — e-challan/courier with link', () => {
  it('fires for courier and e-challan links', () => {
    expect(ids(rulesFor('Your parcel is on hold. Update address: bit.ly/abc'))).toContain('H5');
    expect(ids(rulesFor('e-challan pending hai: https://echallan-pay.xyz'))).toContain('H5');
  });
});

describe('soft rules', () => {
  it('S1 urgency, S2 call this number, S3 CNIC', () => {
    expect(ids(rulesFor('foran karein warna'))).toContain('S1');
    expect(ids(rulesFor('is number par call karein'))).toContain('S2');
    expect(ids(rulesFor('apna CNIC ki copy WhatsApp par bhejein'))).toContain('S3');
  });
  it('S2 ignores official helplines in the text', () => {
    expect(ids(rulesFor('Tasdeeq ke liye 0800-26477 par call karein'))).not.toContain('S2');
  });
  it('S4 flags shorteners and look-alikes but not official hosts', () => {
    const r = rulesFor('Visit epgovpk.men or bit.ly/x');
    const s4 = r.soft.find((f) => f.id === 'S4');
    expect(s4?.evidence).toEqual(['epgovpk.men (look-alike)', 'bit.ly (shortener)']);
    expect(ids(rulesFor('Status check: 8171.bisp.gov.pk'))).not.toContain('S4');
  });
  it('S5 large aid amount, S6 mistake/emergency money', () => {
    expect(ids(rulesFor('BISP se 25 lakh ki imdad'))).toContain('S5');
    expect(ids(rulesFor('BISP qist Rs 13,500'))).not.toContain('S5');
    expect(ids(rulesFor('Ghalti se Rs 5,000 bhej diye, wapis kar dein'))).toContain('S6');
    expect(ids(rulesFor('Ammi main police station mein hoon, paisay bhej dein'))).toContain('S6');
  });
});

describe('P1 — official sender, no asks', () => {
  it('fires for a High-confidence fresh sender with a plain message', () => {
    expect(ids(rulesFor('Aap ke CNIC par 3 SIMs registered hain.', '668'))).toEqual(['P1']);
  });
  it('does not fire for Medium/Unverified senders', () => {
    expect(ids(rulesFor('Aap ki application process mein hai.', '8400'))).toEqual([]); // NADRA 8400 is Medium
    expect(ids(rulesFor('Aap ka parcel pohanch gaya.', '8899'))).toEqual([]); // Pakistan Post 8899 unverified
  });
  it('does not fire when the entry is older than 6 months', () => {
    expect(ids(rulesFor('Aap ke CNIC par 3 SIMs registered hain.', '668', new Date('2027-06-01')))).toEqual([]);
  });
  it('does not fire when an official sender asks for something (8171 is one-way)', () => {
    const r = rulesFor('BISP: foran 03001234567 par call karein', '8171');
    expect(ids(r)).not.toContain('P1');
    expect(r.soft.map((f) => f.id)).toContain('S2');
  });
});

describe('determinism', () => {
  it('returns identical output for identical input', () => {
    expect(rulesFor(CONCEPT, '0341-XXXXXXX', NOW)).toEqual(rulesFor(CONCEPT, '0341-XXXXXXX', NOW));
  });
});
