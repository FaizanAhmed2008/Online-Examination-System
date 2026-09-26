import { Router } from 'express';

import { createHealthController } from '../controllers/health.controller.js';
import type { DatabaseClient } from '../db/prisma.js';

export function createHealthRouter(database: DatabaseClient): Router {
  const router = Router();
  const controller = createHealthController(database);

  router.get('/health', controller.liveness);
  router.get('/health/ready', controller.readiness);

  return router;
}
