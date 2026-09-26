import pino from 'pino';

import type { LogLevel } from './env.js';

export interface Logger {
  info(payload: object, message?: string): void;
  warn(payload: object, message?: string): void;
  error(payload: object, message?: string): void;
  debug(payload: object, message?: string): void;
}

const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'password',
  'passwordHash',
  'token',
];

/**
 * Structured JSON logger. Credentials and tokens are redacted by default so
 * development logs stay safe to share (PRD §8 Observability, §21 Security).
 */
export function createLogger(level: LogLevel): Logger {
  return pino({
    level,
    redact: { paths: redactPaths, censor: '[redacted]' },
    base: { service: 'oes-api' },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}
