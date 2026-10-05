import { normalizeMessage } from '../src/core/normalize.js';
import { evaluateRules } from '../src/core/rules.js';
import { resolveSender } from '../src/core/sender.js';
import type { LlmClassifier } from '../src/llm/provider.js';
import type { LlmOutput } from '../src/llm/schema.js';

export const NOW = new Date('2026-10-05T00:00:00Z');

export function rulesFor(text: string, sender?: string, now = NOW) {
  const msg = normalizeMessage(text);
  return evaluateRules(msg, resolveSender(sender, msg.embeddedSender), now);
}

export function ids(r: ReturnType<typeof rulesFor>): string[] {
  return [...r.hard, ...r.soft, ...r.positive].map((f) => f.id).sort();
}

export function llmOutput(over: Partial<LlmOutput> = {}): LlmOutput {
  return {
    verdict: 'LIKELY_SAFE',
    confidence: 0.99,
    scam_type: 'none',
    impersonated_entity: null,
    red_flags: [],
    explanation_ur: 'ٹھیک ہے',
    explanation_roman: 'Theek hai',
    explanation_en: 'Looks fine',
    recommended_action: 'no_action_needed',
    official_helpline: null,
    needs_sender: false,
    ...over,
  };
}

export function fakeLlm(out: LlmOutput | Error, delayMs = 0): LlmClassifier & { calls: number; lastInput?: unknown } {
  const fake = {
    provider: 'fake',
    model: 'fake-1',
    calls: 0,
    lastInput: undefined as unknown,
    async classify(input: unknown, signal?: AbortSignal) {
      fake.calls++;
      fake.lastInput = input;
      if (delayMs) {
        await new Promise((resolve, reject) => {
          const t = setTimeout(resolve, delayMs);
          signal?.addEventListener('abort', () => {
            clearTimeout(t);
            reject(new Error('aborted'));
          });
        });
      }
      if (out instanceof Error) throw out;
      return out;
    },
  };
  return fake;
}
