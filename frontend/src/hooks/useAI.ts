import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, isAbortError } from '@/services/aiClient';
import type { AIResult, AITelemetry, ClientTiming } from '@/types/ai';

export type AIStatus = 'idle' | 'loading' | 'streaming' | 'success' | 'error' | 'aborted';

export interface AIState<T> {
  status: AIStatus;
  data: T | null;
  error: Error | null;
  telemetry: AITelemetry | null;
  timing: ClientTiming | null;
  /** performance.now() when the current run started — drives live elapsed timers. */
  startedAt: number | null;
  /** performance.now() of the first streamed chunk (streams only). */
  firstChunkAt: number | null;
}

/** `run()` never rejects — callers branch on the outcome instead of wrapping every click in try/catch. */
export type AIOutcome<T> =
  | { status: 'success'; result: AIResult<T> }
  | { status: 'error'; error: Error }
  | { status: 'aborted' };

const idle = <T>(): AIState<T> => ({
  status: 'idle',
  data: null,
  error: null,
  telemetry: null,
  timing: null,
  startedAt: null,
  firstChunkAt: null,
});

const raf: (cb: () => void) => number =
  typeof requestAnimationFrame === 'function' ? cb => requestAnimationFrame(cb) : cb => window.setTimeout(cb, 16);
const cancelRaf = (id: number) =>
  typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(id) : window.clearTimeout(id);

// One in-flight request per hook: starting a new run (or unmounting) aborts the previous one.
function useLatestController() {
  const current = useRef<AbortController | null>(null);
  useEffect(() => () => current.current?.abort(), []);

  const start = useCallback(() => {
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    return controller;
  }, []);
  const abort = useCallback(() => current.current?.abort(), []);
  const isCurrent = useCallback((c: AbortController) => current.current === c, []);
  return { start, abort, isCurrent };
}

function failure<T>(error: unknown, signal: AbortSignal): { state: Partial<AIState<T>>; outcome: AIOutcome<T> } {
  if (signal.aborted || isAbortError(error)) return { state: { status: 'aborted' }, outcome: { status: 'aborted' } };
  const err = error instanceof Error ? error : new Error(String(error));
  return {
    state: { status: 'error', error: err, telemetry: err instanceof ApiError ? err.telemetry : null },
    outcome: { status: 'error', error: err },
  };
}

/** Request/response AI call (JSON endpoints). */
export function useAITask<T>() {
  const [state, setState] = useState<AIState<T>>(idle);
  const { start, abort, isCurrent } = useLatestController();

  const run = useCallback(
    async (executor: (signal: AbortSignal) => Promise<AIResult<T>>): Promise<AIOutcome<T>> => {
      const controller = start();
      setState({ ...idle<T>(), status: 'loading', startedAt: performance.now() });
      try {
        const result = await executor(controller.signal);
        if (isCurrent(controller)) {
          setState(s => ({ ...s, status: 'success', data: result.data, error: null, telemetry: result.telemetry, timing: result.timing }));
        }
        return { status: 'success', result };
      } catch (error) {
        const { state: next, outcome } = failure<T>(error, controller.signal);
        if (isCurrent(controller)) setState(s => ({ ...s, ...next }));
        return outcome;
      }
    },
    [start, isCurrent]
  );

  const reset = useCallback(() => {
    abort();
    setState(idle);
  }, [abort]);

  return { ...state, run, abort, reset, isPending: state.status === 'loading' };
}

/** Streaming AI call. Text accumulates in `data`; partial text is kept on abort or error. */
export function useAIStream() {
  const [state, setState] = useState<AIState<string>>(idle);
  const { start, abort, isCurrent } = useLatestController();
  const pending = useRef('');
  const frame = useRef<number | null>(null);

  // Batch chunks into one render per animation frame for smooth, cheap streaming
  const flush = useCallback(() => {
    if (frame.current !== null) cancelRaf(frame.current);
    frame.current = null;
    const chunk = pending.current;
    pending.current = '';
    if (chunk) {
      setState(s => ({
        ...s,
        status: 'streaming',
        data: (s.data ?? '') + chunk,
        firstChunkAt: s.firstChunkAt ?? performance.now(),
      }));
    }
  }, []);

  useEffect(() => () => {
    if (frame.current !== null) cancelRaf(frame.current);
  }, []);

  const run = useCallback(
    async (
      executor: (signal: AbortSignal, onChunk: (chunk: string) => void) => Promise<AIResult<string>>
    ): Promise<AIOutcome<string>> => {
      const controller = start();
      pending.current = '';
      setState({ ...idle<string>(), status: 'loading', startedAt: performance.now() });

      const onChunk = (chunk: string) => {
        if (!isCurrent(controller)) return;
        pending.current += chunk;
        frame.current ??= raf(flush);
      };

      try {
        const result = await executor(controller.signal, onChunk);
        if (isCurrent(controller)) {
          flush();
          setState(s => ({ ...s, status: 'success', data: result.data, error: null, telemetry: result.telemetry, timing: result.timing }));
        }
        return { status: 'success', result };
      } catch (error) {
        const { state: next, outcome } = failure<string>(error, controller.signal);
        if (isCurrent(controller)) {
          flush();
          setState(s => ({ ...s, ...next }));
        }
        return outcome;
      }
    },
    [start, isCurrent, flush]
  );

  const reset = useCallback(() => {
    abort();
    pending.current = '';
    setState(idle);
  }, [abort]);

  return {
    ...state,
    text: state.data ?? '',
    run,
    abort,
    reset,
    isPending: state.status === 'loading' || state.status === 'streaming',
  };
}
