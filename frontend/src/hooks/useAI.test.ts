import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ApiError } from '@/services/aiClient';
import type { AIResult, AITelemetry } from '@/types/ai';
import { useAIStream, useAITask } from './useAI';

const telemetry = { requestId: 'r1' } as AITelemetry;
const timing = { ttfbMs: 5, ttftMs: null, totalMs: 10 };
const result = <T,>(data: T): AIResult<T> => ({ data, telemetry, timing });

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
}

// Rejects with an AbortError once the signal fires — like fetch does.
const untilAborted = (signal: AbortSignal) =>
  new Promise<never>((_, reject) =>
    signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true })
  );

describe('useAITask', () => {
  it('moves loading → success and exposes data, telemetry and timing', async () => {
    const { result: hook } = renderHook(() => useAITask<number>());
    const pending = deferred<AIResult<number>>();

    let run!: Promise<unknown>;
    act(() => {
      run = hook.current.run(() => pending.promise);
    });
    expect(hook.current.status).toBe('loading');
    expect(hook.current.isPending).toBe(true);

    await act(async () => {
      pending.resolve(result(42));
      await run;
    });
    expect(hook.current).toMatchObject({ status: 'success', data: 42, telemetry, timing, error: null });
  });

  it('captures errors and the server telemetry they carry', async () => {
    const { result: hook } = renderHook(() => useAITask<number>());
    const error = new ApiError('quota exceeded', 429, 'QUOTA', telemetry);

    let outcome: unknown;
    await act(async () => {
      outcome = await hook.current.run(() => Promise.reject(error));
    });

    expect(outcome).toEqual({ status: 'error', error });
    expect(hook.current).toMatchObject({ status: 'error', error, telemetry });
  });

  it('reports aborted (not error) when cancelled', async () => {
    const { result: hook } = renderHook(() => useAITask<number>());

    let run!: Promise<unknown>;
    act(() => {
      run = hook.current.run(signal => untilAborted(signal));
    });
    act(() => hook.current.abort());

    let outcome: unknown;
    await act(async () => {
      outcome = await run;
    });
    expect(outcome).toEqual({ status: 'aborted' });
    expect(hook.current.status).toBe('aborted');
  });

  it('aborts the previous run when a new one starts and ignores its late result', async () => {
    const { result: hook } = renderHook(() => useAITask<string>());
    let firstSignal!: AbortSignal;
    const first = deferred<AIResult<string>>();

    act(() => {
      void hook.current.run(signal => ((firstSignal = signal), first.promise));
    });
    await act(async () => {
      await hook.current.run(() => Promise.resolve(result('second')));
    });
    await act(async () => first.resolve(result('first')));

    expect(firstSignal.aborted).toBe(true);
    expect(hook.current.data).toBe('second');
  });

  it('aborts the in-flight request on unmount', () => {
    const { result: hook, unmount } = renderHook(() => useAITask<number>());
    let signal!: AbortSignal;
    act(() => {
      void hook.current.run(s => ((signal = s), untilAborted(s)));
    });

    unmount();

    expect(signal.aborted).toBe(true);
  });
});

describe('useAIStream', () => {
  it('accumulates chunks while streaming, then settles on the final text', async () => {
    const { result: hook } = renderHook(() => useAIStream());
    const done = deferred<AIResult<string>>();
    let emit!: (chunk: string) => void;

    act(() => {
      void hook.current.run((_signal, onChunk) => ((emit = onChunk), done.promise));
    });
    expect(hook.current.status).toBe('loading');

    act(() => {
      emit('Hello');
      emit(' world');
    });
    await waitFor(() => expect(hook.current.text).toBe('Hello world'));
    expect(hook.current.status).toBe('streaming');

    await act(async () => done.resolve(result('Hello world!')));
    expect(hook.current).toMatchObject({ status: 'success', text: 'Hello world!', telemetry });
  });

  it('keeps the partial text when stopped', async () => {
    const { result: hook } = renderHook(() => useAIStream());
    let run!: Promise<unknown>;

    act(() => {
      run = hook.current.run((signal, onChunk) => {
        onChunk('Partial draft');
        return untilAborted(signal);
      });
    });
    act(() => hook.current.abort());
    await act(async () => {
      await run;
    });

    expect(hook.current.status).toBe('aborted');
    expect(hook.current.text).toBe('Partial draft');
    expect(hook.current.isPending).toBe(false);
  });
});
