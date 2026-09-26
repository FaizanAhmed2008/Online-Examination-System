import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    id: string;
  }
}

/**
 * Assigns a request id used in every log line and echoed back to the client so
 * a user-visible failure can be traced to server logs.
 */
export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.header('x-request-id');
  req.id = incoming && incoming.length <= 64 ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
};
