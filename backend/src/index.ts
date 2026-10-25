// Must be the first import: ESM evaluates imports in order, and config/env reads process.env at load time
import 'dotenv/config';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import app from './app.js';
import db from './db/index.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

const server = app.listen(env.PORT, () => {
  logger.info('server.started', { port: env.PORT, env: env.NODE_ENV, models: env.GEMINI_MODELS });
  if (!env.GEMINI_API_KEY) logger.warn('server.ai_not_configured', { hint: 'Set GEMINI_API_KEY in backend/.env' });
});

let shuttingDown = false;

// Stop accepting connections, let in-flight requests (incl. streams) finish, then close the DB.
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('server.shutting_down', { signal });

  setTimeout(() => {
    logger.error('server.shutdown_timeout', { timeoutMs: SHUTDOWN_TIMEOUT_MS });
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();

  server.close(err => {
    db.close();
    if (err) logger.error('server.close_failed', { error: err.message });
    process.exit(err ? 1 : 0);
  });
  server.closeIdleConnections();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', reason => {
  logger.error('process.unhandled_rejection', { error: reason instanceof Error ? reason.message : String(reason) });
});
