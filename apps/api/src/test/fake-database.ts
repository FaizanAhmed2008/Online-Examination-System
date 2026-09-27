import type { Server } from 'node:http';

import { loadEnv } from '../config/env.js';
import type { DatabaseClient } from '../db/prisma.js';
import { createApp } from '../app.js';
import { SESSION_COOKIE_NAME } from '../lib/cookies.js';
import { hashPassword } from '../lib/password.js';

export const testEnv = loadEnv({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/oes',
  LOG_LEVEL: 'silent',
});

export const PASSWORD = 'valid-password';

export type Role = 'STUDENT' | 'FACULTY' | 'ADMIN';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

export interface SubjectRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionRow {
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

export interface OptionRow {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
}

export interface ExamRow {
  id: string;
  subjectId: string;
  createdById: string;
  title: string;
  instructions: string | null;
  durationMinutes: number;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: Date;
  updatedAt: Date;
}

export interface ExamQuestionRow {
  id: string;
  examId: string;
  questionId: string;
  position: number;
  marks: number;
}

type OptionData = { text: string; isCorrect: boolean };
type ExamQuestionData = { questionId: string; position: number; marks: number };

export interface AttemptRow {
  id: string;
  examId: string;
  studentId: string;
  status: 'IN_PROGRESS' | 'SUBMITTED';
  startedAt: Date;
  expiresAt: Date;
  submittedAt: Date | null;
  score: number | null;
}

export interface AttemptAnswerRow {
  id: string;
  attemptId: string;
  questionId: string;
  selectedOptionId: string | null;
  isCorrect: boolean | null;
  marksAwarded: number | null;
}

/**
 * In-memory stand-in for the whole database surface the route tests touch, so
 * they can drive the real app, guards and error handler without Postgres.
 *
 * It implements only the Prisma calls the services actually make, and it
 * interprets the `include` argument structurally: an include that nests
 * `include` under a relation wants full rows, one that only has `select` wants
 * the narrow projection.
 */
export async function createFakeDatabase() {
  const users: UserRow[] = [];
  const subjects: SubjectRow[] = [];
  const questions: QuestionRow[] = [];
  const options: OptionRow[] = [];
  const exams: ExamRow[] = [];
  const examQuestions: ExamQuestionRow[] = [];
  const attempts: AttemptRow[] = [];
  const attemptAnswers: AttemptAnswerRow[] = [];
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
          .map((row) => withQuestionRelations(row, include !== undefined));
      },
      count: async ({ where }: { where: Record<string, unknown> }) =>
        questions.filter((row) => matchesQuestion(row, where)).length,
      findUnique: async ({ where, include }: { where: { id: string }; include?: unknown }) => {
        const row = questions.find((candidate) => candidate.id === where.id);
        return row === undefined ? null : withQuestionRelations(row, include !== undefined);
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
        const created = (data['options'] as { create: OptionData[] }).create;
        created.forEach((option) =>
          options.push({ id: nextId('option'), questionId: id, ...option }),
        );
        return withQuestionRelations(row, include !== undefined);
      },
      update: async ({
        where,
        data,
        include,
      }: {
        where: { id: string };
        data: Record<string, unknown> & {
          options?: { deleteMany: Record<string, never>; create: OptionData[] };
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
          removeQuestionOptions(where.id);
          data['options'].create.forEach((option) =>
            options.push({ id: nextId('option'), questionId: where.id, ...option }),
          );
        }

        return withQuestionRelations(next, include !== undefined);
      },
    },
    exam: {
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
        const matched = exams
          .filter((row) => matchesExam(row, where))
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        const start = skip ?? 0;
        return matched
          .slice(start, take === undefined ? undefined : start + take)
          .map((row) => withExamRelations(row, include));
      },
      count: async ({ where }: { where: Record<string, unknown> }) =>
        exams.filter((row) => matchesExam(row, where)).length,
      findUnique: async ({ where, include }: { where: { id: string }; include?: unknown }) => {
        const row = exams.find((candidate) => candidate.id === where.id);
        return row === undefined ? null : withExamRelations(row, include);
      },
      create: async ({ data, include }: { data: Record<string, unknown>; include?: unknown }) => {
        const id = nextId('exam');
        const row: ExamRow = {
          id,
          subjectId: String(data['subjectId']),
          createdById: String(data['createdById']),
          title: String(data['title']),
          instructions: (data['instructions'] as string | null) ?? null,
          durationMinutes: Number(data['durationMinutes']),
          status: 'DRAFT',
          createdAt: now,
          updatedAt: now,
        };
        exams.push(row);
        addExamQuestions(id, (data['questions'] as { create: ExamQuestionData[] }).create);
        return withExamRelations(row, include);
      },
      update: async ({
        where,
        data,
        include,
      }: {
        where: { id: string };
        data: Record<string, unknown> & {
          questions?: { deleteMany: Record<string, never>; create: ExamQuestionData[] };
        };
        include?: unknown;
      }) => {
        const index = exams.findIndex((row) => row.id === where.id);
        const existing = exams[index];
        if (existing === undefined) throw new Error('exam not found');

        const next: ExamRow = {
          ...existing,
          ...(typeof data['title'] === 'string' ? { title: data['title'] } : {}),
          ...(typeof data['durationMinutes'] === 'number'
            ? { durationMinutes: data['durationMinutes'] }
            : {}),
          ...(typeof data['subjectId'] === 'string' ? { subjectId: data['subjectId'] } : {}),
          ...(typeof data['status'] === 'string'
            ? { status: data['status'] as 'DRAFT' | 'PUBLISHED' }
            : {}),
          ...(data['instructions'] !== undefined
            ? { instructions: data['instructions'] as string | null }
            : {}),
          updatedAt: now,
        };
        exams[index] = next;

        if (data['questions'] !== undefined) {
          removeExamQuestions(where.id);
          addExamQuestions(where.id, data['questions'].create);
        }

        return withExamRelations(next, include);
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const index = exams.findIndex((row) => row.id === where.id);
        const existing = exams[index];
        if (existing === undefined) throw new Error('exam not found');
        removeExamQuestions(where.id);
        exams.splice(index, 1);
        return existing;
      },
    },
    examQuestion: {
      findMany: async ({ where, include }: { where: { examId: string }; include?: unknown }) => {
        const matched = examQuestionRows(where.examId);
        const wantsSubject =
          typeof include === 'object' &&
          include !== null &&
          (include as { question?: unknown }).question !== undefined;

        return matched.map((entry) => ({
          ...entry,
          ...(wantsSubject
            ? {
                question: questions.find((candidate) => candidate.id === entry.questionId) ?? null,
              }
            : {}),
        }));
      },
    },
    attempt: {
      findMany: async ({ where }: { where: { studentId: string } }) =>
        attempts.filter((row) => row.studentId === where.studentId),
      findFirst: async ({ where }: { where: { examId: string; studentId: string } }) =>
        attempts.find((row) => row.examId === where.examId && row.studentId === where.studentId) ??
        null,
      findUnique: async ({ where, include }: { where: { id: string }; include?: unknown }) => {
        const row = attempts.find((candidate) => candidate.id === where.id);
        return row === undefined ? null : withAttemptRelations(row, include);
      },
      create: async ({ data, include }: { data: Record<string, unknown>; include?: unknown }) => {
        const row: AttemptRow = {
          id: nextId('attempt'),
          examId: String(data['examId']),
          studentId: String(data['studentId']),
          status: 'IN_PROGRESS',
          startedAt: (data['startedAt'] as Date | undefined) ?? now,
          expiresAt: data['expiresAt'] as Date,
          submittedAt: null,
          score: null,
        };
        attempts.push(row);
        return withAttemptRelations(row, include);
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const index = attempts.findIndex((row) => row.id === where.id);
        const existing = attempts[index];
        if (existing === undefined) throw new Error('attempt not found');
        const next: AttemptRow = {
          ...existing,
          ...(typeof data['status'] === 'string'
            ? { status: data['status'] as 'IN_PROGRESS' | 'SUBMITTED' }
            : {}),
          ...(data['submittedAt'] !== undefined
            ? { submittedAt: data['submittedAt'] as Date | null }
            : {}),
          ...(typeof data['score'] === 'number' ? { score: data['score'] } : {}),
        };
        attempts[index] = next;
        return next;
      },
    },
    attemptAnswer: {
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { attemptId_questionId: { attemptId: string; questionId: string } };
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => {
        const { attemptId, questionId } = where.attemptId_questionId;
        const index = attemptAnswers.findIndex(
          (row) => row.attemptId === attemptId && row.questionId === questionId,
        );
        const existing = attemptAnswers[index];

        if (existing === undefined) {
          const row: AttemptAnswerRow = {
            id: nextId('attempt-answer'),
            attemptId,
            questionId,
            selectedOptionId: (create['selectedOptionId'] as string | null) ?? null,
            isCorrect: (create['isCorrect'] as boolean | null) ?? null,
            marksAwarded: (create['marksAwarded'] as number | null) ?? null,
          };
          attemptAnswers.push(row);
          return row;
        }

        const next: AttemptAnswerRow = {
          ...existing,
          ...(Object.hasOwn(update, 'selectedOptionId')
            ? { selectedOptionId: update['selectedOptionId'] as string | null }
            : {}),
          ...(Object.hasOwn(update, 'isCorrect')
            ? { isCorrect: update['isCorrect'] as boolean | null }
            : {}),
          ...(Object.hasOwn(update, 'marksAwarded')
            ? { marksAwarded: update['marksAwarded'] as number | null }
            : {}),
        };
        attemptAnswers[index] = next;
        return next;
      },
    },
  } as unknown as DatabaseClient;

  function withQuestionRelations(row: QuestionRow, withSubject: boolean) {
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

  function removeQuestionOptions(questionId: string): void {
    for (let index = options.length - 1; index >= 0; index -= 1) {
      if (options[index]?.questionId === questionId) options.splice(index, 1);
    }
  }

  function addExamQuestions(examId: string, data: ExamQuestionData[]): void {
    data.forEach((entry) => examQuestions.push({ id: nextId('exam-question'), examId, ...entry }));
  }

  function removeExamQuestions(examId: string): void {
    for (let index = examQuestions.length - 1; index >= 0; index -= 1) {
      if (examQuestions[index]?.examId === examId) examQuestions.splice(index, 1);
    }
  }

  function examQuestionRows(examId: string): ExamQuestionRow[] {
    return examQuestions
      .filter((entry) => entry.examId === examId)
      .sort((a, b) => a.position - b.position);
  }

  /**
   * Mirrors the two projections the exam service asks for: a narrow list shape
   * carrying only `marks`, and a full shape carrying the question itself.
   */
  function withExamRelations(row: ExamRow, include: unknown) {
    const subject = subjects.find((candidate) => candidate.id === row.subjectId) ?? null;
    const entries = examQuestionRows(row.id);

    if (include === undefined) {
      return { ...row, subject };
    }

    const wantsQuestions = wantsNestedInclude(include, 'questions');

    return {
      ...row,
      subject,
      questions: wantsQuestions
        ? entries.map((entry) => {
            const question = questions.find((candidate) => candidate.id === entry.questionId);
            return {
              questionId: entry.questionId,
              position: entry.position,
              marks: entry.marks,
              question: question === undefined ? null : withQuestionRelations(question, true),
            };
          })
        : entries.map((entry) => ({ marks: entry.marks })),
    };
  }

  function wantsNestedInclude(include: unknown, relation: string): boolean {
    if (typeof include !== 'object' || include === null) return false;
    const value = (include as Record<string, unknown>)[relation];
    if (typeof value !== 'object' || value === null) return false;
    return (value as Record<string, unknown>)['include'] !== undefined;
  }

  /**
   * Mirrors the attempt projections: the full paper, or just the saved answers.
   *
   * The exam include arrives one level deeper than the exam service passes it —
   * nested under `exam.include` rather than flat — so it is unwrapped here before
   * being handed on, otherwise the question text would never be attached.
   */
  function withAttemptRelations(row: AttemptRow, include: unknown) {
    if (include === undefined) return { ...row };

    const exam = exams.find((candidate) => candidate.id === row.examId);
    const examInclude = (include as { exam?: { include?: unknown } }).exam;

    return {
      ...row,
      exam:
        exam === undefined ? null : withExamRelations(exam, examInclude?.include ?? examInclude),
      answers: attemptAnswers
        .filter((answer) => answer.attemptId === row.id)
        .map((answer) => ({
          questionId: answer.questionId,
          selectedOptionId: answer.selectedOptionId,
        })),
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
    const ids = where['id'];
    if (typeof ids === 'object' && ids !== null) {
      const wanted = (ids as { in: string[] }).in;
      if (!wanted.includes(row.id)) return false;
    }
    const text = where['text'];
    if (typeof text === 'object' && text !== null) {
      const needle = String((text as { contains: string }).contains).toLowerCase();
      return row.text.toLowerCase().includes(needle);
    }
    return true;
  }

  function matchesExam(row: ExamRow, where: Record<string, unknown>): boolean {
    if (typeof where['createdById'] === 'string' && row.createdById !== where['createdById']) {
      return false;
    }
    if (typeof where['status'] === 'string' && row.status !== where['status']) {
      return false;
    }
    if (typeof where['subjectId'] === 'string' && row.subjectId !== where['subjectId']) {
      return false;
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

  function addQuestion(input: {
    subjectId: string;
    createdById: string;
    text: string;
    marks: number;
    options: OptionData[];
  }): { question: QuestionRow; options: OptionRow[] } {
    const row: QuestionRow = {
      id: nextId('question'),
      subjectId: input.subjectId,
      createdById: input.createdById,
      text: input.text,
      type: 'SINGLE_CHOICE',
      marks: input.marks,
      explanation: null,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };
    questions.push(row);

    const created = input.options.map((option) => ({
      id: nextId('option'),
      questionId: row.id,
      ...option,
    }));
    options.push(...created);

    return { question: row, options: created };
  }

  /** A ready-to-sit paper: published, ordered, with one question per entry. */
  function addPublishedExam(input: {
    subjectId: string;
    createdById: string;
    title: string;
    instructions?: string | null;
    durationMinutes?: number;
    questions: { question: QuestionRow; marks?: number }[];
  }): ExamRow {
    const row: ExamRow = {
      id: nextId('exam'),
      subjectId: input.subjectId,
      createdById: input.createdById,
      title: input.title,
      instructions: input.instructions ?? null,
      durationMinutes: input.durationMinutes ?? 30,
      status: 'PUBLISHED',
      createdAt: now,
      updatedAt: now,
    };
    exams.push(row);
    input.questions.forEach((entry, position) =>
      examQuestions.push({
        id: nextId('exam-question'),
        examId: row.id,
        questionId: entry.question.id,
        position,
        marks: entry.marks ?? entry.question.marks,
      }),
    );
    return row;
  }

  return {
    database,
    users,
    subjects,
    questions,
    options,
    exams,
    examQuestions,
    attempts,
    attemptAnswers,
    addUser,
    addSubject,
    addQuestion,
    addPublishedExam,
  };
}

export async function withServer(
  database: DatabaseClient,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = await startTestServer(database);
  try {
    await run(server.baseUrl);
  } finally {
    await server.close();
  }
}

/**
 * Starts a server that outlives a single assertion, for suites that rebuild
 * their fixtures per test but do not want to rebind a port per request.
 * `withServer` cannot be used for that: it closes as soon as `run` returns.
 */
export async function startTestServer(
  database: DatabaseClient,
): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const app = createApp({ env: testEnv, database });
  const server: Server = await new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });

  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Expected the test server to bind to a TCP port.');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

/** Signs in for real, so the cookie under test is the one the server issued. */
export async function signIn(baseUrl: string, email: string): Promise<string> {
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

export function api(
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
