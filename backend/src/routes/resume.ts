import { Router, Request, Response } from 'express';
import {
  analyzeResume,
  analyzeResumeForJob,
  generateImprovedResumeStream,
  generateCoverLetterStream,
} from '../services/gemini.js';
import { validate } from '../middleware/validate.js';
import {
  analyzeSchema,
  generateImprovedSchema,
  coverLetterSchema,
  compareJobsSchema,
} from '../schemas/resume.js';

const router = Router();

// ── POST /api/analyze ─────────────────────────────────────────────────────────
router.post('/analyze', validate(analyzeSchema), async (req: Request, res: Response) => {
  try {
    const analysis = await analyzeResume(req.body.resume, req.body.jobDescription);
    res.json(analysis);
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message || 'Analysis failed.' });
  }
});

// ── POST /api/generate-improved  (SSE streaming) ─────────────────────────────
router.post('/generate-improved', validate(generateImprovedSchema), async (req: Request, res: Response) => {
  const { resume, jobDescription, suggestions } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    for await (const chunk of generateImprovedResumeStream(resume, jobDescription, suggestions)) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
  } catch (error: unknown) {
    res.write(`data: ${JSON.stringify({ error: (error as Error).message })}\n\n`);
  } finally {
    res.end();
  }
});

// ── POST /api/generate-cover-letter  (SSE streaming) ─────────────────────────
router.post('/generate-cover-letter', validate(coverLetterSchema), async (req: Request, res: Response) => {
  const { resume, jobDescription, applicantName } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    for await (const chunk of generateCoverLetterStream(resume, jobDescription, applicantName)) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
  } catch (error: unknown) {
    res.write(`data: ${JSON.stringify({ error: (error as Error).message })}\n\n`);
  } finally {
    res.end();
  }
});

// ── POST /api/compare-jobs ────────────────────────────────────────────────────
router.post('/compare-jobs', validate(compareJobsSchema), async (req: Request, res: Response) => {
  const { resume, jobDescriptions } = req.body;

  try {
    const results = await Promise.all(
      jobDescriptions.map((job: { id: string; title: string; description: string }) =>
        analyzeResumeForJob(resume, job.description, job.title).then(analysis => ({
          id: job.id,
          title: job.title,
          ...analysis,
        }))
      )
    );
    res.json({ results });
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message || 'Comparison failed.' });
  }
});

export default router;
