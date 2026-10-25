import { describe, expect, it } from 'vitest';
import { ANALYSIS_THRESHOLDS, SEMANTIC_THRESHOLDS, scoreLabel, scoreTone } from './score';

describe('scoreTone', () => {
  it('maps scores to tones at the threshold boundaries', () => {
    expect(scoreTone(80, ANALYSIS_THRESHOLDS)).toBe('success');
    expect(scoreTone(79, ANALYSIS_THRESHOLDS)).toBe('warning');
    expect(scoreTone(60, ANALYSIS_THRESHOLDS)).toBe('warning');
    expect(scoreTone(59, ANALYSIS_THRESHOLDS)).toBe('danger');
  });

  it('respects per-feature thresholds', () => {
    expect(scoreTone(70, SEMANTIC_THRESHOLDS)).toBe('success');
    expect(scoreTone(70, ANALYSIS_THRESHOLDS)).toBe('warning');
  });
});

describe('scoreLabel', () => {
  it('labels each tone', () => {
    expect(scoreLabel(90)).toBe('Strong match');
    expect(scoreLabel(65)).toBe('Fair match');
    expect(scoreLabel(10)).toBe('Needs work');
  });
});
