/** Gemini implementation of LlmClassifier (REST generateContent, JSON mode, temperature 0). */
import type { LlmClassifier } from './provider.js';
import { buildUserTurn, SYSTEM_PROMPT, type LlmInput } from './prompt.js';
import { parseLlmOutput, type LlmOutput } from './schema.js';

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-lite';

export interface GeminiOptions {
  apiKey: string;
  model?: string | undefined;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

export class GeminiClassifier implements LlmClassifier {
  readonly provider = 'gemini';
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: GeminiOptions) {
    this.apiKey = opts.apiKey;
    this.model = opts.model ?? DEFAULT_GEMINI_MODEL;
    this.baseUrl = opts.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta';
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async classify(input: LlmInput, signal?: AbortSignal): Promise<LlmOutput> {
    const res = await this.fetchImpl(`${this.baseUrl}/models/${encodeURIComponent(this.model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': this.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: buildUserTurn(input) }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json', maxOutputTokens: 800 },
      }),
      ...(signal ? { signal } : {}),
    });
    if (!res.ok) throw new Error(`gemini_http_${res.status}`);
    const body = (await res.json()) as GeminiResponse;
    const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text) throw new Error('gemini_empty_response');
    return parseLlmOutput(text);
  }
}
