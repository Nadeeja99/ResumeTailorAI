import type { AITelemetry, ClientTiming } from '@/types/ai';

export const estimateTokens = (chars: number) => Math.ceil(chars / 4);

export interface DerivedMetrics {
  /** Server time spent producing tokens after the first one arrived (streams only). */
  generationMs: number | null;
  /** Output tokens per second during generation. */
  outputTokensPerSec: number | null;
  /** Client total minus server total: network, proxy and parsing overhead. */
  overheadMs: number | null;
}

export function deriveMetrics(t: AITelemetry, timing: ClientTiming | null): DerivedMetrics {
  const generationMs = t.ttftMs !== null ? t.totalMs - t.ttftMs : null;
  const window = generationMs ?? t.totalMs;
  const outputTokensPerSec = t.usage && window > 0 ? Math.round(t.usage.outputTokens / (window / 1000)) : null;
  const overheadMs = timing ? Math.max(0, timing.totalMs - t.totalMs) : null;
  return { generationMs, outputTokensPerSec, overheadMs };
}
