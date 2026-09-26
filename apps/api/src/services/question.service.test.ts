import { describe, expect, it } from 'vitest';

import type { CreateQuestionRequest, UpdateQuestionRequest } from '@oes/shared';

import type { DatabaseClient } from '../db/prisma.js';
import { HttpError } from '../lib/http-error.js';
import type { AuthenticatedUser } from './auth.service.js';
import * as questionService from './question.service.js';

const subjectRow = {
  id: 'subject-1',
  name: 'Operating Systems',
  code: 'CS204',
  description: null,
  status: 'ACTIVE',
};

function faculty(id: string, email: string): AuthenticatedUser {
  return { id, name: 'Faculty Member', email, role: 'FACULTY' };
}

const author = faculty('faculty-1', 'author@oes.test');
const stranger = faculty('faculty-2', 'stranger@oes.test');

function validCreate(overrides: Partial<CreateQuestionRequest> = {}): CreateQuestionRequest {
  return {
    subjectId: subjectRow.id,
    text: 'Which scheduling algorithm can starve a process?',
    type: 'SINGLE_CHOICE',
    marks: 2,
    explanation: 'A priority-scheduled process may never run.',
    options: [
      { text: 'Round robin', isCorrect: false },
      { text: 'Priority scheduling', isCorrect: true },
      { text: 'First come first served', isCorrect: false },
    ],
    ...overrides,
  };
}

/**
 * In-memory stand-in for the Prisma delegates the service touches. It records
 * writes so ownership scoping and option replacement can be asserted.
 */
function createFakeDatabase(options: { subjectStatus?: 'ACTIVE' | 'INACTIVE' } = {}) {
  const state = {
    questions: new Map<
      string,
      {
        id: string;
        subjectId: string;
        createdById: string;
        text: string;
        type: 'SINGLE_CHOICE';
        marks: number;
        explanation: string | null;
        status: 'ACTIVE' | 'INACTIVE';
        createdAt: Date;
        options: { id: string; text: string; isCorrect: boolean }[];
      }
    >(),
    nextId: 1,
  };

  const subject = { ...subjectRow, status: options.subjectStatus ?? 'ACTIVE' };

  const database = {
    subject: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === subject.id ? subject : null,
    },
    question: {
      findMany: async ({
        where,
        skip,
        take,
      }: {
        where: Record<string, unknown>;
        skip?: number;
        take?: number;
      }) => {
        const matched = [...state.questions.values()].filter((row) => matches(row, where));
        const start = skip ?? 0;
        return matched.slice(start, take === undefined ? undefined : start + take).map(withSubject);
      },
      count: async ({ where }: { where: Record<string, unknown> }) =>
        [...state.questions.values()].filter((row) => matches(row, where)).length,
      findUnique: async ({ where }: { where: { id: string } }) => {
        const row = state.questions.get(where.id);
        return row === undefined ? null : withSubject(row);
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const id = `question-${state.nextId++}`;
        const row = {
          id,
          subjectId: String(data['subjectId']),
          createdById: String(data['createdById']),
          text: String(data['text']),
          type: 'SINGLE_CHOICE' as const,
          marks: Number(data['marks']),
          explanation: (data['explanation'] as string | null) ?? null,
          status: 'ACTIVE' as const,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          options: (
            data['options'] as { create: { text: string; isCorrect: boolean }[] }
          ).create.map((option, index) => ({ id: `${id}-option-${index}`, ...option })),
        };

        state.questions.set(id, row);
        return withSubject(row);
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown> & { options?: unknown };
      }) => {
        const existing = state.questions.get(where.id);

        if (existing === undefined) {
          throw new Error('update called for a missing question');
        }

        const next = {
          ...existing,
          ...(typeof data['text'] === 'string' ? { text: data['text'] } : {}),
          ...(typeof data['marks'] === 'number' ? { marks: data['marks'] } : {}),
          ...(data['explanation'] !== undefined
            ? { explanation: data['explanation'] as string | null }
            : {}),
          ...(typeof data['subjectId'] === 'string' ? { subjectId: data['subjectId'] } : {}),
          ...(typeof data['status'] === 'string'
            ? { status: data['status'] as 'ACTIVE' | 'INACTIVE' }
            : {}),
        };

        const options = data['options'] as
          { create: { text: string; isCorrect: boolean }[] } | undefined;

        if (options !== undefined) {
          next.options = options.create.map((option, index) => ({
            id: `${where.id}-option-${index}`,
            ...option,
          }));
        }

        state.questions.set(where.id, next);
        return withSubject(next);
      },
    },
  } as unknown as DatabaseClient;

  function withSubject(row: typeof state.questions extends Map<string, infer V> ? V : never) {
    return { ...row, subject };
  }

  return { database, state };
}

/** Mirrors the `where` shapes the service builds. */
function matches(
  row: { createdById: string; status: string; subjectId: string; text: string },
  where: Record<string, unknown>,
): boolean {
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

const page = { page: 1, pageSize: 20 };

describe('createQuestion', () => {
  it('stores the question with its options and owner', async () => {
    const { database } = createFakeDatabase();

    const created = await questionService.createQuestion(validCreate(), author, { database });

    expect(created.text).toBe(validCreate().text);
    expect(created.marks).toBe(2);
    expect(created.status).toBe('ACTIVE');
    expect(created.subject.code).toBe('CS204');
    expect(created.options).toHaveLength(3);
    expect(created.options.filter((option) => option.isCorrect)).toHaveLength(1);
  });

  it('rejects a question with no correct option', async () => {
    const { database } = createFakeDatabase();

    const input = validCreate({
      options: [
        { text: 'Round robin', isCorrect: false },
        { text: 'Priority scheduling', isCorrect: false },
      ],
    });

    await expect(questionService.createQuestion(input, author, { database })).rejects.toMatchObject(
      { status: 400 },
    );
  });

  it('rejects a question with two correct options', async () => {
    const { database } = createFakeDatabase();

    const input = validCreate({
      options: [
        { text: 'Round robin', isCorrect: true },
        { text: 'Priority scheduling', isCorrect: true },
      ],
    });

    await expect(questionService.createQuestion(input, author, { database })).rejects.toMatchObject(
      { status: 400 },
    );
  });

  it('rejects an unknown subject', async () => {
    const { database } = createFakeDatabase();

    await expect(
      questionService.createQuestion(validCreate({ subjectId: 'missing' }), author, { database }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rejects an archived subject', async () => {
    const { database } = createFakeDatabase({ subjectStatus: 'INACTIVE' });

    await expect(
      questionService.createQuestion(validCreate(), author, { database }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe('listQuestions', () => {
  async function seedTwoAuthors() {
    const { database } = createFakeDatabase();
    await questionService.createQuestion(validCreate({ text: 'Mine: dead lock' }), author, {
      database,
    });
    await questionService.createQuestion(
      validCreate({ text: 'Theirs: race condition' }),
      stranger,
      { database },
    );
    return database;
  }

  it('returns only the requesting faculty member’s questions', async () => {
    const database = await seedTwoAuthors();

    const result = await questionService.listQuestions(page, author, { database });

    expect(result.total).toBe(1);
    expect(result.items[0]?.text).toBe('Mine: dead lock');
  });

  it('filters by free text across the owner’s own questions only', async () => {
    const database = await seedTwoAuthors();

    const result = await questionService.listQuestions({ ...page, q: 'dead' }, author, {
      database,
    });

    expect(result.total).toBe(1);
  });

  it('does not leak another author’s question through search', async () => {
    const database = await seedTwoAuthors();

    const result = await questionService.listQuestions({ ...page, q: 'race' }, author, {
      database,
    });

    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });

  it('filters by subject', async () => {
    const database = await seedTwoAuthors();

    const matching = await questionService.listQuestions(
      { ...page, subjectId: subjectRow.id },
      author,
      { database },
    );
    const other = await questionService.listQuestions({ ...page, subjectId: 'subject-9' }, author, {
      database,
    });

    expect(matching.total).toBe(1);
    expect(other.total).toBe(0);
  });

  it('paginates', async () => {
    const database = await seedTwoAuthors();

    const first = await questionService.listQuestions({ page: 1, pageSize: 1 }, author, {
      database,
    });
    const second = await questionService.listQuestions({ page: 2, pageSize: 1 }, author, {
      database,
    });

    expect(first.items).toHaveLength(1);
    expect(second.items).toHaveLength(0);
    expect(first.total).toBe(1);
  });

  it('hides archived questions', async () => {
    const { database } = createFakeDatabase();
    const created = await questionService.createQuestion(validCreate(), author, { database });
    await questionService.archiveQuestion(created.id, author, { database });

    const result = await questionService.listQuestions(page, author, { database });

    expect(result.total).toBe(0);
  });
});

describe('ownership', () => {
  async function seedOne() {
    const { database } = createFakeDatabase();
    const created = await questionService.createQuestion(validCreate(), author, { database });
    return { database, created };
  }

  it('reports another author’s question as missing', async () => {
    const { database, created } = await seedOne();

    await expect(
      questionService.getQuestion(created.id, stranger, { database }),
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('refuses to let another author edit it', async () => {
    const { database, created } = await seedOne();
    const input: UpdateQuestionRequest = { text: 'Hijacked' };

    await expect(
      questionService.updateQuestion(created.id, input, stranger, { database }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('refuses to let another author archive it', async () => {
    const { database, created } = await seedOne();

    await expect(
      questionService.archiveQuestion(created.id, stranger, { database }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('lets the author edit it', async () => {
    const { database, created } = await seedOne();

    const updated = await questionService.updateQuestion(
      created.id,
      { text: 'Which algorithm starves a process?' },
      author,
      { database },
    );

    expect(updated.text).toBe('Which algorithm starves a process?');
  });

  it('keeps options consistent when only the marks change', async () => {
    const { database, created } = await seedOne();

    const updated = await questionService.updateQuestion(created.id, { marks: 5 }, author, {
      database,
    });

    expect(updated.marks).toBe(5);
    expect(updated.options).toHaveLength(created.options.length);
  });

  it('replaces the whole option set on edit and re-checks the correct answer', async () => {
    const { database, created } = await seedOne();

    const invalid: UpdateQuestionRequest = {
      options: [
        { text: 'One', isCorrect: false },
        { text: 'Two', isCorrect: false },
      ],
    };

    await expect(
      questionService.updateQuestion(created.id, invalid, author, { database }),
    ).rejects.toMatchObject({ status: 400 });

    const valid: UpdateQuestionRequest = {
      options: [
        { text: 'One', isCorrect: true },
        { text: 'Two', isCorrect: false },
      ],
    };

    const updated = await questionService.updateQuestion(created.id, valid, author, { database });

    expect(updated.options).toHaveLength(2);
    expect(updated.options.filter((option) => option.isCorrect)).toHaveLength(1);
  });

  it('404s for an id that does not exist at all', async () => {
    const { database } = createFakeDatabase();

    await expect(questionService.getQuestion('nope', author, { database })).rejects.toBeInstanceOf(
      HttpError,
    );
  });
});
