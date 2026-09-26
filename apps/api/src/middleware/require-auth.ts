import type { RequestHandler } from 'express';

import type { DatabaseClient } from '../db/prisma.js';
import { HttpError } from '../lib/http-error.js';
import { readCookie, SESSION_COOKIE_NAME } from '../lib/cookies.js';
import type { AuthenticatedUser } from '../services/auth.service.js';
import { resolveSession } from '../services/auth.service.js';

declare module 'express-serve-static-core' {
  interface Request {
    /** Set by `requireAuth`. Absent on public routes. */
    auth?: AuthenticatedUser;
  }
}

export interface RequireAuthDependencies {
  database: DatabaseClient;
  now?: () => Date;
}

/**
 * Server-side authentication boundary (PRD §21: "Protect private API routes
 * with authentication middleware").
 *
 * The identity is derived from the session cookie only. The client cannot
 * influence it, and no route may trust a user id or role from the request.
 */
export function createRequireAuth({ database, now }: RequireAuthDependencies): RequestHandler {
  return (req, _res, next) => {
    const token = readCookie(req.headers.cookie, SESSION_COOKIE_NAME);

    resolveSession(token, { database, ...(now ? { now } : {}) })
      .then((user) => {
        if (user === null) {
          next(HttpError.unauthenticated());
          return;
        }

        req.auth = user;
        next();
      })
      // A database failure while checking a session must not surface as a
      // 200: an unverified request is rejected and the error is logged.
      .catch(next);
  };
}
