import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { defineConfig, env } from 'prisma/config';

// Prisma CLI commands do not read .env automatically (Prisma 7), and this
// repository keeps a single .env at its root.
const rootEnvFile = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
