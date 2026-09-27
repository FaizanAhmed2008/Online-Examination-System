import type { CreateExamRequest, ExamListQuery, UpdateExamRequest } from '@oes/shared';

import type { DatabaseClient } from '../db/prisma.js';
import { HttpError } from '../lib/http-error.js';
import type { AuthenticatedUser } from './auth.service.js';
import { toQuestionView, type QuestionView } from './question.service.js';
import {
  ExamStatus as ExamStatusValue,
  QuestionStatus,
  SubjectStatus,
} from '../generated/prisma/client.js';

export interface ExamServiceDependencies {
  database: DatabaseClient;
}

export interface ExamSubjectView {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: string;
}

export interface ExamQuestionView {
  questionId: string;
  position: number;
  marks: number;
  question: QuestionView;
}

export interface ExamSummaryView {
  id: string;
  title: string;
  instructions: string | null;
  durationMinutes: number;
  totalMarks: number;
  status: 'DRAFT' | 'PUBLISHED';
  subject: ExamSubjectView;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExamView extends ExamSummaryView {
  questions: ExamQuestionView[];
}

export interface ExamPage {
  items: ExamSummaryView[];
  page: number;
  pageSize: number;
  total: number;
}

const DETAIL_INCLUDE = {
  subject: true,
  questions: {
    orderBy: { position: 'asc' },
    include: { question: { include: { subject: true, options: { orderBy: { id: 'asc' } } } } },
  },
} as const;

/** List rows only need the marks, not the question text. */
const SUMMARY_INCLUDE = {
  subject: true,
  questions: { select: { marks: true } },
} as const;

interface SubjectRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: string;
}

interface ExamQuestionRow {
  questionId: string;
  position: number;
  marks: number;
  question: {
    id: string;
    text: string;
    type: 'SINGLE_CHOICE';
    marks: number;
    explanation: string | null;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: Date;
    subject: SubjectRow;
    options: { id: string; text: string; isCorrect: boolean }[];
  };
}

interface ExamRow {
  id: string;
  title: string;
  instructions: string | null;
  durationMinutes: number;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: Date;
  updatedAt: Date;
  subject: SubjectRow;
  questions: { marks: number }[] | ExamQuestionRow[];
}

/** Join-row payload for `ExamQuestion.create`. */
interface ExamQuestionData {
  questionId: string;
  position: number;
  marks: number;
}

/** A resolved question plus the subject it came from, for the subject check. */
interface ResolvedQuestion extends ExamQuestionData {
  subjectId: string;
}

/**
 * Faculty exam creation and publishing (PRD FR-14, FR-15).
 *
 * Every operation is scoped to `actor.id`: a lecturer sees and edits only their
 * own exams, and may only put their own questions into them. Another member's
 * exam is reported as `404 NOT_FOUND` rather than `403`, so the API never
 * confirms that a given exam id exists.
 *
 * An exam is a `DRAFT` until published. Only a draft can be edited or deleted:
 * publishing is the point at which the paper becomes student-facing, and the
 * attempt feature will hang results off it.
 */
export async function listExams(
  query: ExamListQuery,
  actor: AuthenticatedUser,
  { database }: ExamServiceDependencies,
): Promise<ExamPage> {
  const where = {
    createdById: actor.id,
    ...(query.status === undefined ? {} : { status: query.status }),
    ...(query.subjectId === undefined ? {} : { subjectId: query.subjectId }),
  };

  const [rows, total] = await Promise.all([
    database.exam.findMany({
      where,
      include: SUMMARY_INCLUDE,
      orderBy: { updatedAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    database.exam.count({ where }),
  ]);

  return {
    items: rows.map(toSummaryView),
    page: query.page,
    pageSize: query.pageSize,
    total,
  };
}

export async function getExam(
  id: string,
  actor: AuthenticatedUser,
  { database }: ExamServiceDependencies,
): Promise<ExamView> {
  const row = await findOwnedExam(id, actor, database);

  return toView(row);
}

export async function createExam(
  input: CreateExamRequest,
  actor: AuthenticatedUser,
  { database }: ExamServiceDependencies,
): Promise<ExamView> {
  await assertSubjectIsUsable(input.subjectId, database);
  const questions = await resolveQuestions(input.questionIds, actor, database);
  assertQuestionsInSubject(questions, input.subjectId);

  const created = await database.exam.create({
    data: {
      subjectId: input.subjectId,
      createdById: actor.id,
      title: input.title,
      instructions: input.instructions ?? null,
      durationMinutes: input.durationMinutes,
      questions: { create: toQuestionData(questions) },
    },
    include: DETAIL_INCLUDE,
  });

  return toView(created);
}

/**
 * Updates a draft. `questionIds` replaces the whole paper rather than being
 * diffed: an exam question has no identity a client can rely on, and a full
 * replace cannot leave a stale row behind.
 */
export async function updateExam(
  id: string,
  input: UpdateExamRequest,
  actor: AuthenticatedUser,
  { database }: ExamServiceDependencies,
): Promise<ExamView> {
  const existing = await findOwnedExam(id, actor, database);
  assertIsDraft(existing.status, 'edit');

  const subjectId = input.subjectId ?? existing.subject.id;

  if (input.subjectId !== undefined) {
    await assertSubjectIsUsable(input.subjectId, database);
  }

  const questions =
    input.questionIds === undefined
      ? undefined
      : await resolveQuestions(input.questionIds, actor, database);

  if (questions === undefined) {
    // The paper itself is unchanged, but a subject change still has to agree
    // with the questions that are already on it.
    const existingQuestions = await loadExistingQuestions(id, database);
    assertQuestionsInSubject(existingQuestions, subjectId);
  } else {
    assertQuestionsInSubject(questions, subjectId);
  }

  const updated = await database.exam.update({
    where: { id },
    data: {
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.instructions === undefined ? {} : { instructions: input.instructions }),
      ...(input.durationMinutes === undefined ? {} : { durationMinutes: input.durationMinutes }),
      ...(input.subjectId === undefined ? {} : { subjectId: input.subjectId }),
      ...(questions === undefined
        ? {}
        : { questions: { deleteMany: {}, create: toQuestionData(questions) } }),
    },
    include: DETAIL_INCLUDE,
  });

  return toView(updated);
}

/**
 * Deletes a draft outright. Nothing references a draft yet, so there is no
 * history to preserve; a published exam must be unpublished first.
 */
export async function deleteExam(
  id: string,
  actor: AuthenticatedUser,
  { database }: ExamServiceDependencies,
): Promise<void> {
  const existing = await findOwnedExam(id, actor, database);
  assertIsDraft(existing.status, 'delete');

  await database.exam.delete({ where: { id } });
}

/**
 * Publishes a draft. This is the last point at which the paper is checked for
 * completeness: a published exam with no questions could not be sat.
 */
export async function publishExam(
  id: string,
  actor: AuthenticatedUser,
  { database }: ExamServiceDependencies,
): Promise<ExamView> {
  const existing = await findOwnedExam(id, actor, database);

  if (existing.status === ExamStatusValue.PUBLISHED) {
    throw HttpError.conflict('That exam is already published.');
  }

  if (existing.questions.length === 0) {
    throw HttpError.badRequest('That exam is not ready to publish.', [
      { path: 'questions', message: 'Add at least one question before publishing.' },
    ]);
  }

  const published = await database.exam.update({
    where: { id },
    data: { status: ExamStatusValue.PUBLISHED },
    include: DETAIL_INCLUDE,
  });

  return toView(published);
}

/** Returns a published exam to draft so it can be edited again. */
export async function unpublishExam(
  id: string,
  actor: AuthenticatedUser,
  { database }: ExamServiceDependencies,
): Promise<ExamView> {
  const existing = await findOwnedExam(id, actor, database);

  if (existing.status === ExamStatusValue.DRAFT) {
    throw HttpError.conflict('That exam is already a draft.');
  }

  const draft = await database.exam.update({
    where: { id },
    data: { status: ExamStatusValue.DRAFT },
    include: DETAIL_INCLUDE,
  });

  return toView(draft);
}

async function findOwnedExam(
  id: string,
  actor: AuthenticatedUser,
  database: DatabaseClient,
): Promise<ExamRow> {
  const row = await database.exam.findUnique({ where: { id }, include: SUMMARY_INCLUDE });

  // One check for "missing" and "someone else's": the response is identical.
  if (row === null || row.createdById !== actor.id) {
    throw HttpError.notFound('That exam does not exist.');
  }

  return row;
}

function assertIsDraft(status: 'DRAFT' | 'PUBLISHED', action: 'edit' | 'delete'): void {
  if (status === ExamStatusValue.PUBLISHED) {
    throw HttpError.conflict(
      action === 'edit'
        ? 'Unpublish the exam before editing it.'
        : 'Unpublish the exam before deleting it.',
    );
  }
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

/**
 * Turns the requested ids into join rows in the order they were sent, copying
 * each question's marks so later edits to the bank cannot change this paper.
 *
 * One query resolves the whole set: anything that is missing, archived, or
 * belongs to another lecturer fails the same check, so the API never reveals
 * that a particular question id exists.
 */
async function resolveQuestions(
  questionIds: readonly string[],
  actor: AuthenticatedUser,
  database: DatabaseClient,
): Promise<ResolvedQuestion[]> {
  if (questionIds.length === 0) {
    return [];
  }

  const rows = await database.question.findMany({
    where: {
      id: { in: [...questionIds] },
      createdById: actor.id,
      status: QuestionStatus.ACTIVE,
    },
  });

  if (rows.length !== questionIds.length) {
    throw HttpError.badRequest('Those questions cannot be used.', [
      {
        path: 'questionIds',
        message: 'One or more questions are missing, archived, or not in your question bank.',
      },
    ]);
  }

  // The ids are sent in display order, so position is the index the client used.
  const positionById = new Map(questionIds.map((id, position) => [id, position] as const));

  return rows
    .map((row) => ({
      questionId: row.id,
      // Unreachable fallback: every row came from the id list above.
      position: positionById.get(row.id) ?? 0,
      marks: row.marks,
      subjectId: row.subjectId,
    }))
    .sort((a, b) => a.position - b.position);
}

/** Reads the questions already on an exam, for a check that does not change them. */
async function loadExistingQuestions(
  examId: string,
  database: DatabaseClient,
): Promise<ResolvedQuestion[]> {
  const rows = await database.examQuestion.findMany({
    where: { examId },
    orderBy: { position: 'asc' },
    include: { question: { select: { subjectId: true } } },
  });

  return rows.map((row) => ({
    questionId: row.questionId,
    position: row.position,
    marks: row.marks,
    subjectId: row.question.subjectId,
  }));
}

/**
 * An exam is scoped to one subject, so every question on it must belong to that
 * subject. Otherwise a paper could silently mix Operating Systems questions into
 * a Networks exam.
 */
function assertQuestionsInSubject(questions: readonly ResolvedQuestion[], subjectId: string): void {
  if (questions.some((question) => question.subjectId !== subjectId)) {
    throw HttpError.badRequest('Those questions cannot be used.', [
      { path: 'questionIds', message: 'Every question must belong to the exam subject.' },
    ]);
  }
}

function toQuestionData(questions: readonly ResolvedQuestion[]): ExamQuestionData[] {
  return questions.map(({ questionId, position, marks }) => ({ questionId, position, marks }));
}

function toSubjectView(subject: SubjectRow): ExamSubjectView {
  return {
    id: subject.id,
    name: subject.name,
    code: subject.code,
    description: subject.description,
    status: subject.status,
  };
}

function toSummaryView(row: ExamRow): ExamSummaryView {
  const questions = row.questions as { marks: number }[];

  return {
    id: row.id,
    title: row.title,
    instructions: row.instructions,
    durationMinutes: row.durationMinutes,
    // Derived, never stored: a stored total would have to be kept in step with
    // the join rows by hand.
    totalMarks: questions.reduce((sum, question) => sum + question.marks, 0),
    status: row.status,
    subject: toSubjectView(row.subject),
    questionCount: questions.length,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toView(row: ExamRow): ExamView {
  const questions = row.questions as ExamQuestionRow[];

  return {
    ...toSummaryView(row),
    questions: questions.map((entry) => ({
      questionId: entry.questionId,
      position: entry.position,
      marks: entry.marks,
      question: toQuestionView(entry.question),
    })),
  };
}
