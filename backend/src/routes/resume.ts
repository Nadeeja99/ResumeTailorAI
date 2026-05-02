import { Router, Request, Response } from 'express';
import { analyzeResume, generateImprovedResume } from '../services/gemini.js';

const router = Router();

router.post('/analyze', async (req: Request, res: Response) => {
  const { resume, jobDescription } = req.body ?? {};

  if (!resume?.trim() || !jobDescription?.trim()) {
    res.status(400).json({ error: 'resume and jobDescription are required.' });
    return;
  }

  try {
    const analysis = await analyzeResume(resume, jobDescription);
    res.json(analysis);
  } catch (error: unknown) {
    const message = (error as Error).message || 'Analysis failed.';
    res.status(500).json({ error: message });
  }
});

router.post('/generate-improved', async (req: Request, res: Response) => {
  const { resume, jobDescription, suggestions } = req.body ?? {};

  if (!resume?.trim() || !jobDescription?.trim()) {
    res.status(400).json({ error: 'resume and jobDescription are required.' });
    return;
  }

  try {
    const improvedResume = await generateImprovedResume(
      resume,
      jobDescription,
      Array.isArray(suggestions) ? suggestions : []
    );
    res.json({ improvedResume });
  } catch (error: unknown) {
    const message = (error as Error).message || 'Generation failed.';
    res.status(500).json({ error: message });
  }
});

export default router;
