import { ApiError } from '@google/genai';
import { env } from '../../config/env.js';

export type AIErrorCode =
  | 'CONFIG'
  | 'AUTH'
  | 'QUOTA'
  | 'UNAVAILABLE'
  | 'TIMEOUT'
  | 'ABORTED'
  | 'BLOCKED'
  | 'INVALID_OUTPUT'
  | 'UPSTREAM';

const HTTP_STATUS: Record<AIErrorCode, number> = {
  CONFIG: 500,
  AUTH: 502,
  QUOTA: 429,
  UNAVAILABLE: 503,
  TIMEOUT: 504,
  ABORTED: 499,
  BLOCKED: 422,
  INVALID_OUTPUT: 502,
  UPSTREAM: 502,
};

export class AIError extends Error {
  readonly status: number;

  constructor(message: string, readonly code: AIErrorCode, readonly cause?: unknown) {
    super(message);
    this.name = 'AIError';
    this.status = HTTP_STATUS[code];
  }
}

export const aborted = () => new AIError('Request cancelled by client.', 'ABORTED');

// Gemini wraps errors as JSON-in-JSON ({"error":{"message":"{\n \"error\": {...}}"}}); unwrap to the readable message.
export function errorSummary(error: unknown, maxLength = 200): string {
  let message = error instanceof Error ? error.message : String(error);
  for (let depth = 0; depth < 3; depth++) {
    try {
      const inner = JSON.parse(message)?.error?.message;
      if (typeof inner !== 'string') break;
      message = inner;
    } catch {
      break;
    }
  }
  return message.slice(0, maxLength);
}

function isAbortLike(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

// Maps SDK / network failures onto a small set of user-safe errors.
export function toAIError(error: unknown): AIError {
  if (error instanceof AIError) return error;

  const raw = errorSummary(error, 500);

  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403 || /API key not valid|API_KEY_INVALID/i.test(raw)) {
      return new AIError('Gemini rejected the API key. Check GEMINI_API_KEY in backend/.env.', 'AUTH', error);
    }
    if (error.status === 429) return new AIError('Gemini API quota exceeded. Try again later.', 'QUOTA', error);
    if (error.status === 404) {
      return new AIError('None of the configured Gemini models are available. Check GEMINI_MODELS.', 'UNAVAILABLE', error);
    }
    if (error.status >= 500) return new AIError('Gemini is temporarily unavailable. Please try again.', 'UNAVAILABLE', error);
  }

  // The SDK's own timeout aborts the underlying fetch; client aborts are handled before we get here.
  if (isAbortLike(error)) return new AIError('The AI request timed out. Please try again.', 'TIMEOUT', error);

  const message = env.NODE_ENV !== 'production' && raw ? `Gemini error: ${raw}` : 'AI request failed. Please try again.';
  return new AIError(message, 'UPSTREAM', error);
}
