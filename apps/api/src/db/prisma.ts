import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Narrow slice of Prisma used by infrastructure services. Keeping it minimal
 * lets services be unit-tested without a real database.
 */
export type DatabaseClient = Pick<
  PrismaClient,
  | '$queryRaw'
  | 'user'
  | 'session'
  | 'subject'
  | 'question'
  | 'exam'
  | 'examQuestion'
  | 'attempt'
  | 'attemptAnswer'
>;

let prismaClient: PrismaClient | undefined;

/**
 * Lazily created Prisma client. Deferring construction keeps `app.ts` importable
 * without a database connection string (tooling and unit tests).
 */
export function getDatabase(): DatabaseClient {
  prismaClient ??= createClient();
  return prismaClient;
}

export async function disconnectDatabase(): Promise<void> {
  await prismaClient?.$disconnect();
  prismaClient = undefined;
}

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (connectionString === undefined || connectionString.length === 0) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env before starting the API.');
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
