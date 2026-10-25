import { z } from 'zod';

// Output contracts for structured AI responses. They double as the Gemini
// response schema (constrained decoding) and as the server-side validator.

const score = z.number().int().min(0).max(100);

export const analysisOutputSchema = z.object({
  matchScore: score,
  missingKeywords: z.array(z.string()).max(25),
  suggestedImprovements: z.array(z.string()).max(8),
  strengths: z.array(z.string()).max(6),
  toneAnalysis: z.object({ score, feedback: z.string() }),
  atsOptimization: z.object({ score, suggestions: z.array(z.string()).max(5) }),
});

export const jobMatchOutputSchema = z.object({
  matchScore: score,
  missingKeywords: z.array(z.string()).max(10),
  strengths: z.array(z.string()).max(5),
  topSuggestion: z.string(),
});

export const interviewPrepOutputSchema = z.object({
  roleTitle: z.string(),
  questions: z
    .array(
      z.object({
        id: z.number().int(),
        question: z.string(),
        category: z.enum(['Behavioral', 'Technical', 'Situational', 'Culture Fit', 'Leadership']),
        difficulty: z.enum(['Easy', 'Medium', 'Hard']),
        whyAsked: z.string(),
        idealAnswer: z.string(),
        tips: z.array(z.string()).max(5),
      })
    )
    .min(1)
    .max(12),
});

export const jdRequirementsOutputSchema = z.object({
  requirements: z.array(z.string()).min(1).max(12),
});

export type ResumeAnalysis = z.infer<typeof analysisOutputSchema>;
export type JobAnalysis = z.infer<typeof jobMatchOutputSchema>;
export type InterviewPrepResult = z.infer<typeof interviewPrepOutputSchema>;
export type InterviewQuestion = InterviewPrepResult['questions'][number];
