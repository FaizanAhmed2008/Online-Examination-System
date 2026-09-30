import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  gradeAttempt,
  initialState,
  type Attempt,
  type Exam,
  type Question,
  type Role,
  type State,
  type User,
} from './data';

const STORAGE_KEY = 'oes-state-v1';

/** Fewer than this is never accepted as a password. */
export const MIN_PASSWORD_LENGTH = 6;

function looksLikeState(value: unknown): value is State {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    Array.isArray(candidate['users']) &&
    Array.isArray(candidate['questions']) &&
    Array.isArray(candidate['exams']) &&
    Array.isArray(candidate['attempts'])
  );
}

/**
 * Reads what is stored, falling back to the starting state when the key is
 * missing or holds something unusable, so a stale value can never lock someone
 * out of the application.
 */
function read(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);

      if (looksLikeState(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Unreadable storage just means we start from the beginning.
  }

  return initialState();
}

export function useStore() {
  const [state, setState] = useState<State>(read);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // A full or blocked storage quota only costs persistence, not the session.
    }
  }, [state]);

  /** Puts every account, paper and attempt back to how they started. */
  const restore = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(initialState());
  }, []);

  return useMemo(() => ({ state, setState, restore }), [state, restore]);
}

export type Store = ReturnType<typeof useStore>;

/* -------------------------------------------------------------------------- */
/* Accounts                                                                   */
/* -------------------------------------------------------------------------- */

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function signIn(state: State, email: string, password: string): User | null {
  const found = state.users.find((user) => user.email === normaliseEmail(email));

  if (found === undefined || found.password !== password) {
    return null;
  }

  return found;
}

export type CreateUserOutcome = { ok: true; user: User } | { ok: false; error: string };

/**
 * Creates an account. Both the sign-up screen and a lecturer adding a student by
 * hand go through here, so name/email/password rules cannot drift apart.
 */
export function createUser(
  state: State,
  input: { name: string; email: string; password: string; role: Role },
): CreateUserOutcome {
  const name = input.name.trim();
  const email = normaliseEmail(input.email);

  if (name.length === 0) {
    return { ok: false, error: 'Enter the full name.' };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }

  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `The password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  if (state.users.some((user) => user.email === email)) {
    return { ok: false, error: 'An account already uses that email address.' };
  }

  const user: User = {
    id: nextId(input.role === 'STUDENT' ? 'student' : 'faculty'),
    name,
    email,
    password: input.password,
    role: input.role,
    createdAt: new Date().toISOString(),
  };

  return { ok: true, user };
}

/* -------------------------------------------------------------------------- */
/* Current user                                                               */
/* -------------------------------------------------------------------------- */

export function currentUser(state: State): User | null {
  return state.users.find((user) => user.id === state.sessionUserId) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Queries                                                                    */
/* -------------------------------------------------------------------------- */

/** Papers a student may sit: published only. */
export function visibleExams(state: State): Exam[] {
  return state.exams.filter((exam) => exam.status === 'PUBLISHED');
}

/** Papers a lecturer owns. */
export function ownExams(state: State, facultyId: string): Exam[] {
  return state.exams.filter((exam) => exam.createdById === facultyId);
}

/** A student may have one attempt per paper. */
export function attemptFor(state: State, examId: string, studentId: string): Attempt | undefined {
  return state.attempts.find(
    (attempt) => attempt.examId === examId && attempt.studentId === studentId,
  );
}

export function isSubmitted(attempt: Attempt | undefined): boolean {
  return attempt !== undefined && attempt.submittedAt !== null;
}

/** Questions of a paper, in the order they appear on it. */
export function paperQuestions(exam: Exam, questions: Question[]): Question[] {
  return exam.questionIds
    .map((id) => questions.find((question) => question.id === id))
    .filter((question): question is Question => question !== undefined);
}

export { gradeAttempt };

/* -------------------------------------------------------------------------- */
/* Ids                                                                        */
/* -------------------------------------------------------------------------- */

let counter = 0;

/** Short and collision-free enough for records held in one browser. */
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter}`;
}

/**
 * Builds the record for a freshly started attempt. The clock and the id are
 * generated here rather than in a component so that starting a paper is one
 * obvious step, and so no component reads the time directly.
 */
export function newAttempt(exam: Exam, studentId: string): Attempt {
  const startedAt = Date.now();

  return {
    id: nextId('attempt'),
    examId: exam.id,
    studentId,
    startedAt,
    expiresAt: startedAt + exam.durationMinutes * 60_000,
    answers: {},
    submittedAt: null,
    score: null,
  };
}
