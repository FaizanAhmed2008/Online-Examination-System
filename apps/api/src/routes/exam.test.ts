import { describe, expect, it } from 'vitest';

import { api, createFakeDatabase, signIn, withServer } from '../test/fake-database.js';

function validExam(subjectId: string, overrides: Record<string, unknown> = {}) {
  return {
    subjectId,
    title: 'Operating Systems Mid-term',
    instructions: 'Answer every question.',
    durationMinutes: 45,
    questionIds: [],
    ...overrides,
  };
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

/** Creates a real question through the API so it lands in the fixture. */
async function createQuestion(
  baseUrl: string,
  cookie: string,
  subjectId: string,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; marks: number }> {
  const response = await api(baseUrl, '/questions', {
    method: 'POST',
    cookie,
    body: validQuestion(subjectId, overrides),
  });

  if (response.status !== 201) {
    throw new Error(`Expected the question to be created, received ${response.status}.`);
  }

  return (await response.json()) as { id: string; marks: number };
}

describe('exam endpoints', () => {
  it('refuses an anonymous caller', async () => {
    const { database } = await createFakeDatabase();

    await withServer(database, async (baseUrl) => {
      expect((await api(baseUrl, '/exams')).status).toBe(401);
    });
  });

  it('refuses a student with 403, not 401', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('STUDENT', 'student@oes.test');

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'student@oes.test');
      expect((await api(baseUrl, '/exams', { cookie })).status).toBe(403);
    });
  });

  it('refuses an admin, since exam authoring is faculty-only', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('ADMIN', 'admin@oes.test');

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'admin@oes.test');
      expect((await api(baseUrl, '/exams', { cookie })).status).toBe(403);
    });
  });

  it('creates a draft owned by the signed-in faculty member', async () => {
    const fixture = await createFakeDatabase();
    const user = await fixture.addUser('FACULTY', 'faculty@oes.test');
    const subject = await fixture.addSubject('Operating Systems', 'CS204');

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const response = await api(baseUrl, '/exams', {
        method: 'POST',
        cookie,
        body: validExam(subject.id),
      });

      expect(response.status).toBe(201);
      const body = (await response.json()) as {
        status: string;
        totalMarks: number;
        questionCount: number;
      };

      // A new exam is a draft, and an empty paper totals nothing.
      expect(body.status).toBe('DRAFT');
      expect(body.totalMarks).toBe(0);
      expect(body.questionCount).toBe(0);
      expect(fixture.exams[0]?.createdById).toBe(user.id);
    });
  });

  it('copies question marks and preserves the order they were sent in', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'faculty@oes.test');
    const subject = await fixture.addSubject('Operating Systems', 'CS204');

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const first = await createQuestion(baseUrl, cookie, subject.id, { marks: 2 });
      const second = await createQuestion(baseUrl, cookie, subject.id, {
        marks: 5,
        text: 'What is a deadlock?',
      });

      const response = await api(baseUrl, '/exams', {
        method: 'POST',
        cookie,
        body: validExam(subject.id, { questionIds: [second.id, first.id] }),
      });

      expect(response.status).toBe(201);
      const body = (await response.json()) as {
        totalMarks: number;
        questions: {
          questionId: string;
          position: number;
          marks: number;
          question: { text: string };
        }[];
      };

      expect(body.totalMarks).toBe(7);
      expect(body.questions.map((entry) => entry.position)).toEqual([0, 1]);
      expect(body.questions[0]?.questionId).toBe(second.id);
      expect(body.questions[0]?.marks).toBe(5);
      expect(body.questions[1]?.marks).toBe(2);
    });
  });

  it('rejects a question owned by another lecturer', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'one@oes.test');
    await fixture.addUser('FACULTY', 'two@oes.test');
    const subject = await fixture.addSubject('Operating Systems', 'CS204');

    await withServer(fixture.database, async (baseUrl) => {
      const other = await signIn(baseUrl, 'two@oes.test');
      const theirs = await createQuestion(baseUrl, other, subject.id);

      const mine = await signIn(baseUrl, 'one@oes.test');
      const response = await api(baseUrl, '/exams', {
        method: 'POST',
        cookie: mine,
        body: validExam(subject.id, { questionIds: [theirs.id] }),
      });

      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: { details: { path: string }[] } };
      expect(body.error.details[0]?.path).toBe('questionIds');
      expect(fixture.exams).toHaveLength(0);
    });
  });

  it('rejects the same question twice', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'faculty@oes.test');
    const subject = await fixture.addSubject('Operating Systems', 'CS204');

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const question = await createQuestion(baseUrl, cookie, subject.id);
      const response = await api(baseUrl, '/exams', {
        method: 'POST',
        cookie,
        body: validExam(subject.id, { questionIds: [question.id, question.id] }),
      });

      expect(response.status).toBe(400);
    });
  });

  it('rejects a duration outside the allowed range', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'faculty@oes.test');
    const subject = await fixture.addSubject('Operating Systems', 'CS204');

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const response = await api(baseUrl, '/exams', {
        method: 'POST',
        cookie,
        body: validExam(subject.id, { durationMinutes: 1 }),
      });

      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: { details: { path: string }[] } };
      expect(body.error.details[0]?.path).toBe('durationMinutes');
    });
  });

  it('rejects an update with no fields at all', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'faculty@oes.test');
    const subject = await fixture.addSubject('Operating Systems', 'CS204');

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const created = (await (
        await api(baseUrl, '/exams', { method: 'POST', cookie, body: validExam(subject.id) })
      ).json()) as { id: string };

      const response = await api(baseUrl, `/exams/${created.id}`, {
        method: 'PATCH',
        cookie,
        body: {},
      });

      expect(response.status).toBe(400);
    });
  });

  it('edits a draft and replaces the paper wholesale', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'faculty@oes.test');
    const subject = await fixture.addSubject('Operating Systems', 'CS204');

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const first = await createQuestion(baseUrl, cookie, subject.id, { marks: 2 });
      const second = await createQuestion(baseUrl, cookie, subject.id, {
        marks: 5,
        text: 'What is a deadlock?',
      });
      const created = (await (
        await api(baseUrl, '/exams', {
          method: 'POST',
          cookie,
          body: validExam(subject.id, { questionIds: [first.id, second.id] }),
        })
      ).json()) as { id: string };

      const response = await api(baseUrl, `/exams/${created.id}`, {
        method: 'PATCH',
        cookie,
        body: { title: 'Operating Systems Final', questionIds: [second.id] },
      });

      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        title: string;
        totalMarks: number;
        questionCount: number;
        questions: { questionId: string }[];
      };

      expect(body.title).toBe('Operating Systems Final');
      expect(body.questionCount).toBe(1);
      expect(body.totalMarks).toBe(5);
      // The dropped question leaves no orphan row behind.
      expect(fixture.examQuestions).toHaveLength(1);
    });
  });

  it('publishes a draft that has at least one question', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'faculty@oes.test');
    const subject = await fixture.addSubject('Operating Systems', 'CS204');

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const question = await createQuestion(baseUrl, cookie, subject.id);
      const created = (await (
        await api(baseUrl, '/exams', {
          method: 'POST',
          cookie,
          body: validExam(subject.id, { questionIds: [question.id] }),
        })
      ).json()) as { id: string };

      const response = await api(baseUrl, `/exams/${created.id}/publish`, {
        method: 'POST',
        cookie,
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ status: 'PUBLISHED' });
    });
  });

  it('refuses to publish an empty paper, and explains why', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'faculty@oes.test');
    const subject = await fixture.addSubject('Operating Systems', 'CS204');

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const created = (await (
        await api(baseUrl, '/exams', { method: 'POST', cookie, body: validExam(subject.id) })
      ).json()) as { id: string };

      const response = await api(baseUrl, `/exams/${created.id}/publish`, {
        method: 'POST',
        cookie,
      });

      expect(response.status).toBe(400);
      const body = (await response.json()) as {
        error: { details: { path: string; message: string }[] };
      };
      expect(body.error.details[0]?.path).toBe('questions');
      expect(body.error.details[0]?.message).toMatch(/at least one question/i);
      expect(fixture.exams[0]?.status).toBe('DRAFT');
    });
  });

  it('refuses to publish an exam that is already published', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'faculty@oes.test');
    const subject = await fixture.addSubject('Operating Systems', 'CS204');

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const question = await createQuestion(baseUrl, cookie, subject.id);
      const created = (await (
        await api(baseUrl, '/exams', {
          method: 'POST',
          cookie,
          body: validExam(subject.id, { questionIds: [question.id] }),
        })
      ).json()) as { id: string };
      await api(baseUrl, `/exams/${created.id}/publish`, { method: 'POST', cookie });

      const again = await api(baseUrl, `/exams/${created.id}/publish`, { method: 'POST', cookie });
      expect(again.status).toBe(409);
    });
  });

  it('locks a published exam against editing and deletion', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'faculty@oes.test');
    const subject = await fixture.addSubject('Operating Systems', 'CS204');

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const question = await createQuestion(baseUrl, cookie, subject.id);
      const created = (await (
        await api(baseUrl, '/exams', {
          method: 'POST',
          cookie,
          body: validExam(subject.id, { questionIds: [question.id] }),
        })
      ).json()) as { id: string };
      await api(baseUrl, `/exams/${created.id}/publish`, { method: 'POST', cookie });

      const edited = await api(baseUrl, `/exams/${created.id}`, {
        method: 'PATCH',
        cookie,
        body: { title: 'Renamed behind the scenes' },
      });
      const deleted = await api(baseUrl, `/exams/${created.id}`, { method: 'DELETE', cookie });

      expect(edited.status).toBe(409);
      expect(deleted.status).toBe(409);
      expect(fixture.exams).toHaveLength(1);
    });
  });

  it('unpublishes back to an editable draft', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'faculty@oes.test');
    const subject = await fixture.addSubject('Operating Systems', 'CS204');

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const question = await createQuestion(baseUrl, cookie, subject.id);
      const created = (await (
        await api(baseUrl, '/exams', {
          method: 'POST',
          cookie,
          body: validExam(subject.id, { questionIds: [question.id] }),
        })
      ).json()) as { id: string };
      await api(baseUrl, `/exams/${created.id}/publish`, { method: 'POST', cookie });

      const response = await api(baseUrl, `/exams/${created.id}/unpublish`, {
        method: 'POST',
        cookie,
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ status: 'DRAFT' });

      const edited = await api(baseUrl, `/exams/${created.id}`, {
        method: 'PATCH',
        cookie,
        body: { title: 'Edited after unpublishing' },
      });
      expect(edited.status).toBe(200);
    });
  });

  it('deletes a draft outright', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'faculty@oes.test');
    const subject = await fixture.addSubject('Operating Systems', 'CS204');

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const created = (await (
        await api(baseUrl, '/exams', { method: 'POST', cookie, body: validExam(subject.id) })
      ).json()) as { id: string };

      const response = await api(baseUrl, `/exams/${created.id}`, { method: 'DELETE', cookie });

      expect(response.status).toBe(204);
      expect(fixture.exams).toHaveLength(0);
      // The join rows go with it, so no orphan is left pointing at a dead exam.
      expect(fixture.examQuestions).toHaveLength(0);
    });
  });

  it('hides another lecturer’s exam behind a 404 on read, edit and delete', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'owner@oes.test');
    await fixture.addUser('FACULTY', 'other@oes.test');
    const subject = await fixture.addSubject('Operating Systems', 'CS204');

    await withServer(fixture.database, async (baseUrl) => {
      const owner = await signIn(baseUrl, 'owner@oes.test');
      const question = await createQuestion(baseUrl, owner, subject.id);
      const created = (await (
        await api(baseUrl, '/exams', {
          method: 'POST',
          cookie: owner,
          body: validExam(subject.id, { questionIds: [question.id] }),
        })
      ).json()) as { id: string };

      const other = await signIn(baseUrl, 'other@oes.test');
      for (const [method, body] of [
        ['GET', undefined],
        ['PATCH', { title: 'Not yours' }],
        ['DELETE', undefined],
        ['POST', undefined],
      ] as const) {
        const path = method === 'POST' ? `/exams/${created.id}/publish` : `/exams/${created.id}`;
        const response = await api(baseUrl, path, { method, cookie: other, body });
        expect(response.status).toBe(404);
      }

      expect(fixture.exams[0]?.title).toBe('Operating Systems Mid-term');
    });
  });

  it('never lists another lecturer’s exams', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'one@oes.test');
    await fixture.addUser('FACULTY', 'two@oes.test');
    const subject = await fixture.addSubject('Operating Systems', 'CS204');

    await withServer(fixture.database, async (baseUrl) => {
      const second = await signIn(baseUrl, 'two@oes.test');
      const question = await createQuestion(baseUrl, second, subject.id);
      await api(baseUrl, '/exams', {
        method: 'POST',
        cookie: second,
        body: validExam(subject.id, { questionIds: [question.id] }),
      });

      const first = await signIn(baseUrl, 'one@oes.test');
      const body = (await (await api(baseUrl, '/exams', { cookie: first })).json()) as {
        total: number;
      };

      expect(body.total).toBe(0);
    });
  });

  it('filters the list by status', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'faculty@oes.test');
    const subject = await fixture.addSubject('Operating Systems', 'CS204');

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const question = await createQuestion(baseUrl, cookie, subject.id);
      const published = (await (
        await api(baseUrl, '/exams', {
          method: 'POST',
          cookie,
          body: validExam(subject.id, { questionIds: [question.id] }),
        })
      ).json()) as { id: string };
      await api(baseUrl, `/exams/${published.id}/publish`, { method: 'POST', cookie });
      await api(baseUrl, '/exams', {
        method: 'POST',
        cookie,
        body: validExam(subject.id, { title: 'Networks Quiz' }),
      });

      const drafts = (await (await api(baseUrl, '/exams?status=DRAFT', { cookie })).json()) as {
        items: { title: string }[];
        total: number;
      };
      const live = (await (await api(baseUrl, '/exams?status=PUBLISHED', { cookie })).json()) as {
        items: { title: string }[];
        total: number;
      };

      expect(drafts.total).toBe(1);
      expect(drafts.items[0]?.title).toBe('Networks Quiz');
      expect(live.total).toBe(1);
      expect(live.items[0]?.title).toBe('Operating Systems Mid-term');
    });
  });

  it('rejects an unknown status filter', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'faculty@oes.test');

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const response = await api(baseUrl, '/exams?status=SAT', { cookie });
      expect(response.status).toBe(400);
    });
  });

  it('rejects a question from a different subject than the exam', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'faculty@oes.test');
    const subject = await fixture.addSubject('Operating Systems', 'CS204');
    const other = await fixture.addSubject('Networks', 'CS305');

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const networking = await createQuestion(baseUrl, cookie, other.id, {
        text: 'What is a subnet mask?',
      });

      const response = await api(baseUrl, '/exams', {
        method: 'POST',
        cookie,
        body: validExam(subject.id, { questionIds: [networking.id] }),
      });

      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: { details: { path: string }[] } };
      expect(body.error.details[0]?.path).toBe('questionIds');
      expect(fixture.exams).toHaveLength(0);
    });
  });

  it('rejects a subject change that would disagree with the existing paper', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('FACULTY', 'faculty@oes.test');
    const subject = await fixture.addSubject('Operating Systems', 'CS204');
    const other = await fixture.addSubject('Networks', 'CS305');

    await withServer(fixture.database, async (baseUrl) => {
      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const question = await createQuestion(baseUrl, cookie, subject.id);
      const created = (await (
        await api(baseUrl, '/exams', {
          method: 'POST',
          cookie,
          body: validExam(subject.id, { questionIds: [question.id] }),
        })
      ).json()) as { id: string };

      const response = await api(baseUrl, `/exams/${created.id}`, {
        method: 'PATCH',
        cookie,
        body: { subjectId: other.id },
      });

      expect(response.status).toBe(400);
      expect(fixture.exams[0]?.subjectId).toBe(subject.id);
    });
  });

  it('rejects an exam against an archived subject', async () => {
    const fixture = await createFakeDatabase();
    await fixture.addUser('ADMIN', 'admin@oes.test');
    await fixture.addUser('FACULTY', 'faculty@oes.test');
    const subject = await fixture.addSubject('Operating Systems', 'CS204');

    await withServer(fixture.database, async (baseUrl) => {
      const admin = await signIn(baseUrl, 'admin@oes.test');
      await api(baseUrl, `/subjects/${subject.id}`, { method: 'DELETE', cookie: admin });

      const cookie = await signIn(baseUrl, 'faculty@oes.test');
      const response = await api(baseUrl, '/exams', {
        method: 'POST',
        cookie,
        body: validExam(subject.id),
      });

      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: { details: { path: string }[] } };
      expect(body.error.details[0]?.path).toBe('subjectId');
    });
  });
});
