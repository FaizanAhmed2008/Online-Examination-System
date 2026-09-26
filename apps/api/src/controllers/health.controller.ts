import type { Request, Response } from 'express';

import type { DatabaseClient } from '../db/prisma.js';
import { getLiveness, getReadiness } from '../services/health.service.js';

export interface HealthController {
  liveness(_req: Request, res: Response): void;
  readiness(_req: Request, res: Response): Promise<void>;
}

export function createHealthController(database: DatabaseClient): HealthController {
  return {
    liveness: (_req, res) => {
      res.status(200).json(getLiveness());
    },

    readiness: async (_req, res) => {
      const readiness = await getReadiness(database);
      res.status(readiness.status === 'ok' ? 200 : 503).json(readiness);
    },
  };
}
