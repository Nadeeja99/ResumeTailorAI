import type { Response } from 'express';
import type { AIErrorCode } from '../services/llm/errors.js';
import type { AITelemetry } from '../services/llm/telemetry.js';

// SSE protocol v2 — every frame is `data: <JSON SSEEvent>\n\n`; `: ping` comments keep proxies from idling out.
export type SSEEvent =
  | { type: 'meta'; requestId: string; operation: string; promptVersion: string }
  | { type: 'chunk'; text: string }
  | { type: 'done'; telemetry: AITelemetry }
  | { type: 'error'; error: string; code: AIErrorCode; telemetry: AITelemetry };

export interface SSEChannel {
  signal: AbortSignal; // aborts when the client disconnects
  send(event: SSEEvent): void;
  end(): void;
}

export function openSSE(res: Response, heartbeatMs = 15_000): SSEChannel {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const controller = new AbortController();
  const onClose = () => {
    if (!res.writableFinished) controller.abort();
  };
  res.on('close', onClose);

  const writable = () => !res.writableEnded && !res.destroyed;
  const heartbeat = setInterval(() => writable() && res.write(': ping\n\n'), heartbeatMs);

  return {
    signal: controller.signal,
    send(event) {
      if (writable()) res.write(`data: ${JSON.stringify(event)}\n\n`);
    },
    end() {
      clearInterval(heartbeat);
      res.off('close', onClose);
      if (writable()) res.end();
    },
  };
}
