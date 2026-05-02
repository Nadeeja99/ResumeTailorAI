import { Router, Request, Response } from 'express';
import { generateInterviewPrep } from '../services/gemini.js';
import { validate } from '../middleware/validate.js';
import { interviewPrepSchema } from '../schemas/resume.js';

const router = Router();

router.post('/interview-prep', validate(interviewPrepSchema), async (req: Request, res: Response) => {
  try {
    const result = await generateInterviewPrep(req.body.resume, req.body.jobDescription);
    res.json(result);
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message || 'Interview prep generation failed.' });
  }
});

export default router;
