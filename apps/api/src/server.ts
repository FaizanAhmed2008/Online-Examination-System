import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createLogger } from './config/logger.js';
import { disconnectDatabase } from './db/prisma.js';

const env = loadEnv();
const logger = createLogger(env.logLevel);
const app = createApp({ env, logger });

const server = app.listen(env.port, () => {
  logger.info({ port: env.port, env: env.nodeEnv }, 'api listening');
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'shutting down');
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
