import type { AIResponse, AIResult, AITelemetry, RequestOptions, SSEEvent } from '@/types/ai';

const API_BASE = '/api';

/** Non-2xx response or an SSE `error` event. Carries the server's telemetry when available. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly telemetry: AITelemetry | null = null
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Checks the name rather than `instanceof`: DOMException isn't an Error subclass in every realm.
export function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError';
}

export function isUsageLimitError(error: unknown): boolean {
  return error instanceof ApiError && (error.code === 'USAGE_LIMIT_REACHED' || error.status === 402);
}

async function readError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string; telemetry?: AITelemetry };
  return new ApiError(body.error || `Request failed (${res.status})`, res.status, body.code, body.telemetry ?? null);
}

const since = (start: number) => Math.round(performance.now() - start);

function send(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
}

/** JSON AI endpoint → `{ data, telemetry }` plus browser-side timing. */
export async function postAI<T>(path: string, body: unknown, { signal }: RequestOptions = {}): Promise<AIResult<T>> {
  const start = performance.now();
  const res = await send(path, body, signal);
  const ttfbMs = since(start);
  if (!res.ok) throw await readError(res);
  const { data, telemetry } = (await res.json()) as AIResponse<T>;
  return { data, telemetry, timing: { ttfbMs, ttftMs: null, totalMs: since(start) } };
}

/** SSE v2 endpoint (meta → chunk* → done | error), calling onChunk for every piece of text. */
export async function streamAI(
  path: string,
  body: unknown,
  onChunk: (chunk: string) => void,
  { signal }: RequestOptions = {}
): Promise<AIResult<string>> {
  const start = performance.now();
  const res = await send(path, body, signal);
  const ttfbMs = since(start);
  if (!res.ok || !res.body) throw await readError(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let ttftMs: number | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue; // also skips `: ping` heartbeats

      let event: SSEEvent;
      try {
        event = JSON.parse(line.slice(6));
      } catch {
        continue; // skip genuinely malformed JSON lines
      }

      if (event.type === 'chunk') {
        ttftMs ??= since(start);
        text += event.text;
        onChunk(event.text);
      } else if (event.type === 'done') {
        return { data: text, telemetry: event.telemetry, timing: { ttfbMs, ttftMs, totalMs: since(start) } };
      } else if (event.type === 'error') {
        throw new ApiError(event.error, 502, event.code, event.telemetry);
      }
    }
  }
  throw new ApiError('The connection closed before the response finished. Please try again.', 0, 'STREAM_INTERRUPTED');
}
