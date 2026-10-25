// Mirrors backend/src/schemas/resume.ts so problems show inline before a request is sent.
export const LIMITS = {
  resume: { min: 50, max: 15_000 },
  jobDescription: { min: 20, max: 10_000 },
  jobTitle: { max: 200 },
  applicantName: { max: 100 },
  maxJobs: 5,
} as const;

export interface LengthRule {
  min?: number;
  max: number;
}

/** Inline validation message, or null when valid. Empty input is "not started", not an error. */
export function lengthError(label: string, value: string, { min, max }: LengthRule): string | null {
  const trimmed = value.trim().length;
  if (trimmed === 0) return null;
  if (min && trimmed < min) return `${label} needs at least ${min} characters (${trimmed} so far).`;
  if (value.length > max) return `${label} must be under ${max.toLocaleString()} characters.`;
  return null;
}

export function isValidLength(value: string, rule: LengthRule): boolean {
  return value.trim().length > 0 && lengthError('', value, rule) === null;
}
