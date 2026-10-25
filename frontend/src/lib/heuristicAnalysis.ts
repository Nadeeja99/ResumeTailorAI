import type { AnalysisResult } from '@/services/resumeApi';

const SKILL_HINTS = ['react', 'typescript', 'javascript', 'node', 'python', 'java', 'aws', 'gcp', 'azure', 'sql', 'docker', 'kubernetes'];

const tokenize = (text: string) =>
  Array.from(new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)));

/** Offline keyword-overlap analysis, used when the AI service is unreachable. */
export function heuristicAnalyze(resumeText: string, jdText: string): AnalysisResult {
  const resumeTokens = new Set(tokenize(resumeText));
  const important = tokenize(jdText).filter(t => t.length > 3);
  const common = important.filter(t => resumeTokens.has(t));
  const missing = important.filter(t => !resumeTokens.has(t)).slice(0, 25);
  const matchScore = important.length > 0 ? Math.min(100, Math.round((common.length / important.length) * 100)) : 0;

  const matchedSkills = common.filter(t => SKILL_HINTS.includes(t));
  const strengths =
    matchedSkills.length > 0
      ? matchedSkills.slice(0, 6).map(s => `Matched skill: ${s}`)
      : ['Found overlap between your experience and the role.'];

  return {
    matchScore,
    missingKeywords: missing,
    suggestedImprovements: [
      missing.length > 0 ? `Add missing keywords: ${missing.slice(0, 8).join(', ')}` : 'Keyword coverage looks good.',
      'Quantify achievements with metrics (%, $, time saved).',
      'Start bullets with strong action verbs.',
      'Align section order with job priorities.',
    ],
    strengths,
    toneAnalysis: {
      score: Math.min(100, Math.max(40, 60 + Math.floor(resumeText.length / 2000) * 5)),
      feedback: 'Use concise bullets, avoid first-person, keep formatting consistent.',
    },
    atsOptimization: {
      score: Math.min(100, Math.max(40, 70 - (resumeText.match(/\t|\|/g)?.length ?? 0) * 5)),
      suggestions: [
        'Use standard headings: Experience, Education, Skills.',
        'Avoid tables, text boxes, and complex layouts.',
        'Keep bullet styles and fonts simple.',
      ],
    },
  };
}
