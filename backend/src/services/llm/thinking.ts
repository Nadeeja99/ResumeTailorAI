import { env } from '../../config/env.js';

export type ThinkingLevelName = 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';

// Measured 2026-10-25 against the default model chain:
// - gemini-3.8-flash rejects MINIMAL with a 400; LOW is accepted by every configured model.
// - On resume analysis, LOW removed thinking overhead (827 → 0 thought tokens) with equivalent output.
// LLM_THINKING_LEVEL overrides every operation when set.
const OPERATION_THINKING: Record<string, ThinkingLevelName> = {
  analyze: 'LOW',
  'compare-jobs': 'LOW',
  'semantic-analysis': 'LOW',
  'parse-linkedin': 'LOW',
  'interview-prep': 'LOW',
  'generate-improved': 'LOW',
  'generate-cover-letter': 'LOW',
};

export function thinkingLevelFor(operation: string): ThinkingLevelName | undefined {
  return env.LLM_THINKING_LEVEL ?? OPERATION_THINKING[operation];
}
