import { Router } from 'express';
import { parseLinkedInResume } from '../services/gemini.js';
import { aiRoute } from '../lib/aiRoute.js';
import { validate } from '../middleware/validate.js';
import { linkedInSchema, type LinkedInInput } from '../schemas/resume.js';

const router = Router();

router.post(
  '/parse-linkedin',
  validate(linkedInSchema),
  aiRoute(
    'parse-linkedin',
    (b: LinkedInInput) => ({ linkedinPdfText: b.rawText }),
    async (b: LinkedInInput, ctx) => ({ resume: await parseLinkedInResume(b.rawText, ctx) })
  )
);

export default router;
