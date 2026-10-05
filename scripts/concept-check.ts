/**
 * Local check of the concept message from the project plan (§1 / §6.6 worked example).
 *   npm run check:concept
 * Runs rules-only unless GEMINI_API_KEY is set.
 */
import { checkMessage } from '../src/check.js';

const CONCEPT = {
  sender: '0341-XXXXXXX',
  text: 'Mubarak ho! BISP ki taraf se aap ne Rs 25,00,000 ka inaam jeeta hai. Wasool karne ke liye is number par call karein.',
};

const result = await checkMessage(CONCEPT);
console.log(JSON.stringify(result, null, 2));

if (result.verdict !== 'SCAM_CONFIRMED') {
  console.error(`\nFAIL: expected SCAM_CONFIRMED, got ${result.verdict}`);
  process.exit(1);
}
console.error(`\nOK: ${result.emoji} ${result.verdict} — ${result.rule_flags.hard.map((f) => f.code).join(', ')}`);
