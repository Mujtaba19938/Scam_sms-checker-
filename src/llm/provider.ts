/**
 * Provider-agnostic LLM classifier interface (plan §8.1: "behind a provider-agnostic wrapper").
 * Swap Gemini for another provider by implementing `LlmClassifier` and returning it from
 * `createClassifierFromEnv`.
 */
import type { LlmInput } from './prompt.js';
import type { LlmOutput } from './schema.js';
import { GeminiClassifier } from './gemini.js';

export interface LlmClassifier {
  readonly provider: string;
  readonly model: string;
  /** Must reject (throw) on timeout, transport error or invalid output — never guess. */
  classify(input: LlmInput, signal?: AbortSignal): Promise<LlmOutput>;
}

export const DEFAULT_TIMEOUT_MS = 3500;

/** Returns null when no API key is configured — the checker then runs rules-only. */
export function createClassifierFromEnv(env: Record<string, string | undefined> = process.env): LlmClassifier | null {
  const key = env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  return new GeminiClassifier({ apiKey: key, model: env.GEMINI_MODEL?.trim() || undefined });
}

export function timeoutFromEnv(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.LLM_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
}
