import { describe, it, expect, vi } from 'vitest';
import { ApiError, isAbortError, isUsageLimitError, postAI, streamAI } from './aiClient';

// Builds a streaming Response whose body yields the given raw string pieces.
function sseResponse(pieces: string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      pieces.forEach(p => controller.enqueue(encoder.encode(p)));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

const frame = (event: object) => `data: ${JSON.stringify(event)}\n\n`;
const META = frame({ type: 'meta', requestId: 'r1', operation: 'generate-improved', promptVersion: 'v1.1' });
const TELEMETRY = { requestId: 'r1', model: 'gemini-test' };
const DONE = frame({ type: 'done', telemetry: TELEMETRY });

describe('streamAI (SSE v2)', () => {
  it('assembles chunks split across reads, skips heartbeats, and reports timing', async () => {
    const world = frame({ type: 'chunk', text: ' world' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sseResponse([META, frame({ type: 'chunk', text: 'Hello' }), ': ping\n\n', world.slice(0, 12), world.slice(12), DONE])
    );
    const onChunk = vi.fn();

    const result = await streamAI('/generate-improved', {}, onChunk);

    expect(result.data).toBe('Hello world');
    expect(result.telemetry).toEqual(TELEMETRY);
    expect(onChunk.mock.calls.map(c => c[0])).toEqual(['Hello', ' world']);
    expect(result.timing.ttftMs).not.toBeNull();
    expect(result.timing.ttfbMs).toBeLessThanOrEqual(result.timing.ttftMs!);
    expect(result.timing.ttftMs!).toBeLessThanOrEqual(result.timing.totalMs);
  });

  it('turns an error event into an ApiError carrying code and telemetry', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sseResponse([
        META,
        frame({ type: 'chunk', text: 'partial' }),
        frame({ type: 'error', error: 'quota exceeded', code: 'QUOTA', telemetry: TELEMETRY }),
      ])
    );

    const error = await streamAI('/x', {}, () => {}).catch(e => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: 'quota exceeded', code: 'QUOTA', telemetry: TELEMETRY });
  });

  it('skips malformed lines', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sseResponse([META, 'data: not-json\n\n', frame({ type: 'chunk', text: 'ok' }), DONE])
    );

    await expect(streamAI('/x', {}, () => {})).resolves.toMatchObject({ data: 'ok' });
  });

  it('rejects when the stream ends without a done event', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(sseResponse([META, frame({ type: 'chunk', text: 'cut' })]));

    await expect(streamAI('/x', {}, () => {})).rejects.toMatchObject({ code: 'STREAM_INTERRUPTED' });
  });

  it('passes the abort signal to fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(sseResponse([META, DONE]));
    const controller = new AbortController();

    await streamAI('/x', {}, () => {}, { signal: controller.signal });

    expect(fetchSpy.mock.calls[0][1]?.signal).toBe(controller.signal);
  });
});

describe('postAI', () => {
  it('unwraps the { data, telemetry } envelope and adds client timing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { matchScore: 70 }, telemetry: TELEMETRY }), { status: 200 })
    );

    const result = await postAI('/analyze', {});

    expect(result).toMatchObject({ data: { matchScore: 70 }, telemetry: TELEMETRY, timing: { ttftMs: null } });
    expect(result.timing.totalMs).toBeGreaterThanOrEqual(result.timing.ttfbMs);
  });

  it('surfaces the backend error message, code and telemetry on non-2xx', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Gemini API quota exceeded.', code: 'QUOTA', telemetry: TELEMETRY }), { status: 429 })
    );

    await expect(postAI('/analyze', {})).rejects.toMatchObject({
      name: 'ApiError',
      status: 429,
      code: 'QUOTA',
      message: 'Gemini API quota exceeded.',
      telemetry: TELEMETRY,
    });
  });

  it('falls back to the status code when the body is not JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Bad Gateway', { status: 502 }));

    await expect(postAI('/analyze', {})).rejects.toThrow('Request failed (502)');
  });
});

describe('error helpers', () => {
  it('recognises aborts and usage-limit errors', () => {
    expect(isAbortError(new DOMException('aborted', 'AbortError'))).toBe(true);
    expect(isAbortError(new Error('nope'))).toBe(false);
    expect(isUsageLimitError(new ApiError('Monthly limit reached.', 402, 'USAGE_LIMIT_REACHED'))).toBe(true);
    expect(isUsageLimitError(new ApiError('Bad request', 400))).toBe(false);
  });
});
