import { Router } from 'express';
import { generateInterviewPrep } from '../services/gemini.js';
import { aiRoute } from '../lib/aiRoute.js';
import { validate } from '../middleware/validate.js';
import { interviewPrepSchema, type InterviewPrepInput } from '../schemas/resume.js';

const router = Router();

router.post(
  '/interview-prep',
  validate(interviewPrepSchema),
  aiRoute(
    'interview-prep',
    (b: InterviewPrepInput) => ({ resume: b.resume, jobDescription: b.jobDescription }),
    (b: InterviewPrepInput, ctx) => generateInterviewPrep(b.resume, b.jobDescription, ctx)
  )
);

export default router;
