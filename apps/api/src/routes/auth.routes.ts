import { Router } from 'express';
import type { RequestHandler } from 'express';

/**
 * Authentication routes (PRD §15).
 *
 * `GET /auth/me` sits behind `requireAuth`; login and logout are public,
 * because a caller without a session cannot obtain one and must be able to
 * discard one.
 */
export function createAuthRouter(handlers: {
  login: RequestHandler;
  logout: RequestHandler;
  me: RequestHandler;
  requireAuth: RequestHandler;
}): Router {
  const router = Router();

  router.post('/login', handlers.login);
  router.post('/logout', handlers.logout);
  router.get('/me', handlers.requireAuth, handlers.me);

  return router;
}
