import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DatabaseClient } from '../db/prisma.js';
import { api, createFakeDatabase, signIn, startTestServer } from '../test/fake-database.js';

interface Paper {
  attemptId: string;
  examId: string;
  title: string;
  status: 'IN_PROGRESS' | 'SUBMITTED';
  totalMarks: number;
  questions: { questionId: string; text: string; options: { id: string; text: string }[] }[];
  answers: { questionId: string; selectedOptionId: string | null }[];
}

interface AvailableItem {
  id: string;
  title: string;
  questionCount: number;
  totalMarks: number;
  attemptId: string | null;
  attemptStatus: 'IN_PROGRESS' | 'SUBMITTED' | null;
  score: number | null;
  subject: { name: string; code: string };
}

interface Result {
  score: number;
  totalMarks: number;
  questionCount: number;
  answeredCount: number;
  status: 'SUBMITTED';
}

interface Seed {
  examId: string;
  first: { questionId: string; options: { id: string }[] };
  second: { questionId: string; options: { id: string }[] };
}

let database: DatabaseClient;
let fixtures: Awaited<ReturnType<typeof createFakeDatabase>>;
let baseUrl: string;
let stopServer: () => Promise<void>;
let student: string;
let otherStudent: string;
let faculty: string;
let seed: Seed;

/** One subject, two MCQs, and a published paper built from them. */
async function setup(): Promise<void> {
  fixtures = await createFakeDatabase();
  database = fixtures.database;

  const teacher = await fixtures.addUser('FACULTY', 'teacher@oes.test');
  await fixtures.addUser('STUDENT', 'student@oes.test');
  await fixtures.addUser('STUDENT', 'other@oes.test');
  const subject = await fixtures.addSubject('Operating Systems', 'CS204');

  const first = fixtures.addQuestion({
    subjectId: subject.id,
    createdById: teacher.id,
    text: 'Which scheduling algorithm can starve a process?',
    marks: 2,
    options: [
      { text: 'Round robin', isCorrect: false },
      { text: 'Priority scheduling', isCorrect: true },
    ],
  });

  const second = fixtures.addQuestion({
    subjectId: subject.id,
    createdById: teacher.id,
    text: 'What is a deadlock?',
    marks: 5,
    options: [
      { text: 'Circular wait', isCorrect: true },
      { text: 'High throughput', isCorrect: false },
    ],
  });

  const exam = fixtures.addPublishedExam({
    subjectId: subject.id,
    createdById: teacher.id,
    title: 'Operating Systems Mid-term',
    instructions: 'Answer every question.',
    durationMinutes: 45,
    questions: [{ question: first.question }, { question: second.question }],
  });

  seed = {
    examId: exam.id,
    first: { questionId: first.question.id, options: first.options },
    second: { questionId: second.question.id, options: second.options },
  };
}

beforeEach(async () => {
  await setup();

  const server = await startTestServer(database);
  baseUrl = server.baseUrl;
  stopServer = server.close;

  student = await signIn(baseUrl, 'student@oes.test');
  otherStudent = await signIn(baseUrl, 'other@oes.test');
  faculty = await signIn(baseUrl, 'teacher@oes.test');
});

afterEach(async () => {
  await stopServer();
});

async function start(cookie = student): Promise<Paper> {
  const response = await api(baseUrl, '/attempts', {
    method: 'POST',
    cookie,
    body: { examId: seed.examId },
  });

  expect(response.status).toBe(201);
  return (await response.json()) as Paper;
}

describe('student attempts', () => {
  it('lists published exams with their paper size and no attempt yet', async () => {
    const response = await api(baseUrl, '/attempts/exams', { cookie: student });
    expect(response.status).toBe(200);

    const { items } = (await response.json()) as { items: AvailableItem[] };

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: 'Operating Systems Mid-term',
      questionCount: 2,
      totalMarks: 7,
      attemptId: null,
      attemptStatus: null,
    });
    expect(items[0]?.subject).toEqual({
      id: expect.any(String),
      name: 'Operating Systems',
      code: 'CS204',
    });
  });

  it('never includes the answer key in the paper it hands a student', async () => {
    const paper = await start();

    expect(paper.questions[0]?.text).toBe('Which scheduling algorithm can starve a process?');
    expect(paper.questions[0]?.options).toEqual([
      { id: expect.any(String), text: 'Round robin' },
      { id: expect.any(String), text: 'Priority scheduling' },
    ]);

    const serialised = JSON.stringify(paper);
    expect(serialised).not.toContain('isCorrect');
    expect(serialised).not.toContain('explanation');
  });

  it('starts an attempt with the exam duration as its deadline', async () => {
    const paper = await start();

    expect(paper.status).toBe('IN_PROGRESS');
    expect(paper.totalMarks).toBe(7);
    expect(Date.parse(paper.expiresAt) - Date.parse(paper.startedAt)).toBe(45 * 60_000);
  });

  it('is idempotent: starting again resumes the same attempt', async () => {
    const first = await start();
    const second = await start();

    expect(second.attemptId).toBe(first.attemptId);
    expect(fixtures.attempts).toHaveLength(1);
  });

  it('reports the attempt on the list once one exists', async () => {
    const paper = await start();
    const response = await api(baseUrl, '/attempts/exams', { cookie: student });
    const { items } = (await response.json()) as { items: AvailableItem[] };

    expect(items[0]).toMatchObject({
      attemptId: paper.attemptId,
      attemptStatus: 'IN_PROGRESS',
    });
  });

  it('refuses to start an exam that is not published', async () => {
    const exam = fixtures.exams.find((row) => row.id === seed.examId);
    if (exam === undefined) throw new Error('seed exam missing');
    exam.status = 'DRAFT';

    const response = await api(baseUrl, '/attempts', {
      method: 'POST',
      cookie: student,
      body: { examId: seed.examId },
    });

    expect(response.status).toBe(404);
  });

  it('saves answers and reads them back on resume', async () => {
    const paper = await start();
    const optionId = seed.first.options[0]!.id;

    const saved = await api(baseUrl, `/attempts/${paper.attemptId}/answers`, {
      method: 'PUT',
      cookie: student,
      body: { answers: [{ questionId: seed.first.questionId, selectedOptionId: optionId }] },
    });

    expect(saved.status).toBe(200);
    expect(await saved.json()).toEqual({ attemptId: paper.attemptId, saved: 1 });

    const resumed = await api(baseUrl, `/attempts/${paper.attemptId}`, { cookie: student });
    const body = (await resumed.json()) as Paper;

    expect(body.answers).toEqual([
      { questionId: seed.first.questionId, selectedOptionId: optionId },
    ]);
  });

  it('rejects an answer for a question that is not on this exam', async () => {
    const paper = await start();
    const response = await api(baseUrl, `/attempts/${paper.attemptId}/answers`, {
      method: 'PUT',
      cookie: student,
      body: { answers: [{ questionId: 'question-from-another-paper', selectedOptionId: null }] },
    });

    expect(response.status).toBe(400);
  });

  it('marks the attempt and reports the score', async () => {
    const paper = await start();

    const response = await api(baseUrl, `/attempts/${paper.attemptId}/submit`, {
      method: 'POST',
      cookie: student,
      body: {
        answers: [
          { questionId: seed.first.questionId, selectedOptionId: seed.first.options[1]!.id },
          { questionId: seed.second.questionId, selectedOptionId: seed.second.options[0]!.id },
        ],
      },
    });

    expect(response.status).toBe(200);
    expect((await response.json()) as Result).toMatchObject({
      status: 'SUBMITTED',
      score: 7,
      totalMarks: 7,
      questionCount: 2,
      answeredCount: 2,
    });
  });

  it('awards nothing for a wrong answer but still counts it as answered', async () => {
    const paper = await start();

    const response = await api(baseUrl, `/attempts/${paper.attemptId}/submit`, {
      method: 'POST',
      cookie: student,
      body: {
        answers: [
          { questionId: seed.first.questionId, selectedOptionId: seed.first.options[0]!.id },
          { questionId: seed.second.questionId, selectedOptionId: null },
        ],
      },
    });

    expect(await response.json()).toMatchObject({ score: 0, answeredCount: 1 });
  });

  it('grades an empty submission as zero rather than failing', async () => {
    const paper = await start();
    const response = await api(baseUrl, `/attempts/${paper.attemptId}/submit`, {
      method: 'POST',
      cookie: student,
      body: { answers: [] },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ score: 0, answeredCount: 0 });
  });

  it('will not submit the same attempt twice', async () => {
    const paper = await start();

    await api(baseUrl, `/attempts/${paper.attemptId}/submit`, {
      method: 'POST',
      cookie: student,
      body: { answers: [] },
    });

    const again = await api(baseUrl, `/attempts/${paper.attemptId}/submit`, {
      method: 'POST',
      cookie: student,
      body: { answers: [] },
    });

    expect(again.status).toBe(409);
  });

  it('will not change the answers of a submitted attempt', async () => {
    const paper = await start();

    await api(baseUrl, `/attempts/${paper.attemptId}/submit`, {
      method: 'POST',
      cookie: student,
      body: { answers: [] },
    });

    const response = await api(baseUrl, `/attempts/${paper.attemptId}/answers`, {
      method: 'PUT',
      cookie: student,
      body: { answers: [] },
    });

    expect(response.status).toBe(409);
  });

  it("hides another student's attempt behind a 404", async () => {
    const paper = await start();
    const response = await api(baseUrl, `/attempts/${paper.attemptId}`, { cookie: otherStudent });

    expect(response.status).toBe(404);
  });

  it("refuses to submit another student's attempt", async () => {
    const paper = await start();
    const response = await api(baseUrl, `/attempts/${paper.attemptId}/submit`, {
      method: 'POST',
      cookie: otherStudent,
      body: { answers: [] },
    });

    expect(response.status).toBe(404);
  });

  it('keeps faculty and anonymous callers out', async () => {
    expect((await api(baseUrl, '/attempts/exams', { cookie: faculty })).status).toBe(403);
    expect((await api(baseUrl, '/attempts/exams')).status).toBe(401);
  });

  it('validates the start request', async () => {
    const response = await api(baseUrl, '/attempts', {
      method: 'POST',
      cookie: student,
      body: { examId: '' },
    });

    expect(response.status).toBe(400);
  });
});
