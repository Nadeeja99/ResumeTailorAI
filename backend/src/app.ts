import express, { Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env.js';
import { requestContext } from './middleware/requestContext.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.js';
import resumeRoutes from './routes/resume.js';
import semanticRoutes from './routes/semantic.js';
import billingRoutes from './routes/billing.js';
import linkedInRoutes from './routes/linkedin.js';
import interviewRoutes from './routes/interview.js';

const app = express();

// Behind nginx, trust its X-Forwarded-For so rate limits apply per client, not per proxy
if (env.TRUST_PROXY > 0) app.set('trust proxy', env.TRUST_PROXY);

app.use(helmet());
app.use(requestContext);

// Stripe webhook needs raw body — must be registered before express.json()
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

app.use(cors({ origin: env.CORS_ORIGINS, exposedHeaders: ['X-Request-Id'] }));
app.use(express.json({ limit: '2mb' }));

app.use('/api', healthRoutes);

const isTest = env.NODE_ENV === 'test';

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { error: 'Too many requests, please try again in a minute.', code: 'RATE_LIMITED' },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { error: 'Too many AI requests. Please wait a moment before trying again.', code: 'RATE_LIMITED' },
});

// Mounted once so each AI request is counted exactly once
const aiRoutes = Router();
aiRoutes.use(resumeRoutes, semanticRoutes, linkedInRoutes, interviewRoutes);

app.use('/api', generalLimiter);
app.use('/api/billing', billingRoutes);
app.use('/api', aiLimiter, aiRoutes);

app.use('/api', notFound);
app.use(errorHandler);

export default app;
