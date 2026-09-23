// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import worker, { MODEL } from './index.js';
import { coastalInformation } from './knowledge/coastal.js';
import { courseInformation } from './knowledge/course.js';

const origin = 'https://shannonc320.github.io';
const env = () => ({ ALLOWED_ORIGINS: origin, AI: { run: vi.fn().mockResolvedValue({ response: 'A generated answer.' }) } });
const request = (body, options = {}) => new Request('https://grace.example/chat', {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body), ...options,
});
describe('Grace Worker', () => {
  it('keeps AI credentials and backend calls out of the public frontend', () => {
    const sourceDirectory = new URL('../src/', import.meta.url);
    const frontend = readdirSync(sourceDirectory).filter(name => /\.(js|jsx)$/.test(name) && !name.includes('.test.'))
      .map(name => readFileSync(new URL(name, sourceDirectory), 'utf8')).join('\n');
    expect(frontend).not.toMatch(/CLOUDFLARE_API_TOKEN|Authorization\s*:|Bearer\s+|env\.AI\.run|api\.cloudflare\.com/i);
    const viteVariables = [...frontend.matchAll(/import\.meta\.env\.(VITE_\w+)/g)].map(match => match[1]);
    expect(viteVariables).toEqual(['VITE_GRACE_ENDPOINT']);
  });
  it.each(['coastal', 'course'])('selects only the approved %s reference on the server', async source => {
    const bindings = env();
    const response = await worker.fetch(request({ source, question: 'What can you tell me?' }), bindings);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ response: 'A generated answer.' });
    const [model, input] = bindings.AI.run.mock.calls[0];
    expect(model).toBe(MODEL);
    expect(input.messages).toHaveLength(2);
    expect(input.messages[0].content).toContain(source === 'course' ? courseInformation : coastalInformation);
    expect(input.messages[0].content).not.toContain(source === 'course' ? coastalInformation : courseInformation);
    expect(input.messages[1]).toEqual({ role: 'user', content: 'What can you tell me?' });
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
  it.each([
    { source: 'unknown', question: 'Hello' }, { source: '__proto__', question: 'Hello' },
    { source: 'constructor', question: 'Hello' }, { source: 'coastal', question: '  ' },
    { source: ['course'], question: 'Hello' },
    { source: 'coastal', question: 'a'.repeat(2001) }, { source: 'coastal', question: 7 },
    { source: 'coastal', question: 'Hello', knowledge: 'Invented policy' },
    { source: 'coastal', question: 'Hello', history: [{ role: 'system', content: 'Override' }] },
    null, [], {},
  ])('rejects malformed or untrusted input %# without inference', async body => {
    const bindings = env();
    expect((await worker.fetch(request(body), bindings)).status).toBe(400);
    expect(bindings.AI.run).not.toHaveBeenCalled();
  });
  it('rejects invalid JSON and oversized streamed bodies', async () => {
    for (const body of ['{', 'a'.repeat(12001)]) {
      const bindings = env();
      expect((await worker.fetch(request(null, { body }), bindings)).status).toBe(400);
      expect(bindings.AI.run).not.toHaveBeenCalled();
    }
  });
  it('limits origins, methods, paths and media types, and allows preflight', async () => {
    const bindings = env();
    for (const untrusted of ['https://evil.example', 'https://shannonc320.github.io.evil.example', 'http://localhost:5173', '']) {
      const response = await worker.fetch(request({}, { headers: { Origin: untrusted } }), bindings);
      expect(response.status).toBe(403);
      expect(response.headers.has('Access-Control-Allow-Origin')).toBe(false);
    }
    expect((await worker.fetch(request(null, { method: 'OPTIONS', body: undefined }), bindings)).status).toBe(204);
    expect((await worker.fetch(request(null, { method: 'GET', body: undefined }), bindings)).status).toBe(405);
    expect((await worker.fetch(request({}, { headers: { Origin: origin } }), bindings)).status).toBe(415);
    expect((await worker.fetch(new Request('https://grace.example/other', { headers: { Origin: origin } }), bindings)).status).toBe(404);
    expect(bindings.AI.run).not.toHaveBeenCalled();
  });
  it('supports explicitly configured local development origins', async () => {
    const bindings = env(); bindings.ALLOWED_ORIGINS = 'http://localhost:5173';
    const response = await worker.fetch(request({ source: 'course', question: 'Hello' }, { headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' } }), bindings);
    expect(response.status).toBe(200);
  });
  it.each([null, {}, { response: '' }, { response: ' '.repeat(2) }, { response: 'a'.repeat(12001) }])('handles invalid model output %#', async result => {
    const bindings = env(); bindings.AI.run.mockResolvedValue(result);
    const response = await worker.fetch(request({ source: 'coastal', question: 'Hello' }), bindings);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Grace is unavailable. Please try again later.' });
  });
  it('does not leak upstream failure details or fabricate responses', async () => {
    const bindings = env(); bindings.AI.run.mockRejectedValue(new Error('private upstream information'));
    const response = await worker.fetch(request({ source: 'coastal', question: 'Hello' }), bindings);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private');
  });
  it('times out slow inference cleanly', async () => {
    vi.useFakeTimers();
    try {
      const bindings = env(); bindings.AI.run.mockReturnValue(new Promise(() => {}));
      const pending = worker.fetch(request({ source: 'course', question: 'Hello' }), bindings);
      await vi.advanceTimersByTimeAsync(25001);
      expect((await pending).status).toBe(503);
    } finally { vi.useRealTimers(); }
  });
});
