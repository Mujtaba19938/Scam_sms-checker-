/**
 * Keyword lists for the v1 red-flag rules (plan §6.2), in English, Roman Urdu and Urdu script.
 * Roman entries are fuzzy-matched (see match.ts); add spelling variants here when the
 * regression set shows a miss.
 */
import type { KeywordSet } from './match.js';

// ---------- entities ----------

export const BISP: KeywordSet = {
  english: ['bisp', 'benazir', 'ehsaas', 'ehsas', 'income support', 'kafaalat', 'kafalat'],
  roman: ['benazir', 'kafaalat', 'kafalat', 'ehsaas'],
  urdu: ['بی آئی ایس پی', 'بینظیر', 'بے نظیر', 'کفالت', 'احساس', 'انکم سپورٹ'],
};

export const GOVT: KeywordSet = {
  english: ['pta', 'nadra', 'fbr', 'government', 'govt', 'police', 'fia', 'nccia', 'psca', 'safe city', 'court', 'customs'],
  roman: ['hukumat', 'sarkari', 'sarkar'],
  urdu: ['حکومت', 'سرکاری', 'پولیس', 'نادرا', 'پی ٹی اے', 'ایف آئی اے', 'عدالت'],
};

export const TELCO: KeywordSet = {
  english: ['jazz', 'telenor', 'zong', 'ufone', 'mobilink', 'warid', 'onic'],
  urdu: ['جاز', 'ٹیلی نار', 'زونگ', 'یوفون'],
};

export const BANK_WALLET: KeywordSet = {
  english: [
    'bank', 'hbl', 'ubl', 'mcb', 'meezan', 'nbp', 'alfalah', 'askari', 'allied', 'faysal', 'jazzcash', 'jazz cash',
    'easypaisa', 'easy paisa', 'sadapay', 'nayapay', 'atm', 'debit card', 'credit card',
  ],
  urdu: ['بینک', 'جاز کیش', 'ایزی پیسہ', 'اے ٹی ایم'],
};

export const COURIER: KeywordSet = {
  english: [
    'courier', 'parcel', 'package', 'shipment', 'delivery', 'tcs', 'leopards', 'pakistan post', 'dhl', 'm&p',
    'tracking', 'consignment',
  ],
  urdu: ['پارسل', 'کورئیر', 'پاکستان پوسٹ', 'ڈلیوری'],
};

export const ECHALLAN: KeywordSet = {
  english: ['e-challan', 'echallan', 'challan', 'traffic fine'],
  urdu: ['چالان', 'ای چالان'],
};

// ---------- asks / instructions ----------

/** Secrets that real institutions never ask for (H2). */
export const SECRETS: KeywordSet = {
  english: ['otp', 'pin', 'mpin', 'password', 'passcode', 'verification code', 'code', 'cvv', 'pin code', 'security code'],
  urdu: ['کوڈ', 'پن', 'پاس ورڈ', 'او ٹی پی', 'خفیہ نمبر'],
};

/** Verbs that request something be handed over. Deliberately excludes "use"/"enter" which legit OTP SMS contain. */
export const ASK_VERBS: KeywordSet = {
  // Short Roman words are listed under `english` so they match exactly ("dein" must not fuzzy-match "din").
  english: ['share', 'send', 'tell', 'provide', 'give', 'reply', 'forward', 'upload', 'whatsapp', 'bata', 'bhej', 'dein', 'dain', 'de do', 'dedo'],
  roman: [
    'batayein', 'batain', 'bataein', 'bataen', 'bataye', 'batao', 'bataiye', 'bata dein',
    'bhejein', 'bhejen', 'bhejain', 'bhejo', 'bhejiye', 'bhijwa', 'bhijwayen',
    'dijiye', 'likhein', 'likhen',
  ],
  urdu: ['بتائیں', 'بتاؤ', 'بتا', 'بتادیں', 'بھیجیں', 'بھیجو', 'بھیج', 'دیں', 'شیئر', 'لکھیں'],
};

/** Negators used in genuine safety warnings ("kisi ko na batayein", "do not share"). */
export const NEGATORS: KeywordSet = {
  english: ['not', 'never', 'dont', 'don'],
  roman: ['nahi', 'nahin', 'mat'],
  urdu: ['نہ', 'مت', 'نہیں', 'ہرگز'],
};
/** Exact short negators ("na") — kept separate so they are never fuzzy-matched. */
export const SHORT_NEGATORS: KeywordSet = { english: ['na', 'nah'] };

/** Conditional words that turn a negation into a threat ("agar code na bataya to…"). */
export const CONDITIONALS: KeywordSet = {
  english: ['if', 'otherwise', 'else', 'unless'],
  roman: ['agar', 'warna', 'varna'],
  urdu: ['اگر', 'ورنہ'],
};

export const CALL: KeywordSet = {
  english: ['call', 'contact', 'phone', 'ring', 'dial', 'missed call', 'callback', 'call back'],
  roman: ['rabta', 'raabta'],
  urdu: ['کال', 'رابطہ', 'فون'],
};

/** "this number" references used with a call instruction (S2). */
export const THIS_NUMBER: KeywordSet = {
  english: ['this number', 'below number', 'given number', 'is number', 'iss number', 'is no', 'is num', 'number par', 'number pe', 'number per'],
  urdu: ['اس نمبر', 'نمبر پر', 'دیئے گئے نمبر'],
};

export const PAY: KeywordSet = {
  english: [
    'fee', 'fees', 'charges', 'charge', 'pay', 'payment', 'transfer', 'deposit', 'processing fee', 'tax',
    'registration fee', 'load', 'recharge',
  ],
  roman: ['adaigi', 'jama karwa', 'jama karwayen'],
  urdu: ['فیس', 'ادائیگی', 'جمع', 'ٹیکس', 'چارجز'],
};

/** Payment channels a scammer can cash out from (H4). */
export const PAY_CHANNEL: KeywordSet = {
  english: [
    'jazzcash', 'jazz cash', 'easypaisa', 'easy paisa', 'sadapay', 'nayapay', 'scratch card', 'recharge card', 'mobile account', 'mobile wallet', 'wallet', 'load', 'balance',
  ],
  urdu: ['جاز کیش', 'ایزی پیسہ', 'اسکریچ کارڈ', 'سکریچ کارڈ', 'بیلنس', 'لوڈ'],
};

// ---------- prize / lottery (H3) ----------

/** Prize nouns — enough on their own for the "prize" half of H3. */
export const PRIZE: KeywordSet = {
  english: ['prize', 'lottery', 'lucky draw', 'lucky winner', 'reward', 'jackpot', 'lucky number', 'bumper', 'inam', 'cash prize'],
  roman: ['inaam', 'enaam', 'inaamat', 'qurandazi', 'qura andazi'],
  urdu: ['انعام', 'قرعہ اندازی', 'لکی ڈرا'],
};

/** "won / jeeta" verbs — count as a prize only together with a money amount, so
 *  "Pakistan ne match jeeta" or "jeete raho" never look like a lottery. */
export const WIN_VERBS: KeywordSet = {
  english: ['won', 'win', 'winner', 'jeeta', 'jeeti', 'jeete', 'jeet', 'jeetay', 'jeetey'],
  urdu: ['جیتا', 'جیتی', 'جیتے', 'جیت'],
};

// ---------- soft signals ----------

export const URGENCY: KeywordSet = {
  english: [
    'urgent', 'urgently', 'immediately', 'asap', '24 hours', '24 hrs', 'within 24', 'blocked', 'block', 'suspend',
    'suspended', 'deactivate', 'deactivated', 'legal action', 'arrest', 'fir', 'last chance', 'final warning',
    'expire', 'expired', 'expiring', 'today only', 'fori', 'fouri',
  ],
  roman: [
    'foran', 'fauran', 'turant', 'warna', 'varna', '24 ghante', '24 ghantay', 'band ho',
    'band kar', 'giraftar', 'giraftari', 'aakhri moqa', 'akhri mauqa',
  ],
  urdu: ['فوری', 'فورا', 'ورنہ', 'بند ہو', 'بند کر', 'بلاک', 'گرفتار', 'گرفتاری', 'ایف آئی آر', '24 گھنٹے', 'آخری موقع'],
};

export const CNIC: KeywordSet = {
  english: ['cnic', 'id card', 'nic', 'biometric', 'biometrics', 'thumb', 'fingerprint', 'thumbprint'],
  roman: ['shanakhti', 'angootha', 'angutha'],
  urdu: ['شناختی کارڈ', 'شناختی', 'بائیومیٹرک', 'انگوٹھا'],
};

export const AID_CONTEXT: KeywordSet = {
  english: ['government', 'govt', 'relief', 'subsidy', 'grant', 'aid', 'scheme', 'program', 'programme'],
  roman: ['imdad', 'imdadi', 'amdad', 'hukumat', 'sarkari'],
  urdu: ['امداد', 'امدادی', 'حکومت', 'سرکاری'],
};

export const MISTAKE: KeywordSet = {
  english: ['by mistake', 'mistakenly', 'wrong number', 'accidentally', 'galti', 'ghalti'],
  roman: ['ghalti se', 'galti se', 'ghalati se', 'ghalti sy', 'galti sy', 'ghalti'],
  urdu: ['غلطی سے', 'غلطی'],
};

export const EMERGENCY: KeywordSet = {
  english: ['police station', 'hospital', 'accident', 'emergency', 'arrested', 'kidnapped', 'thana', 'thane', 'thaney', 'pakra', 'pakar', 'pakda'],
  roman: ['musibat', 'museebat', 'hadsa'],
  urdu: ['تھانے', 'تھانہ', 'ہسپتال', 'حادثہ', 'مصیبت', 'پکڑ'],
};

export const MONEY: KeywordSet = {
  english: ['money', 'rs', 'rupees', 'pkr', 'amount', 'refund', 'return', 'balance', 'jazzcash', 'easypaisa'],
  roman: ['paisay', 'paise', 'paisa', 'pese', 'rupay', 'rupaye', 'raqam', 'wapis', 'wapas'],
  urdu: ['پیسے', 'روپے', 'رقم', 'واپس'],
};

// ---------- links ----------

export const URL_SHORTENERS = [
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'is.gd', 'cutt.ly', 'rb.gy', 'shorturl.at', 'tiny.cc', 'ow.ly',
  'rebrand.ly', 't.ly', 's.id', 'v.gd', 'shorte.st', 'bitly.com',
];

/** Brand fragments that make an unofficial host a look-alike (e.g. epgovpk.men, jazzcash-verify.xyz). */
export const BRAND_FRAGMENTS = [
  'bisp', 'benazir', 'ehsaas', 'kafaalat', 'pta', 'nadra', 'fbr', 'jazzcash', 'jazz', 'easypaisa', 'telenor',
  'zong', 'ufone', 'tcs', 'pakpost', 'epgov', 'psca', 'echallan', 'nccia', 'sbp', 'hbl', 'ubl', 'meezan', 'mcb',
  'govpk', 'gov-pk',
];
