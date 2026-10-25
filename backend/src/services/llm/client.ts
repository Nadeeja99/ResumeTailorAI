import { GoogleGenAI, ApiError, type GenerateContentConfig, type GenerateContentResponse, type ThinkingLevel } from '@google/genai';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { AIError, aborted, toAIError } from './errors.js';
import type { ResponseMeta, TelemetryTracker } from './telemetry.js';

export interface CallContext {
  tracker: TelemetryTracker;
  signal: AbortSignal;
}

let client: GoogleGenAI | null = null;

export function getClient(): GoogleGenAI {
  if (!env.GEMINI_API_KEY) throw new AIError('GEMINI_API_KEY is not set in backend/.env', 'CONFIG');
  client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY, httpOptions: { timeout: env.LLM_TIMEOUT_MS } });
  return client;
}

export function baseConfig(signal: AbortSignal): GenerateContentConfig {
  return {
    abortSignal: signal,
    ...(env.LLM_THINKING_LEVEL && { thinkingConfig: { thinkingLevel: env.LLM_THINKING_LEVEL as ThinkingLevel } }),
  };
}

export function responseMeta(model: string, response: GenerateContentResponse | undefined): ResponseMeta {
  return {
    model,
    modelVersion: response?.modelVersion,
    usage: response?.usageMetadata,
    finishReason: response?.candidates?.[0]?.finishReason,
  };
}

// Model missing, rate-limited or overloaded → another model may still succeed.
// Auth / bad-request errors would fail identically on every model, so they surface immediately.
const FALLBACK_STATUSES = new Set([404, 429, 500, 502, 503, 504]);

export async function withModelFallback<T>(ctx: CallContext, call: (model: string) => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (const model of env.GEMINI_MODELS) {
    if (ctx.signal.aborted) throw aborted();
    try {
      const result = await call(model);
      ctx.tracker.recordAttempt(model);
      return result;
    } catch (error) {
      if (ctx.signal.aborted) throw aborted();
      ctx.tracker.recordAttempt(model, error);
      if (!(error instanceof ApiError && FALLBACK_STATUSES.has(error.status))) throw toAIError(error);
      lastError = error;
      logger.warn('llm.model_fallback', {
        requestId: ctx.tracker.requestId,
        model,
        status: error.status,
      });
    }
  }
  throw toAIError(lastError);
}

// Explains an empty completion (safety block, token limit) instead of returning blank text.
export function emptyResponseError(response: GenerateContentResponse | undefined): AIError {
  if (response?.promptFeedback?.blockReason) {
    return new AIError('The request was blocked by the model’s safety filters.', 'BLOCKED');
  }
  const reason = response?.candidates?.[0]?.finishReason;
  return new AIError(`The model returned an empty response${reason ? ` (${reason})` : ''}.`, 'UPSTREAM');
}
