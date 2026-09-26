import type { Server } from 'node:http';

import { describe, expect, it } from 'vitest';

import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import type { DatabaseClient } from './db/prisma.js';
import { hashPassword } from './lib/password.js';
import { SESSION_COOKIE_NAME } from './lib/cookies.js';

const testEnv = loadEnv({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/oes',
  LOG_LEVEL: 'silent',
});

const PASSWORD = 'valid-password';

interface FakeUserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'STUDENT' | 'FACULTY' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE';
}

interface FakeSessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

interface FakeDatabase {
  database: DatabaseClient;
  sessions: FakeSessionRecord[];
  users: FakeUserRecord[];
}

async function createFakeDatabase(
  behaviour: 'ok' | 'failing' = 'ok',
  seed: Partial<FakeUserRecord>[] = [],
): Promise<FakeDatabase> {
  const users: FakeUserRecord[] = await Promise.all(
    seed.map(async (overrides, index) => ({
      id: overrides.id ?? `user-${index + 1}`,
      name: overrides.name ?? 'Test Person',
      email: overrides.email ?? `user${index + 1}@oes.test`,
      passwordHash: overrides.passwordHash ?? (await hashPassword(PASSWORD)),
      role: overrides.role ?? ('STUDENT' as const),
      status: overrides.status ?? ('ACTIVE' as const),
    })),
  );

  const sessions: FakeSessionRecord[] = [];
  let nextSessionId = 1;

  const database = {
    $queryRaw: async () => {
      if (behaviour === 'failing') {
        throw new Error('connection refused: postgres://user:secret@db:5432');
      }
      return [{ '?column?': 1 }];
    },
    user: {
      findUnique: async ({ where }: { where: { email: string } }) =>
        users.find((user) => user.email === where.email) ?? null,
    },
    session: {
      create: async ({ data }: { data: Omit<FakeSessionRecord, 'id'> }) => {
        const record: FakeSessionRecord = { id: `session-${nextSessionId++}`, ...data };
        sessions.push(record);
        return record;
      },
      findUnique: async ({ where }: { where: { tokenHash: string } }) => {
        const session = sessions.find((candidate) => candidate.tokenHash === where.tokenHash);

        if (session === undefined) {
          return null;
        }

        const user = users.find((candidate) => candidate.id === session.userId);

        return user === undefined ? null : { ...session, user };
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const index = sessions.findIndex((candidate) => candidate.id === where.id);

        if (index === -1) {
          throw new Error('session not found');
        }

        return sessions.splice(index, 1)[0]!;
      },
      deleteMany: async ({ where }: { where: { tokenHash: string } }) => {
        const remaining = sessions.filter((candidate) => candidate.tokenHash !== where.tokenHash);
        const count = sessions.length - remaining.length;
        sessions.length = 0;
        sessions.push(...remaining);
        return { count };
      },
    },
  } as unknown as DatabaseClient;

  return { database, sessions, users };
}

async function withServer(
  database: DatabaseClient,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = createApp({ env: testEnv, database });
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

/** Pulls the session cookie out of a `Set-Cookie` header. */
function readSetCookie(header: string | null, name: string): string {
  if (header === null) {
    throw new Error('Expected a Set-Cookie header.');
  }

  const match = header.split(';')[0] ?? '';

  if (!match.startsWith(`${name}=`)) {
    throw new Error(`Expected cookie ${name}, received: ${header}`);
  }

  return match.slice(name.length + 1);
}

describe('createApp', () => {
  it('serves the liveness endpoint without touching the database', async () => {
    const { database } = await createFakeDatabase('failing');
    await withServer(database, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/health`);

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ status: 'ok', service: 'oes-api' });
    });
  });

  it('reports 200 on readiness when the database responds', async () => {
    const { database } = await createFakeDatabase();
    await withServer(database, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/health/ready`);

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        status: 'ok',
        checks: { database: { status: 'ok' } },
      });
    });
  });

  it('reports 503 on readiness and never leaks the connection string', async () => {
    const { database } = await createFakeDatabase('failing');
    await withServer(database, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/health/ready`);
      const body = await response.text();

      expect(response.status).toBe(503);
      expect(body).not.toContain('secret');
      expect(JSON.parse(body)).toMatchObject({
        status: 'unavailable',
        checks: { database: { status: 'unavailable' } },
      });
    });
  });

  it('returns the standard error envelope for unknown routes', async () => {
    const { database } = await createFakeDatabase();
    await withServer(database, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/does-not-exist`);

      expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
    });
  });

  it('rejects malformed JSON bodies with a validation error', async () => {
    const { database } = await createFakeDatabase();
    await withServer(database, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/health`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{',
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    });
  });

  it('echoes the request id for client-side tracing', async () => {
    const { database } = await createFakeDatabase();
    await withServer(database, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/health`, {
        headers: { 'x-request-id': 'test-request-id' },
      });

      expect(response.headers.get('x-request-id')).toBe('test-request-id');
    });
  });
});

describe('POST /auth/login', () => {
  it('sets an httpOnly session cookie and returns the user without secrets', async () => {
    const { database } = await createFakeDatabase('ok', [
      { email: 'student@oes.test', name: 'Ada Student', role: 'STUDENT' },
    ]);

    await withServer(database, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'student@oes.test', password: PASSWORD }),
      });
      const body = await response.text();

      expect(response.status).toBe(200);
      expect(JSON.parse(body)).toEqual({
        user: { id: 'user-1', name: 'Ada Student', email: 'student@oes.test', role: 'STUDENT' },
      });
      // PRD §21: never expose password hashes.
      expect(body).not.toContain('passwordHash');
      expect(body).not.toContain('scrypt$');

      const setCookie = response.headers.get('set-cookie');
      expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('SameSite=Strict');
      // Not Secure in the test environment, which runs as NODE_ENV=test.
      expect(setCookie).not.toContain('Secure');
      expect(readSetCookie(setCookie, SESSION_COOKIE_NAME).length).toBeGreaterThan(20);
    });
  });

  it('returns 401 with one generic message for a wrong password', async () => {
    const { database, sessions } = await createFakeDatabase('ok', [{ email: 'student@oes.test' }]);

    await withServer(database, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'student@oes.test', password: 'wrong-password' }),
      });

      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({
        error: { code: 'UNAUTHENTICATED', message: 'Incorrect email or password.' },
      });
      expect(response.headers.get('set-cookie')).toBeNull();
      expect(sessions).toHaveLength(0);
    });
  });

  it('returns the same 401 for an account that does not exist', async () => {
    const { database } = await createFakeDatabase();

    await withServer(database, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'ghost@oes.test', password: PASSWORD }),
      });

      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({
        error: { code: 'UNAUTHENTICATED', message: 'Incorrect email or password.' },
      });
    });
  });

  it('returns 403 for a deactivated account', async () => {
    const { database } = await createFakeDatabase('ok', [
      { email: 'gone@oes.test', status: 'INACTIVE' },
    ]);

    await withServer(database, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'gone@oes.test', password: PASSWORD }),
      });

      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ error: { code: 'FORBIDDEN' } });
    });
  });

  it('rejects a payload that is missing fields', async () => {
    const { database } = await createFakeDatabase();

    await withServer(database, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email' }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    });
  });
});

describe('GET /auth/me', () => {
  it('returns the signed-in user for a valid session cookie', async () => {
    const { database } = await createFakeDatabase('ok', [
      { email: 'admin@oes.test', name: 'Root Admin', role: 'ADMIN' },
    ]);

    await withServer(database, async (baseUrl) => {
      const login = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'admin@oes.test', password: PASSWORD }),
      });
      const token = readSetCookie(login.headers.get('set-cookie'), SESSION_COOKIE_NAME);

      const response = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        user: { id: 'user-1', name: 'Root Admin', email: 'admin@oes.test', role: 'ADMIN' },
      });
    });
  });

  it('returns 401 without a cookie', async () => {
    const { database } = await createFakeDatabase();

    await withServer(database, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/auth/me`);

      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED' } });
    });
  });

  it('returns 401 for a token that was never issued', async () => {
    const { database } = await createFakeDatabase();

    await withServer(database, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { cookie: `${SESSION_COOKIE_NAME}=forged-token` },
      });

      expect(response.status).toBe(401);
    });
  });
});

describe('POST /auth/logout', () => {
  it('revokes the session and clears the cookie', async () => {
    const { database, sessions } = await createFakeDatabase('ok', [{ email: 'student@oes.test' }]);

    await withServer(database, async (baseUrl) => {
      const login = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'student@oes.test', password: PASSWORD }),
      });
      const token = readSetCookie(login.headers.get('set-cookie'), SESSION_COOKIE_NAME);
      const cookie = `${SESSION_COOKIE_NAME}=${token}`;

      const response = await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { cookie },
      });

      expect(response.status).toBe(204);
      expect(response.headers.get('set-cookie')).toContain(`${SESSION_COOKIE_NAME}=`);
      expect(sessions).toHaveLength(0);

      // The token that worked a moment ago must not work any more.
      const afterLogout = await fetch(`${baseUrl}/api/v1/auth/me`, { headers: { cookie } });
      expect(afterLogout.status).toBe(401);
    });
  });

  it('succeeds when signing out without a session', async () => {
    const { database } = await createFakeDatabase();

    await withServer(database, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/auth/logout`, { method: 'POST' });

      expect(response.status).toBe(204);
    });
  });
});
