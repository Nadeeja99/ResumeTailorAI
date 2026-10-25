export type ScoreTone = 'success' | 'warning' | 'danger';

export interface ScoreThresholds {
  good: number;
  fair: number;
}

// Each feature scores on a different scale, so thresholds are per feature.
export const ANALYSIS_THRESHOLDS: ScoreThresholds = { good: 80, fair: 60 };
export const COMPARISON_THRESHOLDS: ScoreThresholds = { good: 75, fair: 50 };
export const SEMANTIC_THRESHOLDS: ScoreThresholds = { good: 70, fair: 45 };

export function scoreTone(score: number, thresholds: ScoreThresholds = ANALYSIS_THRESHOLDS): ScoreTone {
  if (score >= thresholds.good) return 'success';
  if (score >= thresholds.fair) return 'warning';
  return 'danger';
}

export function scoreLabel(score: number, thresholds: ScoreThresholds = ANALYSIS_THRESHOLDS): string {
  const tone = scoreTone(score, thresholds);
  return tone === 'success' ? 'Strong match' : tone === 'warning' ? 'Fair match' : 'Needs work';
}

// Static class maps so Tailwind can see every class at build time.
export const TONE_TEXT: Record<ScoreTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
};

export const TONE_BG: Record<ScoreTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
};

export const DIFFICULTY_TONE: Record<'Easy' | 'Medium' | 'Hard', ScoreTone> = {
  Easy: 'success',
  Medium: 'warning',
  Hard: 'danger',
};
