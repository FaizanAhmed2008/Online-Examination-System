import type { Server } from 'node:http';

import express from 'express';
import { describe, expect, it } from 'vitest';

import type { DatabaseClient } from '../db/prisma.js';
import { hashSessionToken } from '../lib/session-token.js';
import { SESSION_COOKIE_NAME } from '../lib/cookies.js';
import { createRequireAuth } from './require-auth.js';
import { requireRole } from './require-role.js';

const TOKEN = 'a-known-session-token';
const TOKEN_HASH = hashSessionToken(TOKEN);

type Role = 'STUDENT' | 'FACULTY' | 'ADMIN';

interface FakeUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'ACTIVE' | 'INACTIVE';
}

/** Minimal stand-in for the session lookup performed during authentication. */
function fakeDatabase(user: FakeUser): DatabaseClient {
  return {
    session: {
      findUnique: async ({ where }: { where: { tokenHash: string } }) => {
        if (where.tokenHash !== TOKEN_HASH) {
          return null;
        }
        return {
          id: 'session-1',
          userId: user.id,
          tokenHash: TOKEN_HASH,
          expiresAt: new Date('2099-01-01T00:00:00.000Z'),
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          user,
        };
      },
    },
  } as unknown as DatabaseClient;
}

/**
 * Mounts authentication and a role guard in front of a trivial protected route,
 * so the authorisation boundary can be exercised before any feature exists to
 * protect.
 */
async function withGuardedRoute(
  user: FakeUser,
  allow: Role[],
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = express();
  app.use(
    createRequireAuth({ database: fakeDatabase(user) }),
    requireRole(...allow),
    (_req, res) => {
      res.status(200).json({ ok: true });
    },
  );

  const server: Server = await new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  const address = server.address();

  if (address === null || typeof address === 'string') {
    throw new Error('Expected the test server to bind to a TCP port.');
  }

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

const student: FakeUser = {
  id: 'user-student',
  name: 'Ada Student',
  email: 'student@oes.test',
  role: 'STUDENT',
  status: 'ACTIVE',
};

describe('requireRole', () => {
  it('lets a user through when their role is allowed', async () => {
    await withGuardedRoute(
      { ...student, role: 'FACULTY' },
      ['FACULTY', 'ADMIN'],
      async (baseUrl) => {
        const response = await fetch(baseUrl, {
          headers: { cookie: `${SESSION_COOKIE_NAME}=${TOKEN}` },
        });

        expect(response.status).toBe(200);
      },
    );
  });

  it('rejects a signed-in user whose role is not allowed with 403', async () => {
    await withGuardedRoute(student, ['FACULTY', 'ADMIN'], async (baseUrl) => {
      const response = await fetch(baseUrl, {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${TOKEN}` },
      });

      expect(response.status).toBe(403);
    });
  });

  it('answers 401, not 403, when there is no session at all', async () => {
    await withGuardedRoute(student, ['FACULTY', 'ADMIN'], async (baseUrl) => {
      const response = await fetch(baseUrl);

      // A missing session must not be distinguishable from a wrong role.
      expect(response.status).toBe(401);
    });
  });

  it('answers 401 for a session token it does not recognise', async () => {
    await withGuardedRoute(student, ['STUDENT'], async (baseUrl) => {
      const response = await fetch(baseUrl, {
        headers: { cookie: `${SESSION_COOKIE_NAME}=forged` },
      });

      expect(response.status).toBe(401);
    });
  });

  it('separates the three roles when only one is allowed', async () => {
    const cases: { role: Role; expected: number }[] = [
      { role: 'STUDENT', expected: 403 },
      { role: 'FACULTY', expected: 403 },
      { role: 'ADMIN', expected: 200 },
    ];

    for (const { role, expected } of cases) {
      await withGuardedRoute({ ...student, role }, ['ADMIN'], async (baseUrl) => {
        const response = await fetch(baseUrl, {
          headers: { cookie: `${SESSION_COOKIE_NAME}=${TOKEN}` },
        });

        expect(response.status).toBe(expected);
      });
    }
  });
});
