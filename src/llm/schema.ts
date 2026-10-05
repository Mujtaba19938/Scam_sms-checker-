/** LLM output schema (plan §6.6), validated with zod. Anything that fails validation is discarded. */
import { z } from 'zod';
import { ACTIONS, SCAM_TYPES, VERDICTS } from '../core/types.js';

const text220 = z
  .string()
  .transform((s) => s.trim().slice(0, 220));

export const LlmOutputSchema = z.object({
  verdict: z.enum(VERDICTS),
  confidence: z.number().min(0).max(1),
  scam_type: z.enum(SCAM_TYPES),
  impersonated_entity: z.string().max(80).nullable().transform((s) => (s && s.toLowerCase() !== 'none' ? s : null)),
  red_flags: z
    .array(
      z.object({
        code: z.string().max(60),
        label_ur: text220,
        label_en: text220,
      }),
    )
    .max(3),
  explanation_ur: text220,
  explanation_roman: text220,
  explanation_en: text220,
  recommended_action: z.enum(ACTIONS),
  official_helpline: z.string().max(40).nullable(),
  needs_sender: z.boolean(),
});

export type LlmOutput = z.infer<typeof LlmOutputSchema>;

/** Parse raw model text (JSON, possibly wrapped in a ```json fence) into a validated LlmOutput. */
export function parseLlmOutput(raw: string): LlmOutput {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const json: unknown = JSON.parse(trimmed);
  return LlmOutputSchema.parse(json);
}
