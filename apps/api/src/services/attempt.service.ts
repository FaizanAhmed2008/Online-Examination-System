import type {
  AttemptAnswerInput,
  AvailableExam,
  PaperQuestion,
  SaveAnswersResponse,
  StartAttemptRequest,
} from '@oes/shared';

import type { DatabaseClient } from '../db/prisma.js';
import { HttpError } from '../lib/http-error.js';
import type { AuthenticatedUser } from './auth.service.js';
import { AttemptStatus, ExamStatus, SubjectStatus } from '../generated/prisma/client.js';

export interface AttemptServiceDependencies {
  database: DatabaseClient;
}

interface SubjectRow {
  id: string;
  name: string;
  code: string;
  status: string;
}

interface ExamQuestionRow {
  questionId: string;
  position: number;
  marks: number;
  question: {
    id: string;
    text: string;
    options: { id: string; text: string; isCorrect: boolean }[];
  };
}

interface AttemptRow {
  id: string;
  examId: string;
  studentId: string;
  status: 'IN_PROGRESS' | 'SUBMITTED';
  startedAt: Date;
  expiresAt: Date;
  submittedAt: Date | null;
  score: number | null;
}

export interface AttemptView {
  attemptId: string;
  examId: string;
  title: string;
  subject: { id: string; name: string; code: string };
  status: 'IN_PROGRESS' | 'SUBMITTED';
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
  durationMinutes: number;
  totalMarks: number;
  questions: PaperQuestion[];
  answers: { questionId: string; selectedOptionId: string | null }[];
}

export interface AttemptResultView {
  attemptId: string;
  examId: string;
  title: string;
  status: 'SUBMITTED';
  score: number;
  totalMarks: number;
  questionCount: number;
  answeredCount: number;
  startedAt: string;
  submittedAt: string;
}

/**
 * Papers a student may sit, each paired with that student's own attempt.
 *
 * Two filters decide visibility, and both are about the *exam* rather than the
 * student: the exam is published, and its subject is still active. Anything
 * else is invisible, so an unpublished or retired exam cannot be probed by
 * guessing an id.
 */
const AVAILABLE_INCLUDE = {
  subject: true,
  questions: { select: { marks: true } },
} as const;

const PAPER_INCLUDE = {
  subject: true,
  questions: {
    orderBy: { position: 'asc' },
    include: { question: { include: { options: { orderBy: { id: 'asc' } } } } },
  },
} as const;

const ATTEMPT_INCLUDE = {
  exam: {
    include: {
      subject: true,
      questions: {
        orderBy: { position: 'asc' },
        include: { question: { include: { options: { orderBy: { id: 'asc' } } } } },
      },
    },
  },
  answers: { select: { questionId: true, selectedOptionId: true } },
} as const;

export async function listAvailableExams(
  actor: AuthenticatedUser,
  { database }: AttemptServiceDependencies,
): Promise<{ items: AvailableExam[] }> {
  const exams = await database.exam.findMany({
    where: {
      status: ExamStatus.PUBLISHED,
      subject: { status: SubjectStatus.ACTIVE },
    },
    include: AVAILABLE_INCLUDE,
    orderBy: { updatedAt: 'desc' },
  });

  const attempts = await database.attempt.findMany({
    where: { studentId: actor.id },
    select: {
      id: true,
      examId: true,
      status: true,
      startedAt: true,
      expiresAt: true,
      submittedAt: true,
      score: true,
    },
  });

  const byExam = new Map(attempts.map((attempt) => [attempt.examId, attempt]));

  return {
    items: exams.map((row) => {
      const attempt = byExam.get(row.id);
      const marks = (row.questions as { marks: number }[]).map((question) => question.marks);

      return {
        id: row.id,
        title: row.title,
        instructions: row.instructions,
        subject: {
          id: row.subject.id,
          name: row.subject.name,
          code: row.subject.code,
        },
        durationMinutes: row.durationMinutes,
        questionCount: marks.length,
        totalMarks: marks.reduce((sum, value) => sum + value, 0),
        attemptId: attempt?.id ?? null,
        attemptStatus: attempt?.status ?? null,
        startedAt: attempt === undefined ? null : attempt.startedAt.toISOString(),
        expiresAt: attempt === undefined ? null : attempt.expiresAt.toISOString(),
        submittedAt: attempt?.submittedAt == null ? null : attempt.submittedAt.toISOString(),
        score: attempt?.score ?? null,
      };
    }),
  };
}

/**
 * Starts an attempt, or hands back the one already in flight.
 *
 * "Start" is idempotent because the MVP allows one attempt per student per exam:
 * a double click, a refresh, or a second tab must not consume a second try. The
 * unique pair on the table is the backstop, so two concurrent starts cannot both
 * win.
 */
export async function startAttempt(
  input: StartAttemptRequest,
  actor: AuthenticatedUser,
  { database }: AttemptServiceDependencies,
): Promise<AttemptView> {
  const existing = await findAttemptByExam(input.examId, actor.id, database);

  if (existing !== null) {
    return getAttempt(existing.id, actor, { database });
  }

  const exam = await database.exam.findUnique({
    where: { id: input.examId },
    include: PAPER_INCLUDE,
  });

  if (exam === null || exam.status !== ExamStatus.PUBLISHED) {
    throw HttpError.notFound('That exam is not available.');
  }

  if (exam.subject.status !== SubjectStatus.ACTIVE) {
    throw HttpError.notFound('That exam is not available.');
  }

  if (exam.questions.length === 0) {
    throw HttpError.conflict('That exam has no questions yet.');
  }

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + exam.durationMinutes * 60_000);

  const created = await database.attempt.create({
    data: { examId: exam.id, studentId: actor.id, startedAt, expiresAt },
    include: ATTEMPT_INCLUDE,
  });

  return toAttemptView(created);
}

/** Reads an attempt for resume, including the answers already given. */
export async function getAttempt(
  id: string,
  actor: AuthenticatedUser,
  { database }: AttemptServiceDependencies,
): Promise<AttemptView> {
  const row = await findOwnAttempt(id, actor, database);
  return toAttemptView(row);
}

/**
 * Autosave. Answers are written by question id and only while the attempt is in
 * progress, so a late request cannot reopen a submitted attempt.
 */
export async function saveAnswers(
  id: string,
  answers: readonly AttemptAnswerInput[],
  actor: AuthenticatedUser,
  { database }: AttemptServiceDependencies,
): Promise<SaveAnswersResponse> {
  const row = await findOwnAttempt(id, actor, database);
  const exam = await loadPaperFor(row.examId, database);

  assertAnswersBelongToExam(answers, exam.questions);
  assertIsInProgress(row.status, 'change the answers on');

  for (const answer of answers) {
    await database.attemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId: id, questionId: answer.questionId } },
      create: {
        attemptId: id,
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId,
      },
      update: { selectedOptionId: answer.selectedOptionId },
    });
  }

  return { attemptId: id, saved: answers.length };
}

/**
 * Submits and marks the attempt.
 *
 * Marking is server-side and single-choice only: an answer is correct when the
 * option the student chose is the option flagged correct on that question, and
 * it earns the marks the question carries *in this exam*. The client is never
 * asked what it thinks the score is, and never sees `isCorrect` beforehand.
 */
export async function submitAttempt(
  id: string,
  answers: readonly AttemptAnswerInput[],
  actor: AuthenticatedUser,
  { database }: AttemptServiceDependencies,
): Promise<AttemptResultView> {
  const row = await findOwnAttempt(id, actor, database);
  const exam = await loadPaperFor(row.examId, database);

  assertAnswersBelongToExam(answers, exam.questions);

  if (row.status === AttemptStatus.SUBMITTED) {
    throw HttpError.conflict('That attempt has already been submitted.');
  }

  // Saving and marking are the same upsert loop, so a submission that also
  // carries answers cannot leave the two paths disagreeing.
  let score = 0;
  let answeredCount = 0;

  for (const entry of exam.questions) {
    const given = answers.find((answer) => answer.questionId === entry.questionId);
    const selected =
      given === undefined || given.selectedOptionId === null
        ? null
        : (entry.question.options.find((option) => option.id === given.selectedOptionId) ?? null);

    const isCorrect = selected?.isCorrect === true;

    if (selected !== null) {
      answeredCount += 1;
    }

    if (isCorrect) {
      score += entry.marks;
    }

    await database.attemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId: id, questionId: entry.questionId } },
      create: {
        attemptId: id,
        questionId: entry.questionId,
        selectedOptionId: selected?.id ?? null,
        isCorrect: selected !== null ? isCorrect : null,
        marksAwarded: isCorrect ? entry.marks : 0,
      },
      update: {
        selectedOptionId: selected?.id ?? null,
        isCorrect: selected !== null ? isCorrect : null,
        marksAwarded: isCorrect ? entry.marks : 0,
      },
    });
  }

  const submittedAt = new Date();

  await database.attempt.update({
    where: { id },
    data: { status: AttemptStatus.SUBMITTED, submittedAt, score },
  });

  return {
    attemptId: id,
    examId: row.examId,
    title: exam.title,
    status: 'SUBMITTED',
    score,
    totalMarks: exam.questions.reduce((sum, entry) => sum + entry.marks, 0),
    questionCount: exam.questions.length,
    answeredCount,
    startedAt: row.startedAt.toISOString(),
    submittedAt: submittedAt.toISOString(),
  };
}

async function findOwnAttempt(
  id: string,
  actor: AuthenticatedUser,
  database: DatabaseClient,
): Promise<AttemptRow & { exam: unknown }> {
  const row = await database.attempt.findUnique({ where: { id }, include: ATTEMPT_INCLUDE });

  // One answer for "missing" and "someone else's": the response is identical.
  if (row === null || row.studentId !== actor.id) {
    throw HttpError.notFound('That attempt does not exist.');
  }

  return row;
}

async function findAttemptByExam(
  examId: string,
  studentId: string,
  database: DatabaseClient,
): Promise<AttemptRow | null> {
  return database.attempt.findFirst({ where: { examId, studentId } });
}

interface PaperRow {
  id: string;
  title: string;
  durationMinutes: number;
  subject: SubjectRow;
  questions: ExamQuestionRow[];
}

async function loadPaperFor(examId: string, database: DatabaseClient): Promise<PaperRow> {
  const exam = await database.exam.findUnique({ where: { id: examId }, include: PAPER_INCLUDE });

  if (exam === null) {
    throw HttpError.notFound('That exam does not exist.');
  }

  return exam as PaperRow;
}

/**
 * An answer may only name a question on this exam. Without this a student could
 * write marks against a question from another paper, or enumerate ids.
 */
function assertAnswersBelongToExam(
  answers: readonly AttemptAnswerInput[],
  questions: readonly ExamQuestionRow[],
): void {
  const known = new Set(questions.map((entry) => entry.questionId));
  const stray = answers.find((answer) => !known.has(answer.questionId));

  if (stray !== undefined) {
    throw HttpError.badRequest('Those answers are not valid.', [
      { path: 'answers', message: `Question ${stray.questionId} is not on this exam.` },
    ]);
  }
}

function assertIsInProgress(status: 'IN_PROGRESS' | 'SUBMITTED', action: string): void {
  if (status === AttemptStatus.SUBMITTED) {
    throw HttpError.conflict(`You cannot ${action} a submitted attempt.`);
  }
}

/** Strips the answer key: the student view carries text and choices only. */
function toPaperQuestion(entry: ExamQuestionRow): PaperQuestion {
  return {
    questionId: entry.questionId,
    position: entry.position,
    marks: entry.marks,
    text: entry.question.text,
    options: entry.question.options.map((option) => ({ id: option.id, text: option.text })),
  };
}

function toAttemptView(row: AttemptRow & { exam: unknown }): AttemptView {
  const exam = row.exam as PaperRow;
  const answers = (row as { answers?: { questionId: string; selectedOptionId: string | null }[] })
    .answers;

  return {
    attemptId: row.id,
    examId: row.examId,
    title: exam.title,
    subject: { id: exam.subject.id, name: exam.subject.name, code: exam.subject.code },
    status: row.status,
    startedAt: row.startedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    submittedAt: row.submittedAt?.toISOString() ?? null,
    durationMinutes: exam.durationMinutes,
    totalMarks: exam.questions.reduce((sum, entry) => sum + entry.marks, 0),
    questions: exam.questions.map(toPaperQuestion),
    answers: (answers ?? []).map((answer) => ({
      questionId: answer.questionId,
      selectedOptionId: answer.selectedOptionId,
    })),
  };
}
