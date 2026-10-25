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
  prompts?: string[];
}

export interface AIResponse<T> {
  data: T;
  telemetry: AITelemetry;
}

export interface StreamResult {
  text: string;
  telemetry: AITelemetry | null;
}

export type SSEEvent =
  | { type: 'meta'; requestId: string; operation: string; promptVersion: string }
  | { type: 'chunk'; text: string }
  | { type: 'done'; telemetry: AITelemetry }
  | { type: 'error'; error: string; code: string; telemetry: AITelemetry };
