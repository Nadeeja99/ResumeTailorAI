import { Router } from 'express';
import { semanticAnalysis } from '../services/embeddings.js';
import { aiRoute } from '../lib/aiRoute.js';
import { validate } from '../middleware/validate.js';
import { semanticAnalysisSchema, type SemanticAnalysisInput } from '../schemas/resume.js';

const router = Router();

router.post(
  '/semantic-analysis',
  validate(semanticAnalysisSchema),
  aiRoute(
    'semantic-analysis',
    (b: SemanticAnalysisInput) => ({ resume: b.resume, jobDescription: b.jobDescription }),
    (b: SemanticAnalysisInput, ctx) => semanticAnalysis(b.resume, b.jobDescription, ctx)
  )
);

export default router;
