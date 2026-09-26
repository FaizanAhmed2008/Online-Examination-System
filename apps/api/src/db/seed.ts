/**
 * Opt-in development seed.
 *
 * Run explicitly with `npm run db:seed`. It is never called by `db:migrate`,
 * `db:deploy` or application start-up, so a real deployment can never pick up
 * these accounts.
 *
 * The password is read from `SEED_USER_PASSWORD` and is required: the script
 * refuses to invent a default credential, because a well-known seed password
 * that reaches a shared environment is a genuine backdoor.
 */
import { randomUUID } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';
import type { Role } from '../generated/prisma/client.js';
import { PrismaClient, UserStatus } from '../generated/prisma/client.js';
import { hashPassword } from '../lib/password.js';

interface SeedUser {
  email: string;
  name: string;
  role: Role;
}

const SEED_USERS: SeedUser[] = [
  { email: 'student@oes.local', name: 'Sample Student', role: 'STUDENT' },
  { email: 'faculty@oes.local', name: 'Sample Faculty', role: 'FACULTY' },
  { email: 'admin@oes.local', name: 'Sample Admin', role: 'ADMIN' },
];

async function main(): Promise<void> {
  const password = process.env.SEED_USER_PASSWORD;
  const connectionString = process.env.DATABASE_URL;

  if (password === undefined || password.length < 8) {
    throw new Error(
      'SEED_USER_PASSWORD is required and must be at least 8 characters. ' +
        'Example: SEED_USER_PASSWORD=... npm run db:seed',
    );
  }

  if (connectionString === undefined || connectionString.length === 0) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env first.');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    // Hashed once and reused: scrypt is deliberately slow, and one digest per
    // shared password is also what a real system would do.
    const passwordHash = await hashPassword(password);

    for (const seedUser of SEED_USERS) {
      const data = {
        name: seedUser.name,
        // Re-hashed per user below would be nicer, but the shared digest keeps
        // the seed fast; both accounts are development-only.
        passwordHash,
        role: seedUser.role,
        status: UserStatus.ACTIVE,
      };

      const existing = await prisma.user.findUnique({ where: { email: seedUser.email } });

      if (existing === null) {
        await prisma.user.create({ data: { id: randomUUID(), email: seedUser.email, ...data } });
        process.stdout.write(`created ${seedUser.role.padEnd(7)} ${seedUser.email}\n`);
      } else {
        await prisma.user.update({ where: { id: existing.id }, data });
        process.stdout.write(`updated ${seedUser.role.padEnd(7)} ${seedUser.email}\n`);
      }
    }

    process.stdout.write(
      `\nSeeded ${SEED_USERS.length} development users. Delete them before any shared deployment.\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Seed failed: ${message}\n`);
  process.exitCode = 1;
});
