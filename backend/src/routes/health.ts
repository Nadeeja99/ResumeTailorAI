import { Router } from 'express';
import { env } from '../config/env.js';
import db from '../db/index.js';
import { VERSION as PROMPT_VERSION } from '../prompts/index.js';

const router = Router();

// Liveness + readiness for Docker/orchestrators. Never rate-limited.
router.get('/health', (_req, res) => {
  let database: 'ok' | 'error' = 'ok';
  try {
    db.prepare('SELECT 1').get();
  } catch {
    database = 'error';
  }
  const healthy = database === 'ok';

  res.setHeader('Cache-Control', 'no-store');
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    uptimeSeconds: Math.round(process.uptime()),
    checks: { database, aiConfigured: Boolean(env.GEMINI_API_KEY) },
    ai: { models: env.GEMINI_MODELS, embeddingModel: env.EMBEDDING_MODEL, promptVersion: PROMPT_VERSION },
  });
});

export default router;
