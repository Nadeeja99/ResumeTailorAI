import { ApiError, type GenerateContentResponseUsageMetadata } from '@google/genai';
import { env } from '../../config/env.js';
import { VERSION as PROMPT_VERSION } from '../../prompts/index.js';
import { errorSummary } from './errors.js';

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

export type SchemaStatus = 'valid' | 'repaired' | 'failed';

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
  schema: SchemaStatus | null;
  context: { name: string; chars: number }[];
  embeddings: { model: string; calls: number; inputs: number } | null;
  prompts?: string[];
}

export interface ResponseMeta {
  model: string;
  modelVersion?: string;
  usage?: GenerateContentResponseUsageMetadata;
  finishReason?: string;
}

// Collects timing, usage and provenance for one API request, which may span several model calls.
export class TelemetryTracker {
  private readonly startedAt = performance.now();
  private firstTokenAt: number | null = null;
  private readonly data: Omit<AITelemetry, 'ttftMs' | 'totalMs'>;

  constructor(init: { requestId: string; operation: string; context: Record<string, string> }) {
    this.data = {
      requestId: init.requestId,
      operation: init.operation,
      promptVersion: PROMPT_VERSION,
      model: null,
      modelVersion: null,
      attempts: [],
      calls: 0,
      usage: null,
      finishReason: null,
      schema: null,
      context: Object.entries(init.context).map(([name, value]) => ({ name, chars: value.length })),
      embeddings: null,
    };
  }

  get requestId(): string {
    return this.data.requestId;
  }

  recordPrompt(prompt: string): void {
    if (env.EXPOSE_PROMPTS) (this.data.prompts ??= []).push(prompt);
  }

  recordAttempt(model: string, error?: unknown): void {
    this.data.attempts.push(
      error === undefined
        ? { model, ok: true }
        : {
            model,
            ok: false,
            status: error instanceof ApiError ? error.status : undefined,
            error: errorSummary(error),
          }
    );
  }

  markFirstToken(): void {
    this.firstTokenAt ??= performance.now();
  }

  recordResponse(meta: ResponseMeta): void {
    this.data.calls += 1;
    this.data.model = meta.model;
    this.data.modelVersion = meta.modelVersion ?? this.data.modelVersion;
    this.data.finishReason = meta.finishReason ?? this.data.finishReason;
    if (!meta.usage) return;
    const total = (this.data.usage ??= { promptTokens: 0, outputTokens: 0, thoughtsTokens: 0, totalTokens: 0 });
    total.promptTokens += meta.usage.promptTokenCount ?? 0;
    total.outputTokens += meta.usage.candidatesTokenCount ?? 0;
    total.thoughtsTokens += meta.usage.thoughtsTokenCount ?? 0;
    total.totalTokens += meta.usage.totalTokenCount ?? 0;
  }

  recordSchema(status: SchemaStatus): void {
    // In multi-call operations, report the worst outcome
    const rank: Record<SchemaStatus, number> = { valid: 0, repaired: 1, failed: 2 };
    if (!this.data.schema || rank[status] > rank[this.data.schema]) this.data.schema = status;
  }

  recordEmbeddings(model: string, inputs: number): void {
    const e = (this.data.embeddings ??= { model, calls: 0, inputs: 0 });
    e.calls += 1;
    e.inputs += inputs;
  }

  snapshot(): AITelemetry {
    const now = performance.now();
    return {
      ...structuredClone(this.data),
      ttftMs: this.firstTokenAt === null ? null : Math.round(this.firstTokenAt - this.startedAt),
      totalMs: Math.round(now - this.startedAt),
    };
  }
}
