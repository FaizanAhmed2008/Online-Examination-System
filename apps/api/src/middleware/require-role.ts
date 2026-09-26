import type { RequestHandler } from 'express';

import type { Role } from '../generated/prisma/client.js';
import { HttpError } from '../lib/http-error.js';

/**
 * Server-side role authorisation (PRD FR-02, §17).
 *
 * This is a convenience guard for coarse route-level checks. It is never the
 * only defence: a service that touches another user's data must also check
 * ownership, because a role check cannot answer "is this *your* exam?".
 *
 * Must be mounted after `requireAuth`.
 */
export function requireRole(...allowedRoles: Role[]): RequestHandler {
  return (req, _res, next) => {
    const user = req.auth;

    if (user === undefined) {
      next(HttpError.unauthenticated());
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      next(HttpError.forbidden());
      return;
    }

    next();
  };
}
