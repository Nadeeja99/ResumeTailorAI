import { Router } from 'express';
import {
  analyzeResume,
  analyzeResumeForJob,
  generateImprovedResumeStream,
  generateCoverLetterStream,
} from '../services/gemini.js';
import { aiRoute, streamRoute } from '../lib/aiRoute.js';
import { validate } from '../middleware/validate.js';
import {
  analyzeSchema,
  generateImprovedSchema,
  coverLetterSchema,
  compareJobsSchema,
  type AnalyzeInput,
  type CompareJobsInput,
  type CoverLetterInput,
  type GenerateImprovedInput,
} from '../schemas/resume.js';

const router = Router();

const resumeAndJob = (b: AnalyzeInput) => ({ resume: b.resume, jobDescription: b.jobDescription });

// ── POST /api/analyze ─────────────────────────────────────────────────────────
router.post(
  '/analyze',
  validate(analyzeSchema),
  aiRoute('analyze', resumeAndJob, (b: AnalyzeInput, ctx) => analyzeResume(b.resume, b.jobDescription, ctx))
);

// ── POST /api/generate-improved  (SSE streaming) ─────────────────────────────
router.post(
  '/generate-improved',
  validate(generateImprovedSchema),
  streamRoute('generate-improved', resumeAndJob, (b: GenerateImprovedInput, ctx) =>
    generateImprovedResumeStream(b.resume, b.jobDescription, b.suggestions, ctx)
  )
);

// ── POST /api/generate-cover-letter  (SSE streaming) ─────────────────────────
router.post(
  '/generate-cover-letter',
  validate(coverLetterSchema),
  streamRoute('generate-cover-letter', resumeAndJob, (b: CoverLetterInput, ctx) =>
    generateCoverLetterStream(b.resume, b.jobDescription, b.applicantName, ctx)
  )
);

// ── POST /api/compare-jobs ────────────────────────────────────────────────────
router.post(
  '/compare-jobs',
  validate(compareJobsSchema),
  aiRoute(
    'compare-jobs',
    (b: CompareJobsInput) => ({
      resume: b.resume,
      ...Object.fromEntries(b.jobDescriptions.map(j => [`job: ${j.title}`, j.description])),
    }),
    async (b: CompareJobsInput, ctx) => {
      // If one comparison fails, cancel the others instead of paying for results we won't return
      const siblings = new AbortController();
      const signal = AbortSignal.any([ctx.signal, siblings.signal]);
      try {
        const results = await Promise.all(
          b.jobDescriptions.map(job =>
            analyzeResumeForJob(b.resume, job.description, job.title, { ...ctx, signal }).then(analysis => ({
              id: job.id,
              title: job.title,
              ...analysis,
            }))
          )
        );
        return { results };
      } catch (error) {
        siblings.abort();
        throw error;
      }
    }
  )
);

export default router;
