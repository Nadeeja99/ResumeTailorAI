import { Router, Request, Response } from 'express';
import { parseLinkedInResume } from '../services/gemini.js';
import { validate } from '../middleware/validate.js';
import { linkedInSchema } from '../schemas/resume.js';

const router = Router();

router.post('/parse-linkedin', validate(linkedInSchema), async (req: Request, res: Response) => {
  try {
    const cleaned = await parseLinkedInResume(req.body.rawText);
    res.json({ resume: cleaned });
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message || 'LinkedIn parsing failed.' });
  }
});

export default router;
