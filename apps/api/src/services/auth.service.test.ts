import { describe, expect, it } from 'vitest';

import { UserStatus, type Role } from '../generated/prisma/client.js';
import type { DatabaseClient } from '../db/prisma.js';
import { hashPassword } from '../lib/password.js';
import { hashSessionToken } from '../lib/session-token.js';
import { login, resolveSession, revokeSession } from './auth.service.js';

const SESSION_TTL_MS = 60 * 60 * 1000;

interface FakeUserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
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
  users: FakeUserRecord[];
  sessions: FakeSessionRecord[];
}

/** In-memory stand-in for the `user` and `session` delegates. */
function fakeDatabase(users: FakeUserRecord[]): FakeDatabase {
  const sessions: FakeSessionRecord[] = [];
  let nextId = 1;

  const database = {
    user: {
      findUnique: async ({ where }: { where: { email: string } }) =>
        users.find((user) => user.email === where.email) ?? null,
    },
    session: {
      create: async ({ data }: { data: Omit<FakeSessionRecord, 'id'> }) => {
        const record: FakeSessionRecord = { id: `session-${nextId++}`, ...data };
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

  return { database, users, sessions };
}

async function seedUser(
  users: FakeUserRecord[],
  overrides: Partial<FakeUserRecord> & { password: string },
): Promise<FakeUserRecord> {
  const { password, ...rest } = overrides;
  const record: FakeUserRecord = {
    id: rest.id ?? `user-${users.length + 1}`,
    name: rest.name ?? 'Test Person',
    email: rest.email ?? `user${users.length + 1}@oes.test`,
    passwordHash: await hashPassword(password),
    role: rest.role ?? 'STUDENT',
    status: rest.status ?? 'ACTIVE',
  };
  users.push(record);
  return record;
}

describe('login', () => {
  it('returns the user and a session token for correct credentials', async () => {
    const users: FakeUserRecord[] = [];
    await seedUser(users, { email: 'student@oes.test', password: 'valid-password' });
    const { database, sessions } = fakeDatabase(users);

    const result = await login(
      { email: 'student@oes.test', password: 'valid-password' },
      { database, sessionTtlMs: SESSION_TTL_MS },
    );

    expect(result.user).toEqual({
      id: 'user-1',
      name: 'Test Person',
      email: 'student@oes.test',
      role: 'STUDENT',
    });
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.token).not.toBe('');
    expect(sessions).toHaveLength(1);
  });

  it('stores only a hash of the token, never the token itself', async () => {
    const users: FakeUserRecord[] = [];
    await seedUser(users, { email: 'student@oes.test', password: 'valid-password' });
    const { database, sessions } = fakeDatabase(users);

    const result = await login(
      { email: 'student@oes.test', password: 'valid-password' },
      { database, sessionTtlMs: SESSION_TTL_MS },
    );

    expect(sessions[0]?.tokenHash).toBe(hashSessionToken(result.token));
    expect(sessions[0]?.tokenHash).not.toBe(result.token);
  });

  it('matches the email case-insensitively', async () => {
    const users: FakeUserRecord[] = [];
    await seedUser(users, { email: 'student@oes.test', password: 'valid-password' });
    const { database } = fakeDatabase(users);

    const result = await login(
      { email: '  Student@OES.Test ', password: 'valid-password' },
      { database, sessionTtlMs: SESSION_TTL_MS },
    );

    expect(result.user.email).toBe('student@oes.test');
  });

  it('rejects a wrong password without creating a session', async () => {
    const users: FakeUserRecord[] = [];
    await seedUser(users, { email: 'student@oes.test', password: 'valid-password' });
    const { database, sessions } = fakeDatabase(users);

    await expect(
      login(
        { email: 'student@oes.test', password: 'wrong' },
        { database, sessionTtlMs: SESSION_TTL_MS },
      ),
    ).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
    expect(sessions).toHaveLength(0);
  });

  it('gives an unknown account the same generic failure as a wrong password', async () => {
    const { database } = fakeDatabase([]);

    await expect(
      login(
        { email: 'ghost@oes.test', password: 'anything' },
        { database, sessionTtlMs: SESSION_TTL_MS },
      ),
    ).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHENTICATED',
      message: 'Incorrect email or password.',
    });
  });

  it('refuses a deactivated user with a clear reason', async () => {
    const users: FakeUserRecord[] = [];
    await seedUser(users, {
      email: 'inactive@oes.test',
      password: 'valid-password',
      status: 'INACTIVE',
    });
    const { database, sessions } = fakeDatabase(users);

    await expect(
      login(
        { email: 'inactive@oes.test', password: 'valid-password' },
        { database, sessionTtlMs: SESSION_TTL_MS },
      ),
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    expect(sessions).toHaveLength(0);
  });

  it('sets the expiry from the injected clock', async () => {
    const users: FakeUserRecord[] = [];
    await seedUser(users, { email: 'student@oes.test', password: 'valid-password' });
    const { database, sessions } = fakeDatabase(users);
    const now = new Date('2026-01-01T10:00:00.000Z');

    await login(
      { email: 'student@oes.test', password: 'valid-password' },
      { database, sessionTtlMs: SESSION_TTL_MS, now: () => now },
    );

    expect(sessions[0]?.expiresAt.toISOString()).toBe('2026-01-01T11:00:00.000Z');
  });
});

describe('resolveSession', () => {
  it('resolves a live token to the user', async () => {
    const users: FakeUserRecord[] = [];
    await seedUser(users, {
      email: 'faculty@oes.test',
      password: 'valid-password',
      role: 'FACULTY',
    });
    const { database } = fakeDatabase(users);

    const { token } = await login(
      { email: 'faculty@oes.test', password: 'valid-password' },
      { database, sessionTtlMs: SESSION_TTL_MS },
    );

    const user = await resolveSession(token, { database });

    expect(user).toEqual({
      id: 'user-1',
      name: 'Test Person',
      email: 'faculty@oes.test',
      role: 'FACULTY',
    });
  });

  it('returns null for a missing or unknown token', async () => {
    const { database } = fakeDatabase([]);

    await expect(resolveSession(undefined, { database })).resolves.toBeNull();
    await expect(resolveSession('', { database })).resolves.toBeNull();
    await expect(resolveSession('made-up-token', { database })).resolves.toBeNull();
  });

  it('rejects and cleans up an expired session', async () => {
    const users: FakeUserRecord[] = [];
    await seedUser(users, { email: 'student@oes.test', password: 'valid-password' });
    const { database, sessions } = fakeDatabase(users);
    const issuedAt = new Date('2026-01-01T10:00:00.000Z');

    const { token } = await login(
      { email: 'student@oes.test', password: 'valid-password' },
      { database, sessionTtlMs: SESSION_TTL_MS, now: () => issuedAt },
    );

    const afterExpiry = new Date('2026-01-01T12:00:00.000Z');

    await expect(resolveSession(token, { database, now: () => afterExpiry })).resolves.toBeNull();
    expect(sessions).toHaveLength(0);
  });

  it('invalidates the session of a user who was deactivated after signing in', async () => {
    const users: FakeUserRecord[] = [];
    const user = await seedUser(users, { email: 'student@oes.test', password: 'valid-password' });
    const { database } = fakeDatabase(users);

    const { token } = await login(
      { email: 'student@oes.test', password: 'valid-password' },
      { database, sessionTtlMs: SESSION_TTL_MS },
    );

    user.status = UserStatus.INACTIVE;

    await expect(resolveSession(token, { database })).resolves.toBeNull();
  });
});

describe('revokeSession', () => {
  it('ends the session immediately', async () => {
    const users: FakeUserRecord[] = [];
    await seedUser(users, { email: 'student@oes.test', password: 'valid-password' });
    const { database } = fakeDatabase(users);

    const { token } = await login(
      { email: 'student@oes.test', password: 'valid-password' },
      { database, sessionTtlMs: SESSION_TTL_MS },
    );

    await revokeSession(token, { database });

    await expect(resolveSession(token, { database })).resolves.toBeNull();
  });

  it('is a no-op for a token that was never issued', async () => {
    const { database, sessions } = fakeDatabase([]);

    await expect(revokeSession(undefined, { database })).resolves.toBeUndefined();
    await expect(revokeSession('unknown', { database })).resolves.toBeUndefined();
    expect(sessions).toHaveLength(0);
  });
});
