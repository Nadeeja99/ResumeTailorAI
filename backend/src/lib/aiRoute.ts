import type { Request, RequestHandler, Response } from 'express';
import { VERSION as PROMPT_VERSION } from '../prompts/index.js';
import type { CallContext } from '../services/llm/client.js';
import { errorSummary, toAIError, type AIError } from '../services/llm/errors.js';
import { TelemetryTracker } from '../services/llm/telemetry.js';
import { logger } from './logger.js';
import { openSSE } from './sse.js';

type ContextOf<B> = (body: B) => Record<string, string>;

function createTracker(res: Response, operation: string, context: Record<string, string>): TelemetryTracker {
  return new TelemetryTracker({ requestId: res.locals.requestId, operation, context });
}

function clientAbortSignal(res: Response): AbortSignal {
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableFinished) controller.abort();
  });
  return controller.signal;
}

function logCompleted(tracker: TelemetryTracker): void {
  const { requestId, operation, model, ttftMs, totalMs, usage, schema, attempts } = tracker.snapshot();
  logger.info('ai.completed', { requestId, operation, model, ttftMs, totalMs, usage, schema, attempts: attempts.length });
}

function logFailed(tracker: TelemetryTracker, error: AIError): void {
  const fields = {
    requestId: tracker.requestId,
    code: error.code,
    error: error.message,
    cause: error.cause === undefined ? undefined : errorSummary(error.cause, 500),
  };
  if (error.code === 'ABORTED') logger.info('ai.aborted', fields);
  else logger.error('ai.failed', fields);
}

// JSON endpoint → `{ data, telemetry }` on success, `{ error, code, telemetry }` on failure.
export function aiRoute<B>(
  operation: string,
  contextOf: ContextOf<B>,
  run: (body: B, ctx: CallContext) => Promise<unknown>
): RequestHandler {
  return async (req: Request, res: Response) => {
    const tracker = createTracker(res, operation, contextOf(req.body));
    try {
      const data = await run(req.body, { tracker, signal: clientAbortSignal(res) });
      logCompleted(tracker);
      res.json({ data, telemetry: tracker.snapshot() });
    } catch (err) {
      const error = toAIError(err);
      logFailed(tracker, error);
      if (error.code === 'ABORTED' || res.headersSent) return;
      res.status(error.status).json({ error: error.message, code: error.code, telemetry: tracker.snapshot() });
    }
  };
}

// Streaming endpoint → SSE v2: meta, chunk*, then done | error.
export function streamRoute<B>(
  operation: string,
  contextOf: ContextOf<B>,
  run: (body: B, ctx: CallContext) => AsyncIterable<string>
): RequestHandler {
  return async (req: Request, res: Response) => {
    const tracker = createTracker(res, operation, contextOf(req.body));
    const sse = openSSE(res);
    sse.send({ type: 'meta', requestId: tracker.requestId, operation, promptVersion: PROMPT_VERSION });
    try {
      for await (const text of run(req.body, { tracker, signal: sse.signal })) {
        sse.send({ type: 'chunk', text });
      }
      logCompleted(tracker);
      sse.send({ type: 'done', telemetry: tracker.snapshot() });
    } catch (err) {
      const error = toAIError(err);
      logFailed(tracker, error);
      sse.send({ type: 'error', error: error.message, code: error.code, telemetry: tracker.snapshot() });
    } finally {
      sse.end();
    }
  };
}
