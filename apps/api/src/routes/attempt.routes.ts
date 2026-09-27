import { Router } from 'express';
import type { RequestHandler } from 'express';

/**
 * Attempt routes (PRD FR-16).
 *
 * The whole router is student-only. `/exams` is registered before `/:id` so the
 * literal path wins over the parameter, and `requireAuth` runs first so a
 * signed-in non-student gets 403 rather than 401.
 */
export function createAttemptRouter(handlers: {
  list: RequestHandler;
  start: RequestHandler;
  get: RequestHandler;
  saveAnswers: RequestHandler;
  submit: RequestHandler;
  requireAuth: RequestHandler;
  requireStudent: RequestHandler;
}): Router {
  const router = Router();

  router.use(handlers.requireAuth, handlers.requireStudent);

  router.get('/exams', handlers.list);
  router.post('/', handlers.start);
  router.get('/:id', handlers.get);
  router.put('/:id/answers', handlers.saveAnswers);
  router.post('/:id/submit', handlers.submit);

  return router;
}
