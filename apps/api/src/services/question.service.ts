import type {
  CreateQuestionRequest,
  QuestionListQuery,
  QuestionOptionInput,
  UpdateQuestionRequest,
} from '@oes/shared';

import type { DatabaseClient } from '../db/prisma.js';
import { HttpError } from '../lib/http-error.js';
import type { AuthenticatedUser } from './auth.service.js';
import { QuestionStatus, SubjectStatus } from '../generated/prisma/client.js';

export interface QuestionServiceDependencies {
  database: DatabaseClient;
}

export interface QuestionView {
  id: string;
  text: string;
  type: 'SINGLE_CHOICE';
  marks: number;
  explanation: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  subject: { id: string; name: string; code: string; description: string | null; status: string };
  options: { id: string; text: string; isCorrect: boolean }[];
  createdAt: string;
}

export interface QuestionPage {
  items: QuestionView[];
  page: number;
  pageSize: number;
  total: number;
}

const QUESTION_INCLUDE = {
  subject: true,
  options: { orderBy: { id: 'asc' } },
} as const;

/**
 * The faculty question bank (PRD FR-13).
 *
 * Every operation is scoped to `actor.id`: a faculty member sees and edits only
 * the questions they created. Another member's question is reported as
 * `404 NOT_FOUND` rather than `403`, so the API never confirms that a given
 * question id exists.
 */
export async function listQuestions(
  query: QuestionListQuery,
  actor: AuthenticatedUser,
  { database }: QuestionServiceDependencies,
): Promise<QuestionPage> {
  const where = {
    createdById: actor.id,
    status: QuestionStatus.ACTIVE,
    ...(query.subjectId === undefined ? {} : { subjectId: query.subjectId }),
    ...(query.q === undefined || query.q.length === 0
      ? {}
      : { text: { contains: query.q, mode: 'insensitive' as const } }),
  };

  const [rows, total] = await Promise.all([
    database.question.findMany({
      where,
      include: QUESTION_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    database.question.count({ where }),
  ]);

  return {
    items: rows.map(toView),
    page: query.page,
    pageSize: query.pageSize,
    total,
  };
}

export async function getQuestion(
  id: string,
  actor: AuthenticatedUser,
  { database }: QuestionServiceDependencies,
): Promise<QuestionView> {
  const row = await findOwnedQuestion(id, actor, database);

  return toView(row);
}

export async function createQuestion(
  input: CreateQuestionRequest,
  actor: AuthenticatedUser,
  { database }: QuestionServiceDependencies,
): Promise<QuestionView> {
  await assertSubjectIsUsable(input.subjectId, database);
  assertExactlyOneCorrectOption(input.options);

  const created = await database.question.create({
    data: {
      subjectId: input.subjectId,
      createdById: actor.id,
      text: input.text,
      type: input.type,
      marks: input.marks,
      explanation: input.explanation ?? null,
      options: { create: input.options.map(toOptionData) },
    },
    include: QUESTION_INCLUDE,
  });

  return toView(created);
}

/**
 * Replaces the option set wholesale. Options have no independent identity that
 * a client can rely on, so a full replace is simpler and safer than diffing and
 * avoids leaving orphaned rows behind.
 */
export async function updateQuestion(
  id: string,
  input: UpdateQuestionRequest,
  actor: AuthenticatedUser,
  { database }: QuestionServiceDependencies,
): Promise<QuestionView> {
  await findOwnedQuestion(id, actor, database);

  if (input.subjectId !== undefined) {
    await assertSubjectIsUsable(input.subjectId, database);
  }

  if (input.options !== undefined) {
    assertExactlyOneCorrectOption(input.options);
  }

  const updated = await database.question.update({
    where: { id },
    data: {
      ...(input.text === undefined ? {} : { text: input.text }),
      ...(input.marks === undefined ? {} : { marks: input.marks }),
      ...(input.explanation === undefined ? {} : { explanation: input.explanation }),
      ...(input.subjectId === undefined ? {} : { subjectId: input.subjectId }),
      ...(input.options === undefined
        ? {}
        : { options: { deleteMany: {}, create: input.options.map(toOptionData) } }),
    },
    include: QUESTION_INCLUDE,
  });

  return toView(updated);
}

/**
 * Archives a question rather than deleting it, so a published exam that
 * references it keeps its content (PRD §13, §24).
 */
export async function archiveQuestion(
  id: string,
  actor: AuthenticatedUser,
  { database }: QuestionServiceDependencies,
): Promise<QuestionView> {
  await findOwnedQuestion(id, actor, database);

  const updated = await database.question.update({
    where: { id },
    data: { status: QuestionStatus.INACTIVE },
    include: QUESTION_INCLUDE,
  });

  return toView(updated);
}

async function findOwnedQuestion(
  id: string,
  actor: AuthenticatedUser,
  database: DatabaseClient,
): Promise<{
  id: string;
  text: string;
  type: 'SINGLE_CHOICE';
  marks: number;
  explanation: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  subject: { id: string; name: string; code: string; description: string | null; status: string };
  options: { id: string; text: string; isCorrect: boolean }[];
}> {
  const row = await database.question.findUnique({ where: { id }, include: QUESTION_INCLUDE });

  // One check for "missing" and "someone else's": the response is identical.
  if (row === null || row.createdById !== actor.id) {
    throw HttpError.notFound('That question does not exist.');
  }

  return row;
}

async function assertSubjectIsUsable(subjectId: string, database: DatabaseClient): Promise<void> {
  const subject = await database.subject.findUnique({ where: { id: subjectId } });

  if (subject === null) {
    throw HttpError.badRequest('Choose a subject.', [
      { path: 'subjectId', message: 'Unknown subject.' },
    ]);
  }

  if (subject.status !== SubjectStatus.ACTIVE) {
    throw HttpError.badRequest('Choose a subject.', [
      { path: 'subjectId', message: 'That subject is no longer available.' },
    ]);
  }
}

/** Defence in depth: the shared schema already enforces this. */
function assertExactlyOneCorrectOption(options: readonly QuestionOptionInput[]): void {
  const correct = options.filter((option) => option.isCorrect).length;

  if (correct !== 1) {
    throw HttpError.badRequest('The question is not valid.', [
      { path: 'options', message: 'Mark exactly one option as the correct answer.' },
    ]);
  }
}

function toOptionData(option: QuestionOptionInput): { text: string; isCorrect: boolean } {
  return { text: option.text, isCorrect: option.isCorrect };
}

function toView(row: {
  id: string;
  text: string;
  type: 'SINGLE_CHOICE';
  marks: number;
  explanation: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  subject: { id: string; name: string; code: string; description: string | null; status: string };
  options: { id: string; text: string; isCorrect: boolean }[];
}): QuestionView {
  return {
    id: row.id,
    text: row.text,
    type: row.type,
    marks: row.marks,
    explanation: row.explanation,
    status: row.status,
    subject: {
      id: row.subject.id,
      name: row.subject.name,
      code: row.subject.code,
      description: row.subject.description,
      status: row.subject.status,
    },
    options: row.options.map((option) => ({
      id: option.id,
      text: option.text,
      isCorrect: option.isCorrect,
    })),
    createdAt: row.createdAt.toISOString(),
  };
}
