import { describe, it, expect, vi } from 'vitest';
import { analyzeResume, generateImprovedResume } from './resumeApi';

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
const DONE = frame({ type: 'done', telemetry: { requestId: 'r1' } });

describe('generateImprovedResume (SSE v2)', () => {
  it('assembles chunks, including events split across reads, and skips heartbeats', async () => {
    const hello = frame({ type: 'chunk', text: 'Hello' });
    const world = frame({ type: 'chunk', text: ' world' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sseResponse([META, hello, ': ping\n\n', world.slice(0, 12), world.slice(12), DONE])
    );
    const onChunk = vi.fn();

    const full = await generateImprovedResume('resume', 'jd', [], onChunk);

    expect(full).toBe('Hello world');
    expect(onChunk.mock.calls.map(c => c[0])).toEqual(['Hello', ' world']);
  });

  it('throws when the backend emits an error event', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sseResponse([
        META,
        frame({ type: 'chunk', text: 'partial' }),
        frame({ type: 'error', error: 'quota exceeded', code: 'QUOTA', telemetry: {} }),
      ])
    );

    await expect(generateImprovedResume('resume', 'jd', [], () => {})).rejects.toThrow('quota exceeded');
  });

  it('skips malformed lines', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sseResponse([META, 'data: not-json\n\n', frame({ type: 'chunk', text: 'ok' }), DONE])
    );

    await expect(generateImprovedResume('resume', 'jd', [], () => {})).resolves.toBe('ok');
  });

  it('rejects when the stream ends without a done event', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(sseResponse([META, frame({ type: 'chunk', text: 'cut' })]));

    await expect(generateImprovedResume('resume', 'jd', [], () => {})).rejects.toThrow(/connection closed/i);
  });
});

describe('post helpers', () => {
  it('unwraps the { data, telemetry } envelope', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { matchScore: 70 }, telemetry: { requestId: 'r2' } }), { status: 200 })
    );

    await expect(analyzeResume('resume', 'jd')).resolves.toEqual({ matchScore: 70 });
  });

  it('surfaces the backend error message on non-2xx', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Resume must be at least 50 characters.' }), { status: 400 })
    );

    await expect(analyzeResume('short', 'jd')).rejects.toThrow('Resume must be at least 50 characters.');
  });

  it('falls back to the status code when the body is not JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Bad Gateway', { status: 502 }));

    await expect(analyzeResume('resume', 'jd')).rejects.toThrow('Request failed (502)');
  });
});
