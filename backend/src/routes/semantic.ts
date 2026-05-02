import { Router, Request, Response } from 'express';
import { semanticAnalysis } from '../services/embeddings.js';
import { validate } from '../middleware/validate.js';
import { semanticAnalysisSchema } from '../schemas/resume.js';

const router = Router();

router.post('/semantic-analysis', validate(semanticAnalysisSchema), async (req: Request, res: Response) => {
  try {
    const result = await semanticAnalysis(req.body.resume, req.body.jobDescription);
    res.json(result);
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message || 'Semantic analysis failed.' });
  }
});

export default router;
