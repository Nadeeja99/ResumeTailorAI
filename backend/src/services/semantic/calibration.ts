export interface Calibration {
  model: string;
  /** Cosine similarity mapped to score 0. */
  floor: number;
  /** Similarity span mapped to 0→100 above the floor. */
  range: number;
  /** Score at or above which a requirement counts as covered (if it also matches lexically). */
  coveredThreshold: number;
  /** Raw similarity strong enough to count as covered without any keyword overlap (synonyms). */
  strongSimilarity: number;
}

// Raw cosine similarity is model-specific, so each embedding model gets its own 0-100 mapping.
const CALIBRATIONS: Record<string, Omit<Calibration, 'model'>> = {
  // Measured 2026-10-25 on requirement ↔ resume-line pairs: matches 0.70–0.82, non-matches 0.59–0.67.
  // floor 0.58 / range 0.20 places the ~0.68 boundary at score 50 (the coverage threshold).
  // Clear matches reached 0.80+, so that counts as covered on semantics alone.
  'gemini-embedding-2': { floor: 0.58, range: 0.2, coveredThreshold: 50, strongSimilarity: 0.8 },
};

// Original calibration from text-embedding-004 (related text clustered in 0.5–0.95).
const DEFAULT: Omit<Calibration, 'model'> = { floor: 0.5, range: 0.45, coveredThreshold: 50, strongSimilarity: 0.9 };

export function calibrationFor(model: string): Calibration {
  return { model, ...(CALIBRATIONS[model] ?? DEFAULT) };
}

export function toScore(similarity: number, { floor, range }: Calibration): number {
  return Math.round(Math.min(100, Math.max(0, ((similarity - floor) / range) * 100)));
}
