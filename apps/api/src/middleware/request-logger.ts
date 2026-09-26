import type { RequestHandler } from 'express';

import type { Logger } from '../config/logger.js';

export interface RequestLoggerOptions {
  logger: Logger;
}

/** Logs one structured line per completed request. */
export function createRequestLogger({ logger }: RequestLoggerOptions): RequestHandler {
  return (req, res, next) => {
    const startedAt = performance.now();

    res.on('finish', () => {
      logger.info(
        {
          requestId: req.id,
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          durationMs: Math.round(performance.now() - startedAt),
        },
        'request completed',
      );
    });

    next();
  };
}
