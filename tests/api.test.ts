import { describe, expect, it } from 'vitest';
import { GET, POST } from '../api/check.js';

const post = (body: unknown) =>
  POST(new Request('http://localhost/api/check', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) }));

describe('POST /api/check', () => {
  it('returns a verdict', async () => {
    const res = await post({ text: 'Apna OTP code bhejein', sender: '03001234567' });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect((await res.json()).verdict).toBe('SCAM_CONFIRMED');
  });
  it('validates input', async () => {
    expect((await post('not json')).status).toBe(400);
    expect((await post({ text: '' })).status).toBe(400);
    expect((await post({ text: 'x'.repeat(5000) })).status).toBe(400);
  });
  it('rejects GET', () => {
    expect(GET().status).toBe(405);
  });
});
