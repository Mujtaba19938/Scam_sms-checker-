/**
 * POST /api/check  —  { "text": string, "sender"?: string }  →  CheckResult JSON
 *
 * Vercel Node.js function (Web-standard Request/Response). Stateless: no message
 * content is stored or logged.
 */
import { z } from 'zod';
import { checkMessage, MAX_MESSAGE_CHARS } from '../src/check.js';

const BodySchema = z.object({
  text: z.string().trim().min(1, 'text is required').max(MAX_MESSAGE_CHARS),
  sender: z.string().trim().max(64).optional(),
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'invalid_json' });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return json(400, {
      error: 'invalid_request',
      issues: parsed.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`),
    });
  }
  try {
    return json(200, await checkMessage(parsed.data));
  } catch {
    return json(500, { error: 'internal_error' });
  }
}

export function GET(): Response {
  return json(405, { error: 'method_not_allowed', hint: 'POST {"text": "...", "sender": "..."}' });
}
