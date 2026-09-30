import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Attempt, DemoState, Exam, Question } from './data';
import { seedState } from './data';

const STORAGE_KEY = 'oes-demo-state-v1';

/**
 * Persistence is the whole "database" of this prototype: one localStorage key
 * holding the demo state. If it is missing or unreadable the demo falls back to
 * the seed rather than refusing to start, so a stale or hand-edited value can
 * never brick the prototype.
 */
function load(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw === null) {
      return seedState();
    }

    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'questions' in parsed &&
      'exams' in parsed &&
      'attempts' in parsed
    ) {
      return parsed as DemoState;
    }
  } catch {
    // Fall through to a clean seed.
  }

  return seedState();
}

export function useDemoStore() {
  const [state, setState] = useState<DemoState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // A full or blocked storage quota only costs us persistence, not the demo.
    }
  }, [state]);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(seedState());
  }, []);

  return useMemo(() => ({ state, setState, reset }), [state, reset]);
}

export type Store = ReturnType<typeof useDemoStore>;

/* -------------------------------------------------------------------------- */
/* Grading and derived views                                                   */
/* -------------------------------------------------------------------------- */

/** Marks earned by a set of answers. Grading lives here, never in the UI. */
export function grade(exam: Exam, questions: Question[], answers: Attempt['answers']): number {
  return exam.questionIds.reduce((total, questionId) => {
    const question = questions.find((candidate) => candidate.id === questionId);
    const correct = question?.options.find((option) => option.isCorrect);

    if (correct === undefined || question === undefined) {
      return total;
    }

    return answers[questionId] === correct.id ? total + question.marks : total;
  }, 0);
}

export function examMarks(exam: Exam, questions: Question[]): number {
  return exam.questionIds.reduce((total, id) => {
    return total + (questions.find((question) => question.id === id)?.marks ?? 0);
  }, 0);
}

/** Only published exams are visible to a student. */
export function publishedExams(state: DemoState): Exam[] {
  return state.exams.filter((exam) => exam.status === 'PUBLISHED');
}

/** The one attempt a student may have per exam, or undefined if not started. */
export function attemptFor(state: DemoState, examId: string): Attempt | undefined {
  return state.attempts.find((attempt) => attempt.examId === examId);
}

export function isSubmitted(attempt: Attempt | undefined): boolean {
  return attempt !== undefined && attempt.submittedAt !== null;
}

/* -------------------------------------------------------------------------- */
/* Ids                                                                        */
/* -------------------------------------------------------------------------- */

let counter = 0;

/** Short, readable and collision-free enough for a single-browser demo. */
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter}`;
}

/**
 * Builds the record for a freshly started attempt. The clock and the id are
 * generated here rather than in a component so that starting an exam is one
 * obvious step, and so components never read the time directly.
 */
export function newAttempt(exam: Exam): Attempt {
  const startedAt = Date.now();

  return {
    id: nextId('attempt'),
    examId: exam.id,
    startedAt,
    expiresAt: startedAt + exam.durationMinutes * 60_000,
    answers: {},
    submittedAt: null,
    score: null,
  };
}
