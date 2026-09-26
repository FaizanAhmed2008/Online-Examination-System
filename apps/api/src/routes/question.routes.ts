import { Router } from 'express';
import type { RequestHandler } from 'express';

/**
 * Question bank routes (PRD FR-13).
 *
 * The whole router is faculty-only. `requireAuth` runs first so a signed-in
 * non-faculty user gets 403 rather than 401, and an anonymous caller still
 * gets 401.
 */
export function createQuestionRouter(handlers: {
  list: RequestHandler;
  get: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  archive: RequestHandler;
  requireAuth: RequestHandler;
  requireFaculty: RequestHandler;
}): Router {
  const router = Router();

  router.use(handlers.requireAuth, handlers.requireFaculty);

  router.get('/', handlers.list);
  router.post('/', handlers.create);
  router.get('/:id', handlers.get);
  router.patch('/:id', handlers.update);
  router.delete('/:id', handlers.archive);

  return router;
}
