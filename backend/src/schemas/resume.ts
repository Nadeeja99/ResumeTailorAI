import { z } from 'zod';

const MAX_RESUME_CHARS = 15_000;
const MAX_JD_CHARS = 10_000;
const MAX_SUGGESTIONS = 20;

export const analyzeSchema = z.object({
  resume: z
    .string({ error: 'resume is required.' })
    .min(50, 'Resume must be at least 50 characters.')
    .max(MAX_RESUME_CHARS, `Resume must be under ${MAX_RESUME_CHARS} characters.`),
  jobDescription: z
    .string({ error: 'jobDescription is required.' })
    .min(20, 'Job description must be at least 20 characters.')
    .max(MAX_JD_CHARS, `Job description must be under ${MAX_JD_CHARS} characters.`),
});

export const generateImprovedSchema = analyzeSchema.extend({
  suggestions: z
    .array(z.string().max(500))
    .max(MAX_SUGGESTIONS)
    .optional()
    .default([]),
});

export const coverLetterSchema = analyzeSchema.extend({
  applicantName: z.string().max(100).optional().default(''),
});

export const compareJobsSchema = z.object({
  resume: z
    .string({ error: 'resume is required.' })
    .min(50, 'Resume must be at least 50 characters.')
    .max(MAX_RESUME_CHARS, `Resume must be under ${MAX_RESUME_CHARS} characters.`),
  jobDescriptions: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().max(200),
        description: z
          .string()
          .min(20)
          .max(MAX_JD_CHARS, `Each job description must be under ${MAX_JD_CHARS} characters.`),
      })
    )
    .min(1, 'At least one job description is required.')
    .max(5, 'Maximum 5 job descriptions for comparison.'),
});

export const semanticAnalysisSchema = analyzeSchema;

export const linkedInSchema = z.object({
  rawText: z
    .string({ error: 'rawText is required.' })
    .min(50, 'Extracted text is too short.')
    .max(30_000, 'Extracted text exceeds 30,000 characters.'),
});

export const interviewPrepSchema = analyzeSchema;

export type AnalyzeInput = z.infer<typeof analyzeSchema>;
export type GenerateImprovedInput = z.infer<typeof generateImprovedSchema>;
export type CoverLetterInput = z.infer<typeof coverLetterSchema>;
export type CompareJobsInput = z.infer<typeof compareJobsSchema>;
export type SemanticAnalysisInput = z.infer<typeof semanticAnalysisSchema>;
