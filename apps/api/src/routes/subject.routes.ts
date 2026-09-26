import { Router } from 'express';
import type { RequestHandler } from 'express';

/**
 * Subject routes (PRD FR-18).
 *
 * Reads are open to every signed-in role; every write is behind the admin
 * guard, so a faculty member can tag a question but cannot invent a subject.
 */
export function createSubjectRouter(handlers: {
  list: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  archive: RequestHandler;
  requireAuth: RequestHandler;
  requireAdmin: RequestHandler;
}): Router {
  const router = Router();

  router.use(handlers.requireAuth);

  router.get('/', handlers.list);
  router.post('/', handlers.requireAdmin, handlers.create);
  router.patch('/:id', handlers.requireAdmin, handlers.update);
  router.delete('/:id', handlers.requireAdmin, handlers.archive);

  return router;
}
