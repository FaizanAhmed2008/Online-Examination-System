import cors from 'cors';
import express from 'express';

import type { Env } from './config/env.js';
import { createLogger } from './config/logger.js';
import type { Logger } from './config/logger.js';
import type { DatabaseClient } from './db/prisma.js';
import { getDatabase } from './db/prisma.js';
import { createErrorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requestId } from './middleware/request-id.js';
import { createRequestLogger } from './middleware/request-logger.js';
import { API_PREFIX, createApiRouter } from './routes/index.js';

export interface AppDependencies {
  env: Env;
  logger?: Logger;
  /** Injected in tests; defaults to the real Prisma client. */
  database?: DatabaseClient;
}

export function createApp({ env, logger = createLogger(env.logLevel), database }: AppDependencies) {
  const app = express();
  const db = database ?? getDatabase();

  app.disable('x-powered-by');
  app.use(requestId);
  app.use(createRequestLogger({ logger }));
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.use(API_PREFIX, createApiRouter(db, env));

  app.use(notFoundHandler);
  app.use(createErrorHandler({ logger }));

  return app;
}
