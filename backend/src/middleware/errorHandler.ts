import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ error: `No route for ${req.method} ${req.baseUrl}${req.path}.`, code: 'NOT_FOUND' });
}

// Final safety net: keeps stack traces out of responses and returns JSON for body-parser failures.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const status = (err as { status?: number })?.status;
  if (status === 400 || status === 413) {
    res.status(status).json({
      error: status === 413 ? 'Request body is too large.' : 'Malformed request body.',
      code: status === 413 ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST',
    });
    return;
  }

  logger.error('http.unhandled_error', {
    requestId: res.locals.requestId,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal server error.', code: 'INTERNAL' });
}
