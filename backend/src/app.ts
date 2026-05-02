import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import resumeRoutes from './routes/resume.js';
import semanticRoutes from './routes/semantic.js';
import billingRoutes from './routes/billing.js';
import linkedInRoutes from './routes/linkedin.js';
import interviewRoutes from './routes/interview.js';

const app = express();

// Stripe webhook needs raw body — must be registered before express.json()
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

app.use(cors({ origin: ['http://localhost:8080', 'http://localhost:5173'] }));
app.use(express.json({ limit: '2mb' }));

const isTest = process.env.NODE_ENV === 'test';

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { error: 'Too many requests, please try again in a minute.' },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { error: 'Too many AI requests. Please wait a moment before trying again.' },
});

app.use('/api', generalLimiter);
app.use('/api', aiLimiter, resumeRoutes);
app.use('/api', aiLimiter, semanticRoutes);
app.use('/api', aiLimiter, linkedInRoutes);
app.use('/api', aiLimiter, interviewRoutes);
app.use('/api/billing', billingRoutes);

export default app;
