import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

const INCOMING_ID = /^[\w-]{8,64}$/;

// Assigns a request ID (reusing a well-formed X-Request-Id from upstream) and logs each request once on completion.
export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.get('x-request-id');
  const requestId = incoming && INCOMING_ID.test(incoming) ? incoming : randomUUID();
  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const start = performance.now();
  res.on('close', () => {
    logger.info('http.request', {
      requestId,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      durationMs: Math.round(performance.now() - start),
      aborted: !res.writableFinished,
    });
  });
  next();
}
