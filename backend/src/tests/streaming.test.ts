import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import request from 'supertest';
import app from '../app.js';
import { AIError, aborted } from '../services/llm/errors.js';
import type { CallContext } from '../services/llm/client.js';
import { JD, RESUME, parseSSE } from './helpers.js';

type StreamImpl = (ctx: CallContext) => AsyncGenerator<string>;

const state = vi.hoisted(() => ({ impl: null as null | StreamImpl }));

vi.mock('../services/gemini.js', () => ({
  generateImprovedResumeStream: (_r: string, _j: string, _s: string[], ctx: CallContext) => state.impl!(ctx),
  generateCoverLetterStream: (_r: string, _j: string, _n: string, ctx: CallContext) => state.impl!(ctx),
}));

const body = { resume: RESUME, jobDescription: JD, suggestions: [] };

let server: Server | undefined;
afterEach(() => {
  server?.close();
  server = undefined;
});

describe('SSE streaming', () => {
  it('emits an error event (after partial output) when generation fails mid-stream', async () => {
    state.impl = async function* () {
      yield 'partial';
      throw new AIError('Gemini API quota exceeded. Try again later.', 'QUOTA');
    };

    const res = await request(app).post('/api/generate-improved').send(body);
    const events = parseSSE(res.text);

    expect(events.map(e => e.type)).toEqual(['meta', 'chunk', 'error']);
    expect(events[2]).toMatchObject({ code: 'QUOTA', error: 'Gemini API quota exceeded. Try again later.' });
    expect(events[2]).toHaveProperty('telemetry.requestId');
  });

  it('aborts generation when the client disconnects', async () => {
    let signal: AbortSignal | undefined;
    state.impl = async function* (ctx) {
      signal = ctx.signal;
      yield 'first';
      await new Promise(resolve => ctx.signal.addEventListener('abort', resolve, { once: true }));
      throw aborted();
    };

    server = app.listen(0);
    const { port } = server.address() as AddressInfo;
    const client = new AbortController();
    const res = await fetch(`http://127.0.0.1:${port}/api/generate-improved`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: client.signal,
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let received = '';
    while (!received.includes('"type":"chunk"')) {
      const { value } = await reader.read();
      received += decoder.decode(value, { stream: true });
    }
    expect(signal?.aborted).toBe(false);

    client.abort();

    await vi.waitFor(() => expect(signal?.aborted).toBe(true), { timeout: 2000 });
  });
});
