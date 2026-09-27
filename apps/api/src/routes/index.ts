import { Router } from 'express';

import type { DatabaseClient } from '../db/prisma.js';
import type { Env } from '../config/env.js';
import { createAttemptController } from '../controllers/attempt.controller.js';
import { createAuthController } from '../controllers/auth.controller.js';
import { createExamController } from '../controllers/exam.controller.js';
import { createQuestionController } from '../controllers/question.controller.js';
import { createSubjectController } from '../controllers/subject.controller.js';
import { createRequireAuth } from '../middleware/require-auth.js';
import { requireRole } from '../middleware/require-role.js';
import { createAttemptRouter } from './attempt.routes.js';
import { createAuthRouter } from './auth.routes.js';
import { createExamRouter } from './exam.routes.js';
import { createHealthRouter } from './health.routes.js';
import { createQuestionRouter } from './question.routes.js';
import { createSubjectRouter } from './subject.routes.js';

export const API_PREFIX = '/api/v1';

/**
 * Single place where the API surface is composed. New feature routers are
 * registered here, one per bounded area (auth, subjects, questions, ...).
 */
export function createApiRouter(database: DatabaseClient, env: Env): Router {
  const router = Router();

  const authController = createAuthController({ env, database });
  const subjectController = createSubjectController({ database });
  const questionController = createQuestionController({ database });
  const examController = createExamController({ database });
  const attemptController = createAttemptController({ database });
  const requireAuth = createRequireAuth({ database });
  const requireAdmin = requireRole('ADMIN');
  const requireFaculty = requireRole('FACULTY');
  const requireStudent = requireRole('STUDENT');

  router.use(createHealthRouter(database));
  router.use(
    '/auth',
    createAuthRouter({
      login: authController.login,
      logout: authController.logout,
      me: authController.me,
      requireAuth,
    }),
  );
  router.use(
    '/subjects',
    createSubjectRouter({
      list: subjectController.list,
      create: subjectController.create,
      update: subjectController.update,
      archive: subjectController.archive,
      requireAuth,
      requireAdmin,
    }),
  );
  router.use(
    '/questions',
    createQuestionRouter({
      list: questionController.list,
      get: questionController.get,
      create: questionController.create,
      update: questionController.update,
      archive: questionController.archive,
      requireAuth,
      requireFaculty,
    }),
  );
  router.use(
    '/exams',
    createExamRouter({
      list: examController.list,
      get: examController.get,
      create: examController.create,
      update: examController.update,
      remove: examController.remove,
      publish: examController.publish,
      unpublish: examController.unpublish,
      requireAuth,
      requireFaculty,
    }),
  );
  router.use(
    '/attempts',
    createAttemptRouter({
      list: attemptController.list,
      start: attemptController.start,
      get: attemptController.get,
      saveAnswers: attemptController.saveAnswers,
      submit: attemptController.submit,
      requireAuth,
      requireStudent,
    }),
  );

  return router;
}
