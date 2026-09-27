import { describe, expect, it } from 'vitest';

import { api, createFakeDatabase, signIn, withServer } from '../test/fake-database.js';

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
