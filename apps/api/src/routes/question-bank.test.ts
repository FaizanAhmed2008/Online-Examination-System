import type { Server } from 'node:http';

import { describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import { loadEnv } from '../config/env.js';
import type { DatabaseClient } from '../db/prisma.js';
import { SESSION_COOKIE_NAME } from '../lib/cookies.js';
import { hashPassword } from '../lib/password.js';

const testEnv = loadEnv({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/oes',
  LOG_LEVEL: 'silent',
});

const PASSWORD = 'valid-password';
const FUTURE = new Date('2099-01-01T00:00:00.000Z');

type Role = 'STUDENT' | 'FACULTY' | 'ADMIN';

interface UserRow {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

interface SubjectRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

interface QuestionRow {
  id: string;
  subjectId: string;
  createdById: string;
  text: string;
  type: 'SINGLE_CHOICE';
  marks: number;
  explanation: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

interface OptionRow {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
}

/**
 * In-memory stand-in for the whole question-bank surface, so these tests can
 * drive the real router, guards and error handler without a database.
 */
async function createFakeDatabase() {
  const users: UserRow[] = [];
  const subjects: SubjectRow[] = [];
  const questions: QuestionRow[] = [];
  const options: OptionRow[] = [];
  const sessions: { id: string; userId: string; tokenHash: string; expiresAt: Date }[] = [];

  let sequence = 1;
  const nextId = (prefix: string): string => `${prefix}-${sequence++}`;
  const now = new Date('2026-01-01T00:00:00.000Z');

  const database = {
    $queryRaw: async () => [{ '?column?': 1 }],
    user: {
      findUnique: async ({ where }: { where: { email: string } }) =>
        users.find((user) => user.email === where.email) ?? null,
    },
    session: {
      create: async ({ data }: { data: Omit<(typeof sessions)[number], 'id'> }) => {
        const record = { id: nextId('session'), ...data };
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
        const record = sessions.find((candidate) => candidate.id === where.id);
        if (record === undefined) throw new Error('session not found');
        sessions.splice(sessions.indexOf(record), 1);
        return record;
      },
      deleteMany: async ({ where }: { where: { tokenHash: string } }) => {
        const keep = sessions.filter((candidate) => candidate.tokenHash !== where.tokenHash);
        const count = sessions.length - keep.length;
        sessions.length = 0;
        sessions.push(...keep);
        return { count };
      },
    },
    subject: {
      findMany: async ({ where }: { where: { status?: 'ACTIVE' | 'INACTIVE' } } = { where: {} }) =>
        subjects
          .filter((row) => where.status === undefined || row.status === where.status)
          .sort((a, b) => a.name.localeCompare(b.name)),
      findUnique: async ({ where }: { where: { id?: string; code?: string } }) =>
        subjects.find((row) =>
          where.id === undefined ? row.code === where.code : row.id === where.id,
        ) ?? null,
      create: async ({ data }: { data: Partial<SubjectRow> }) => {
        const row: SubjectRow = {
          id: nextId('subject'),
          name: '',
          code: '',
          description: null,
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now,
          ...data,
        } as SubjectRow;
        subjects.push(row);
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<SubjectRow> }) => {
        const index = subjects.findIndex((row) => row.id === where.id);
        const existing = subjects[index];
        if (existing === undefined) throw new Error('subject not found');
        subjects[index] = { ...existing, ...data, updatedAt: now };
        return subjects[index] as SubjectRow;
      },
    },
    question: {
      findMany: async ({
        where,
        include,
        skip,
        take,
      }: {
        where: Record<string, unknown>;
        include?: unknown;
        skip?: number;
        take?: number;
      }) => {
        const matched = questions.filter((row) => matchesQuestion(row, where));
        const start = skip ?? 0;
        return matched
          .slice(start, take === undefined ? undefined : start + take)
          .map((row) => withRelations(row, include !== undefined));
      },
      count: async ({ where }: { where: Record<string, unknown> }) =>
        questions.filter((row) => matchesQuestion(row, where)).length,
      findUnique: async ({ where, include }: { where: { id: string }; include?: unknown }) => {
        const row = questions.find((candidate) => candidate.id === where.id);
        return row === undefined ? null : withRelations(row, include !== undefined);
      },
      create: async ({ data, include }: { data: Record<string, unknown>; include?: unknown }) => {
        const id = nextId('question');
        const row: QuestionRow = {
          id,
          subjectId: String(data['subjectId']),
          createdById: String(data['createdById']),
          text: String(data['text']),
          type: 'SINGLE_CHOICE',
          marks: Number(data['marks']),
          explanation: (data['explanation'] as string | null) ?? null,
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now,
        };
        questions.push(row);
        const created = (data['options'] as { create: { text: string; isCorrect: boolean }[] })
          .create;
        created.forEach((option) =>
          options.push({ id: nextId('option'), questionId: id, ...option }),
        );
        return withRelations(row, include !== undefined);
      },
      update: async ({
        where,
        data,
        include,
      }: {
        where: { id: string };
        data: Record<string, unknown> & {
          options?: {
            deleteMany: Record<string, never>;
            create: { text: string; isCorrect: boolean }[];
          };
        };
        include?: unknown;
      }) => {
        const index = questions.findIndex((row) => row.id === where.id);
        const existing = questions[index];
        if (existing === undefined) throw new Error('question not found');

        const next: QuestionRow = {
          ...existing,
          ...(typeof data['text'] === 'string' ? { text: data['text'] } : {}),
          ...(typeof data['marks'] === 'number' ? { marks: data['marks'] } : {}),
          ...(typeof data['subjectId'] === 'string' ? { subjectId: data['subjectId'] } : {}),
          ...(typeof data['status'] === 'string'
            ? { status: data['status'] as 'ACTIVE' | 'INACTIVE' }
            : {}),
          ...(data['explanation'] !== undefined
            ? { explanation: data['explanation'] as string | null }
            : {}),
          updatedAt: now,
        };
        questions[index] = next;

        if (data['options'] !== undefined) {
          for (let i = options.length - 1; i >= 0; i -= 1) {
            if (options[i]?.questionId === where.id) options.splice(i, 1);
          }
          data['options'].create.forEach((option) =>
            options.push({ id: nextId('option'), questionId: where.id, ...option }),
          );
        }

        return withRelations(next, include !== undefined);
      },
    },
  } as unknown as DatabaseClient;

  function withRelations(row: QuestionRow, withSubject: boolean) {
    const subject = subjects.find((candidate) => candidate.id === row.subjectId) ?? null;

    return {
      ...row,
      ...(withSubject ? { subject } : {}),
      ...(withSubject
        ? {
            options: options
              .filter((option) => option.questionId === row.id)
              .sort((a, b) => a.id.localeCompare(b.id)),
          }
        : {}),
    };
  }

  function matchesQuestion(row: QuestionRow, where: Record<string, unknown>): boolean {
    if (typeof where['createdById'] === 'string' && row.createdById !== where['createdById']) {
      return false;
    }
    if (typeof where['status'] === 'string' && row.status !== where['status']) {
      return false;
    }
    if (typeof where['subjectId'] === 'string' && row.subjectId !== where['subjectId']) {
      return false;
    }
    const text = where['text'];
    if (typeof text === 'object' && text !== null) {
      const needle = String((text as { contains: string }).contains).toLowerCase();
      return row.text.toLowerCase().includes(needle);
    }
    return true;
  }

  async function addUser(role: Role, email: string): Promise<UserRow> {
    const user: UserRow = {
      id: nextId('user'),
      name: `${role} user`,
      email,
      passwordHash: await hashPassword(PASSWORD),
      role,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };
    users.push(user);
    return user;
  }

  async function addSubject(name: string, code: string): Promise<SubjectRow> {
    const row: SubjectRow = {
      id: nextId('subject'),
      name,
      code,
      description: null,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };
    subjects.push(row);
    return row;
  }

  return { database, users, subjects, questions, options, addUser, addSubject };
}

async function withServer(database: DatabaseClient, run: (baseUrl: string) => Promise<void>) {
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

/** Signs in for real, so the cookie under test is the one the server issued. */
async function signIn(baseUrl: string, email: string): Promise<string> {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });

  if (response.status !== 200) {
    throw new Error(`Expected login to succeed, received ${response.status}.`);
  }

  const setCookie = response.headers.get('set-cookie');
  if (setCookie === null) {
    throw new Error('Expected a session cookie.');
  }

  return `${SESSION_COOKIE_NAME}=${setCookie.split(';')[0]!.split('=')[1]!}`;
}

function api(
  baseUrl: string,
  path: string,
  { method = 'GET', cookie, body }: { method?: string; cookie?: string; body?: unknown } = {},
) {
  return fetch(`${baseUrl}/api/v1${path}`, {
    method,
    headers: {
      ...(cookie === undefined ? {} : { cookie }),
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function validQuestion(subjectId: string, overrides: Record<string, unknown> = {}) {
  return {
    subjectId,
    text: 'Which scheduling algorithm can starve a process?',
    type: 'SINGLE_CHOICE',
    marks: 2,
    explanation: null,
    options: [
      { text: 'Round robin', isCorrect: false },
      { text: 'Priority scheduling', isCorrect: true },
    ],
    ...overrides,
  };
}

describe('subject endpoints', () => {
  it('lets faculty read the subject list', async () => {
    const { database, addUser } = await createFakeDatabase();
    await addUser('FACULTY', 'faculty@oes.test');

    await withServer(database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const response = await api(baseUrl, '/subjects', { cookie });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ items: [] });
    });
  });

  it('stops faculty from creating a subject', async () => {
    const { database, addUser } = await createFakeDatabase();
    await addUser('FACULTY', 'faculty@oes.test');

    await withServer(database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const response = await api(baseUrl, '/subjects', {
        method: 'POST',
        cookie,
        body: { name: 'Operating Systems', code: 'CS204', description: null },
      });

      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ error: { code: 'FORBIDDEN' } });
    });
  });

  it('lets admin create a subject and rejects a duplicate code', async () => {
    const { database, addUser, subjects } = await createFakeDatabase();
    await addUser('ADMIN', 'admin@oes.test');

    await withServer(database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'admin@oes.test');
      const created = await api(baseUrl, '/subjects', {
        method: 'POST',
        cookie,
        body: { name: 'Operating Systems', code: 'cs204', description: null },
      });

      expect(created.status).toBe(201);
      expect(await created.json()).toMatchObject({ code: 'CS204', status: 'ACTIVE' });

      const duplicate = await api(baseUrl, '/subjects', {
        method: 'POST',
        cookie,
        body: { name: 'Networks', code: 'CS204', description: null },
      });

      expect(duplicate.status).toBe(409);
      expect(subjects).toHaveLength(1);
    });
  });

  it('rejects an invalid subject payload with field detail', async () => {
    const { database, addUser } = await createFakeDatabase();
    await addUser('ADMIN', 'admin@oes.test');

    await withServer(database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'admin@oes.test');
      const response = await api(baseUrl, '/subjects', {
        method: 'POST',
        cookie,
        body: { name: '', code: '' },
      });

      expect(response.status).toBe(400);
      const body = (await response.json()) as {
        error: { code: string; details: { path: string }[] };
      };
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details.map((detail) => detail.path).sort()).toEqual(['code', 'name']);
    });
  });

  it('requires a session', async () => {
    const { database } = await createFakeDatabase();

    await withServer(database, async (baseUrl) => {
      const response = await api(baseUrl, '/subjects');

      expect(response.status).toBe(401);
    });
  });
});

describe('question endpoints', () => {
  async function seedSubject(fixture: Awaited<ReturnType<typeof createFakeDatabase>>) {
    return fixture.addSubject('Operating Systems', 'CS204');
  }

  it('refuses an anonymous caller', async () => {
    const { database } = await createFakeDatabase();

    await withServer(database, async (baseUrl) => {
      expect((await api(baseUrl, '/questions')).status).toBe(401);
    });
  });

  it('refuses a student with 403, not 401', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('STUDENT', 'student@oes.test');

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'student@oes.test');
      const response = await api(baseUrl, '/questions', { cookie });

      expect(response.status).toBe(403);
    });
  });

  it('refuses an admin, since question authoring is faculty-only', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('ADMIN', 'admin@oes.test');

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'admin@oes.test');
      expect((await api(baseUrl, '/questions', { cookie })).status).toBe(403);
    });
  });

  it('creates a question owned by the signed-in faculty member', async () => {
    const fixture = await createFakeDatabase();
    const user = await fixture.addUser('FACULTY', 'faculty@oes.test');
    const subject = await seedSubject(fixture);

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const response = await api(baseUrl, '/questions', {
        method: 'POST',
        cookie,
        body: validQuestion(subject.id),
      });

      expect(response.status).toBe(201);
      const body = (await response.json()) as { id: string; options: { isCorrect: boolean }[] };
      expect(body.options.filter((option) => option.isCorrect)).toHaveLength(1);

      const stored = fixture.questions[0];
      expect(stored?.createdById).toBe(user.id);
    });
  });

  it('rejects a question with two correct options', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'faculty@oes.test');
    const subject = await seedSubject(fixture);

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const response = await api(baseUrl, '/questions', {
        method: 'POST',
        cookie,
        body: validQuestion(subject.id, {
          options: [
            { text: 'Round robin', isCorrect: true },
            { text: 'Priority scheduling', isCorrect: true },
          ],
        }),
      });

      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: { details: { path: string }[] } };
      expect(body.error.details[0]?.path).toBe('options');
      expect(fixture.questions).toHaveLength(0);
    });
  });

  it('rejects a question with no correct option', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'faculty@oes.test');
    const subject = await seedSubject(fixture);

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const response = await api(baseUrl, '/questions', {
        method: 'POST',
        cookie,
        body: validQuestion(subject.id, {
          options: [
            { text: 'Round robin', isCorrect: false },
            { text: 'Priority scheduling', isCorrect: false },
          ],
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  it('rejects a question with fewer than two options', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'faculty@oes.test');
    const subject = await seedSubject(fixture);

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const response = await api(baseUrl, '/questions', {
        method: 'POST',
        cookie,
        body: validQuestion(subject.id, {
          options: [{ text: 'Only one', isCorrect: true }],
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  it('rejects non-positive marks', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'faculty@oes.test');
    const subject = await seedSubject(fixture);

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const response = await api(baseUrl, '/questions', {
        method: 'POST',
        cookie,
        body: validQuestion(subject.id, { marks: 0 }),
      });

      expect(response.status).toBe(400);
    });
  });

  it('only ever lists the caller’s own questions', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'one@oes.test');
    await fixture.addUser('FACULTY', 'two@oes.test');
    const subject = await seedSubject(fixture);

    await withServer(fixture.database, async (baseUrl) => {
      const first = await signIn(baseUrl, 'one@oes.test');
      const second = await signIn(baseUrl, 'two@oes.test');

      await api(baseUrl, '/questions', {
        method: 'POST',
        cookie: first,
        body: validQuestion(subject.id, { text: 'Mine: deadlock' }),
      });
      await api(baseUrl, '/questions', {
        method: 'POST',
        cookie: second,
        body: validQuestion(subject.id, { text: 'Theirs: race condition' }),
      });

      const mine = await api(baseUrl, '/questions', { cookie: first });
      const body = (await mine.json()) as { items: { text: string }[]; total: number };

      expect(body.total).toBe(1);
      expect(body.items[0]?.text).toBe('Mine: deadlock');
    });
  });

  it('filters by search text and by subject', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'faculty@oes.test');
    const subject = await seedSubject(fixture);
    const other = await fixture.addSubject('Networks', 'CS305');

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      await api(baseUrl, '/questions', {
        method: 'POST',
        cookie,
        body: validQuestion(subject.id, { text: 'What causes a deadlock?' }),
      });
      await api(baseUrl, '/questions', {
        method: 'POST',
        cookie,
        body: validQuestion(other.id, { text: 'What is a subnet mask?' }),
      });

      const searched = (await (await api(baseUrl, '/questions?q=deadlock', { cookie })).json()) as {
        total: number;
      };
      const bySubject = (await (
        await api(baseUrl, `/questions?subjectId=${other.id}`, { cookie })
      ).json()) as { items: { text: string }[]; total: number };

      expect(searched.total).toBe(1);
      expect(bySubject.total).toBe(1);
      expect(bySubject.items[0]?.text).toBe('What is a subnet mask?');
    });
  });

  it('rejects a malformed filter', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'faculty@oes.test');

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const response = await api(baseUrl, '/questions?pageSize=9999', { cookie });

      expect(response.status).toBe(400);
    });
  });

  it('edits the caller’s own question', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'faculty@oes.test');
    const subject = await seedSubject(fixture);

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const created = (await (
        await api(baseUrl, '/questions', {
          method: 'POST',
          cookie,
          body: validQuestion(subject.id),
        })
      ).json()) as { id: string };

      const response = await api(baseUrl, `/questions/${created.id}`, {
        method: 'PATCH',
        cookie,
        body: { marks: 5, text: 'Which algorithm can starve a process?' },
      });

      expect(response.status).toBe(200);
      const body = (await response.json()) as { marks: number; text: string; options: unknown[] };
      expect(body.marks).toBe(5);
      expect(body.text).toBe('Which algorithm can starve a process?');
      expect(body.options).toHaveLength(2);
    });
  });

  it('hides another author’s question behind a 404 on read, edit and delete', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'owner@oes.test');
    await fixture.addUser('FACULTY', 'other@oes.test');
    const subject = await seedSubject(fixture);

    await withServer(fixture.database, async (baseUrl) => {
      const owner = await signIn(baseUrl, 'owner@oes.test');
      const other = await signIn(baseUrl, 'other@oes.test');

      const created = (await (
        await api(baseUrl, '/questions', {
          method: 'POST',
          cookie: owner,
          body: validQuestion(subject.id),
        })
      ).json()) as { id: string };

      for (const [method, body] of [
        ['GET', undefined],
        ['PATCH', { marks: 9 }],
        ['DELETE', undefined],
      ] as const) {
        const response = await api(baseUrl, `/questions/${created.id}`, {
          method,
          cookie: other,
          body,
        });
        expect(response.status).toBe(404);
      }

      // Untouched: the failed delete must not have archived it.
      expect(fixture.questions[0]?.status).toBe('ACTIVE');
    });
  });

  it('archives on delete and drops it from the list', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'faculty@oes.test');
    const subject = await seedSubject(fixture);

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const created = (await (
        await api(baseUrl, '/questions', {
          method: 'POST',
          cookie,
          body: validQuestion(subject.id),
        })
      ).json()) as { id: string };

      const deleted = await api(baseUrl, `/questions/${created.id}`, { method: 'DELETE', cookie });
      expect(deleted.status).toBe(200);
      expect(await deleted.json()).toMatchObject({ status: 'INACTIVE' });

      const list = (await (await api(baseUrl, '/questions', { cookie })).json()) as {
        total: number;
      };
      expect(list.total).toBe(0);
      // Archived, not destroyed: the row survives for any future exam.
      expect(fixture.questions).toHaveLength(1);
    });
  });

  it('lets an admin archive a subject but not touch questions', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('ADMIN', 'admin@oes.test');
    const subject = await seedSubject(fixture);

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'admin@oes.test');

      const archived = await api(baseUrl, `/subjects/${subject.id}`, { method: 'DELETE', cookie });
      expect(archived.status).toBe(200);
      expect(await archived.json()).toMatchObject({ status: 'INACTIVE' });

      expect((await api(baseUrl, '/questions', { cookie })).status).toBe(403);
    });
  });

  it('rejects creating a question against an archived subject', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('ADMIN', 'admin@oes.test');
    await fixture.addUser('FACULTY', 'faculty@oes.test');
    const subject = await seedSubject(fixture);

    await withServer(fixture.database, async (baseUrl) => {
      const admin = await signIn(baseUrl, 'admin@oes.test');
      await api(baseUrl, `/subjects/${subject.id}`, { method: 'DELETE', cookie: admin });

      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const response = await api(baseUrl, '/questions', {
        method: 'POST',
        cookie,
        body: validQuestion(subject.id),
      });

      expect(response.status).toBe(400);
    });
  });
});
