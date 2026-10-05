/**
 * User-facing wording (plan §5.3, §9). Never claims a message is "100% safe".
 */
import type { Labels, RuleId, Verdict } from './types.js';

export const VERDICT_HEADLINE: Record<Verdict, Labels & { emoji: string }> = {
  SCAM_CONFIRMED: {
    emoji: '🔴',
    ur: 'یہ فراڈ ہے۔',
    roman: 'Yeh FRAUD hai.',
    en: 'This is a scam.',
  },
  LIKELY_SCAM: {
    emoji: '🟠',
    ur: 'فراڈ لگتا ہے — ہوشیار رہیں۔',
    roman: 'Fraud lagta hai — hoshyar rahein.',
    en: 'Likely scam.',
  },
  UNSURE: {
    emoji: '🟡',
    ur: 'پکا نہیں کہہ سکتے — پہلے تصدیق کریں۔',
    roman: 'Pakka nahi keh sakte — pehle tasdeeq karein.',
    en: "Can't be sure — verify first.",
  },
  LIKELY_SAFE: {
    emoji: '🟢',
    ur: 'بظاہر ٹھیک لگتا ہے — پھر بھی PIN/OTP کبھی نہ دیں۔',
    roman: 'Bazahir theek lagta hai — phir bhi PIN/OTP kabhi na dein.',
    en: 'Looks normal — still never share PIN/OTP.',
  },
};

/** Universal safety rule (§5.3, §6.4) — carried by every reply. */
export const SAFETY_TIP: Labels = {
  ur: 'کوئی بھی PIN، OTP یا شناختی کارڈ کی تصویر کسی کو نہ بھیجیں۔',
  roman: 'Koi bhi PIN, OTP ya CNIC ki tasveer kisi ko na bhejein.',
  en: 'Never send any PIN, OTP or photo of your CNIC to anyone.',
};

/** Advice-not-guarantee disclaimer (§12 risk 1). */
export const DISCLAIMER: Labels = {
  ur: 'یہ مشورہ ہے، ضمانت نہیں۔ یہ سروس کسی سرکاری ادارے سے وابستہ نہیں۔',
  roman: 'Yeh mashwara hai, zamanat nahi. Yeh service kisi sarkari idaray se wabasta nahi.',
  en: 'This is advice, not a guarantee. Not affiliated with any government body.',
};

export const FLAG_LABELS: Record<RuleId, Labels> = {
  H1: {
    ur: 'بی آئی ایس پی کا نام، مگر 8171 سے نہیں آیا',
    roman: 'BISP ka naam, magar 8171 se nahi aaya',
    en: 'Claims BISP but was not sent from 8171',
  },
  H2: {
    ur: 'OTP، PIN یا کوڈ مانگ رہا ہے',
    roman: 'OTP / PIN / code maang raha hai',
    en: 'Asks for your OTP / PIN / code / password',
  },
  H3: {
    ur: 'انعام جس میں آپ نے حصہ نہیں لیا — لینے کے لیے کال یا پیسے مانگ رہا ہے',
    roman: 'Inaam jis mein hissa nahi liya — lene ke liye call/paisay maang raha hai',
    en: 'A prize you never entered — asks you to call/pay/send to claim it',
  },
  H4: {
    ur: 'ادارے کا نام لے کر موبائل والٹ یا اسکریچ کارڈ سے پیسے مانگ رہا ہے',
    roman: 'Idaray ka naam le kar wallet / scratch card se paisay maang raha hai',
    en: 'Claims to be a government/telco/bank/courier but asks for payment via wallet or scratch card',
  },
  H5: {
    ur: 'چالان یا پارسل کے پیغام میں لنک ہے',
    roman: 'Challan / parcel ke message mein link hai',
    en: 'E-challan or courier message that contains a link',
  },
  S1: {
    ur: 'ڈرا کر جلدی کروا رہا ہے',
    roman: 'Dara kar jaldi karwa raha hai',
    en: 'Urgency or threat',
  },
  S2: {
    ur: 'کسی نمبر پر کال کرنے کا کہا',
    roman: 'Call karne ka kaha',
    en: 'Tells you to call a number',
  },
  S3: {
    ur: 'شناختی کارڈ یا بائیومیٹرک مانگ رہا ہے',
    roman: 'CNIC ya biometric maang raha hai',
    en: 'Asks for CNIC / CNIC photo / biometric',
  },
  S4: {
    ur: 'مشکوک لنک — سرکاری ویب سائٹ نہیں',
    roman: 'Mashkook link — official website nahi',
    en: 'Contains a link that is not an official website',
  },
  S5: {
    ur: 'سرکاری امداد کی غیر معمولی بڑی رقم',
    roman: 'Sarkari imdad ki ghair mamooli bari raqam',
    en: 'Unrealistically large government-aid amount',
  },
  S6: {
    ur: 'غلطی سے پیسے بھیجنے یا ایمرجنسی کا بہانہ',
    roman: 'Ghalti se paisay bhejne ya emergency ka bahana',
    en: '"Sent by mistake" or family emergency asking for money',
  },
  P1: {
    ur: 'سرکاری فہرست والے نمبر سے آیا، کچھ نہیں مانگا',
    roman: 'Official number se aaya, kuch nahi maanga',
    en: 'Sent from a verified official shortcode, with no asks, links or call-back',
  },
};
