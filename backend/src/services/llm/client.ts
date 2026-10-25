import { GoogleGenAI, ApiError, type GenerateContentConfig, type GenerateContentResponse, type ThinkingLevel } from '@google/genai';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import type { PromptParts } from '../../prompts/index.js';
import { AIError, aborted, toAIError } from './errors.js';
import type { ResponseMeta, TelemetryTracker } from './telemetry.js';
import type { ThinkingLevelName } from './thinking.js';

export interface CallContext {
  tracker: TelemetryTracker;
  signal: AbortSignal;
  thinkingLevel?: ThinkingLevelName;
}

let client: GoogleGenAI | null = null;

export function getClient(): GoogleGenAI {
  if (!env.GEMINI_API_KEY) throw new AIError('GEMINI_API_KEY is not set in backend/.env', 'CONFIG');
  // Timeouts are set per call (request/response vs. streaming need different limits)
  client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

export function responseMeta(model: string, response: GenerateContentResponse | undefined): ResponseMeta {
  return {
    model,
    modelVersion: response?.modelVersion,
    usage: response?.usageMetadata,
    finishReason: response?.candidates?.[0]?.finishReason,
  };
}

const THINKING_REJECTED = /thinking/i;

/**
 * Calls the model with the prompt's system instruction and the operation's thinking level.
 * Thinking support differs per model (e.g. gemini-3.8-flash rejects MINIMAL), so a 400 about
 * thinking retries the same model once with its default instead of failing the request.
 */
export async function callWithConfig<T>(
  ctx: CallContext,
  model: string,
  prompt: PromptParts,
  call: (config: GenerateContentConfig) => Promise<T>,
  extra: GenerateContentConfig = {}
): Promise<T> {
  const config: GenerateContentConfig = {
    abortSignal: ctx.signal,
    systemInstruction: prompt.system,
    httpOptions: { timeout: env.LLM_TIMEOUT_MS },
    ...extra,
  };
  if (!ctx.thinkingLevel) return call(config);
  try {
    return await call({ ...config, thinkingConfig: { thinkingLevel: ctx.thinkingLevel as ThinkingLevel } });
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 400 && THINKING_REJECTED.test(error.message))) throw error;
    logger.warn('llm.thinking_unsupported', { requestId: ctx.tracker.requestId, model, level: ctx.thinkingLevel });
    ctx.tracker.recordThinkingFallback(model);
    return call(config);
  }
}

// Model missing, rate-limited or overloaded → another model may still succeed.
// Auth / bad-request errors would fail identically on every model, so they surface immediately.
const FALLBACK_STATUSES = new Set([404, 429, 500, 502, 503, 504]);

// An abort we didn't ask for is a timeout (SDK per-attempt timeout or our first-token watchdog).
const isTimeout = (error: unknown, ctx: CallContext) =>
  !ctx.signal.aborted && error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');

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
      // Overloaded models often hang rather than return 503, so a timeout also moves on to the next model
      const timedOut = isTimeout(error, ctx);
      ctx.tracker.recordAttempt(model, timedOut ? new Error('timed out') : error);
      if (!timedOut && !(error instanceof ApiError && FALLBACK_STATUSES.has(error.status))) throw toAIError(error);
      lastError = timedOut ? new AIError('The AI request timed out on every model. Please try again.', 'TIMEOUT') : error;
      logger.warn('llm.model_fallback', {
        requestId: ctx.tracker.requestId,
        model,
        reason: timedOut ? 'timeout' : (error as ApiError).status,
      });
    }
  }
  throw toAIError(lastError);
}

/** A child signal that aborts with the parent or after `timeoutMs`; call `clear()` to disarm the timer. */
export function deadlineSignal(parent: AbortSignal, timeoutMs: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort(parent.reason);
  parent.addEventListener('abort', onParentAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

// Explains an empty completion (safety block, token limit) instead of returning blank text.
export function emptyResponseError(response: GenerateContentResponse | undefined): AIError {
  if (response?.promptFeedback?.blockReason) {
    return new AIError('The request was blocked by the model’s safety filters.', 'BLOCKED');
  }
  const reason = response?.candidates?.[0]?.finishReason;
  return new AIError(`The model returned an empty response${reason ? ` (${reason})` : ''}.`, 'UPSTREAM');
}
