import { env } from '../config/env.js';

type Level = 'debug' | 'info' | 'warn' | 'error';
type Fields = Record<string, unknown>;

const SEVERITY: Record<Level | 'silent', number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };

// One JSON object per line so log collectors (Docker, CloudWatch, Loki) can parse it.
function write(level: Level, msg: string, fields?: Fields): void {
  if (SEVERITY[level] < SEVERITY[env.LOG_LEVEL]) return;
  const line = JSON.stringify({ time: new Date().toISOString(), level, msg, ...fields });
  (level === 'warn' || level === 'error' ? process.stderr : process.stdout).write(line + '\n');
}

export const logger = {
  debug: (msg: string, fields?: Fields) => write('debug', msg, fields),
  info: (msg: string, fields?: Fields) => write('info', msg, fields),
  warn: (msg: string, fields?: Fields) => write('warn', msg, fields),
  error: (msg: string, fields?: Fields) => write('error', msg, fields),
};
