import { Request, Response, NextFunction } from 'express';
import { ensureUser, getMonthlyUsage, incrementUsage } from '../db/index.js';

const FREE_MONTHLY_LIMIT = 3;

// Reads userId from request body or query string.
// On success, increments usage after the handler runs via res.on('finish').
export function usageLimit(req: Request, res: Response, next: NextFunction): void {
  // Skip in test environment
  if (process.env.NODE_ENV === 'test') return next();

  const userId: string | undefined = req.body?.userId ?? (req.query.userId as string | undefined);

  if (!userId) {
    res.status(400).json({ error: 'userId is required for usage tracking.' });
    return;
  }

  const user = ensureUser(userId);

  if (user.plan === 'free') {
    const count = getMonthlyUsage(userId);
    if (count >= FREE_MONTHLY_LIMIT) {
      res.status(402).json({
        error: 'Monthly limit reached.',
        code: 'USAGE_LIMIT_REACHED',
        usageCount: count,
        usageLimit: FREE_MONTHLY_LIMIT,
        plan: 'free',
      });
      return;
    }
  }

  // Increment only after a successful (2xx) response
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      incrementUsage(userId);
    }
  });

  next();
}
