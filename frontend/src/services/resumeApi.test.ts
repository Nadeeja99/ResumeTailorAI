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

describe('generateImprovedResume (SSE)', () => {
  it('assembles chunks, including events split across reads', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sseResponse([
        'data: {"chunk":"Hello"}\n\n',
        'data: {"chu',
        'nk":" world"}\n\n',
        'data: [DONE]\n\n',
      ])
    );
    const onChunk = vi.fn();

    const full = await generateImprovedResume('resume', 'jd', [], onChunk);

    expect(full).toBe('Hello world');
    expect(onChunk.mock.calls.map(c => c[0])).toEqual(['Hello', ' world']);
  });

  it('throws when the backend emits an error event', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sseResponse(['data: {"chunk":"partial"}\n\n', 'data: {"error":"quota exceeded"}\n\n'])
    );

    await expect(generateImprovedResume('resume', 'jd', [], () => {})).rejects.toThrow('quota exceeded');
  });

  it('skips malformed lines', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sseResponse(['data: not-json\n\n', 'data: {"chunk":"ok"}\n\n', 'data: [DONE]\n\n'])
    );

    await expect(generateImprovedResume('resume', 'jd', [], () => {})).resolves.toBe('ok');
  });
});

describe('post helpers', () => {
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
