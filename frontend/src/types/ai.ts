// Mirrors backend/src/services/llm/telemetry.ts and backend/src/lib/sse.ts.

export interface TokenUsage {
  promptTokens: number;
  outputTokens: number;
  thoughtsTokens: number;
  totalTokens: number;
}

export interface ModelAttempt {
  model: string;
  ok: boolean;
  status?: number;
  error?: string;
}

export interface AITelemetry {
  requestId: string;
  operation: string;
  promptVersion: string;
  model: string | null;
  modelVersion: string | null;
  attempts: ModelAttempt[];
  calls: number;
  ttftMs: number | null;
  totalMs: number;
  usage: TokenUsage | null;
  finishReason: string | null;
  schema: 'valid' | 'repaired' | 'failed' | null;
  context: { name: string; chars: number }[];
  embeddings: { model: string; calls: number; inputs: number } | null;
  /** Configured thinking level for this operation (null = model default). */
  thinkingLevel: string | null;
  /** Only present when the server runs with EXPOSE_PROMPTS. One entry per model call. */
  prompts?: PromptRecord[];
}

export interface PromptRecord {
  system: string | null;
  user: string;
}

/** Wire format of JSON AI endpoints. */
export interface AIResponse<T> {
  data: T;
  telemetry: AITelemetry;
}

/** Latency as observed by the browser (includes network + proxy), complementing server telemetry. */
export interface ClientTiming {
  /** Response headers received. */
  ttfbMs: number;
  /** First streamed text chunk received (streams only). */
  ttftMs: number | null;
  totalMs: number;
}

/** What every client AI call resolves to — JSON and streaming alike. */
export interface AIResult<T> {
  data: T;
  telemetry: AITelemetry | null;
  timing: ClientTiming;
}

export interface RequestOptions {
  signal?: AbortSignal;
}

export type SSEEvent =
  | { type: 'meta'; requestId: string; operation: string; promptVersion: string }
  | { type: 'chunk'; text: string }
  | { type: 'done'; telemetry: AITelemetry }
  | { type: 'error'; error: string; code: string; telemetry: AITelemetry };
