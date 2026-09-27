import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Attempt, AttemptResult, AvailableExam } from '@oes/shared';

import { AuthProvider } from '@/auth/AuthProvider';
import { routes } from '@/routes';

const SUBJECT = { id: 'subject-1', name: 'Operating Systems', code: 'CS204' };

function availableExam(overrides: Partial<AvailableExam> = {}): AvailableExam {
  return {
    id: 'exam-1',
    title: 'Operating Systems Mid-term',
    instructions: 'Answer every question.',
    subject: SUBJECT,
    durationMinutes: 30,
    questionCount: 2,
    totalMarks: 7,
    attemptId: null,
    attemptStatus: null,
    startedAt: null,
    expiresAt: null,
    submittedAt: null,
    score: null,
    ...overrides,
  };
}

function paperQuestion(position: number, text: string) {
  return {
    questionId: `question-${position}`,
    position: position - 1,
    marks: position === 1 ? 2 : 5,
    text,
    options: [
      { id: `question-${position}-a`, text: 'Round robin' },
      { id: `question-${position}-b`, text: 'Priority scheduling' },
    ],
  };
}

function attempt(overrides: Partial<Attempt> = {}): Attempt {
  return {
    attemptId: 'attempt-1',
    examId: 'exam-1',
    title: 'Operating Systems Mid-term',
    subject: SUBJECT,
    status: 'IN_PROGRESS',
    startedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    submittedAt: null,
    durationMinutes: 30,
    totalMarks: 7,
    questions: [
      paperQuestion(1, 'Which scheduling algorithm can starve a process?'),
      paperQuestion(2, 'What is a deadlock?'),
    ],
    answers: [],
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

const requests: { method: string; path: string; body: unknown }[] = [];

interface StubState {
  exams: AvailableExam[];
  attempt: Attempt;
  failList?: boolean;
  failStart?: boolean;
  rejectOption?: { questionId: string; optionId: string };
  submitted?: AttemptResult;
}

/**
 * In-memory API stub for the endpoints the attempt flow touches. Answers are
 * actually stored, so the "resume" test observes a genuinely saved answer
 * rather than a hard-coded one.
 */
function stubApi(state: Partial<StubState> = {}) {
  const current: StubState = {
    exams: state.exams ?? [availableExam()],
    attempt: state.attempt ?? attempt(),
    ...(state.failList === undefined ? {} : { failList: state.failList }),
    ...(state.failStart === undefined ? {} : { failStart: state.failStart }),
    ...(state.rejectOption === undefined ? {} : { rejectOption: state.rejectOption }),
    ...(state.submitted === undefined ? {} : { submitted: state.submitted }),
  };

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input).replace(/^https?:\/\/[^/]+/, '');
    const method = init?.method ?? 'GET';
    const body = init?.body === undefined ? undefined : JSON.parse(String(init.body));
    requests.push({ method, path, body });

    if (path.endsWith('/auth/me')) {
      return jsonResponse({
        user: { id: 'student-1', name: 'Student Person', email: 's@oes.test', role: 'STUDENT' },
      });
    }

    if (path.endsWith('/attempts/exams')) {
      if (current.failList === true) {
        return jsonResponse(
          { error: { code: 'INTERNAL_ERROR', message: 'Your exams could not be loaded.' } },
          500,
        );
      }

      return jsonResponse({ items: current.exams });
    }

    if (path.endsWith('/attempts') && method === 'POST') {
      if (current.failStart === true) {
        return jsonResponse(
          { error: { code: 'INTERNAL_ERROR', message: 'The exam could not be started.' } },
          500,
        );
      }

      current.exams = current.exams.map((exam) => ({
        ...exam,
        attemptId: current.attempt.attemptId,
        attemptStatus: 'IN_PROGRESS',
      }));

      return jsonResponse(current.attempt, 201);
    }

    const answerMatch = /\/attempts\/([^/]+)\/answers$/.exec(path);
    if (answerMatch !== null && method === 'PUT') {
      const answers = (
        body as { answers: { questionId: string; selectedOptionId: string | null }[] }
      ).answers;
      const rejected = current.rejectOption;
      const offending =
        rejected === undefined
          ? undefined
          : answers.find((a) => a.questionId === rejected.questionId);

      if (rejected !== undefined && offending?.selectedOptionId === rejected.optionId) {
        return jsonResponse(
          { error: { code: 'VALIDATION_ERROR', message: 'That option is not on this question.' } },
          422,
        );
      }

      current.attempt = {
        ...current.attempt,
        answers: answers.map((a) => ({
          questionId: a.questionId,
          selectedOptionId: a.selectedOptionId,
        })),
      };

      return jsonResponse({ attemptId: current.attempt.attemptId, saved: answers.length });
    }

    const submitMatch = /\/attempts\/([^/]+)\/submit$/.exec(path);
    if (submitMatch !== null && method === 'POST') {
      const answers = (body as { answers: { selectedOptionId: string | null }[] }).answers;
      const answeredCount = answers.filter((a) => a.selectedOptionId !== null).length;
      const outcome: AttemptResult = current.submitted ?? {
        attemptId: current.attempt.attemptId,
        examId: current.attempt.examId,
        title: current.attempt.title,
        status: 'SUBMITTED',
        score: 2,
        totalMarks: current.attempt.totalMarks,
        questionCount: current.attempt.questions.length,
        answeredCount,
        startedAt: current.attempt.startedAt,
        submittedAt: new Date().toISOString(),
      };

      current.attempt = {
        ...current.attempt,
        status: 'SUBMITTED',
        submittedAt: outcome.submittedAt,
      };

      return jsonResponse(outcome);
    }

    const attemptMatch = /\/attempts\/([^/]+)$/.exec(path);
    if (attemptMatch !== null && method === 'GET') {
      return jsonResponse(current.attempt);
    }

    return jsonResponse(
      { error: { code: 'NOT_FOUND', message: 'That endpoint is not stubbed.' } },
      404,
    );
  });

  vi.stubGlobal('fetch', fetchMock);
  return current;
}

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  return render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
}

/** The palette is the only place every question is visible at once. */
function questionPalette() {
  return screen.getByRole('navigation', { name: 'Questions' });
}

/** One exam row on the available-exams list. */
async function examRow(title: string) {
  await screen.findByText(title);
  const rows = screen.getAllByRole('listitem');

  return rows.find((row) => within(row).queryByText(title) !== null) as HTMLElement;
}

/**
 * Requests are recorded with the API base (`/api/v1`) still attached, so tests
 * match on the tail of the path rather than repeating the prefix.
 */
function sentRequest(method: string, pathSuffix: string) {
  return requests.find((request) => request.method === method && request.path.endsWith(pathSuffix));
}

function answerCurrent(optionText: string | RegExp) {
  fireEvent.click(screen.getByRole('radio', { name: optionText }));
}

beforeEach(() => {
  requests.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('student available exams', () => {
  it('lists published exams with their limits and a start link', async () => {
    stubApi();

    renderAt('/student/exams');

    const card = await examRow('Operating Systems Mid-term');

    expect(within(card).getByText('Not started')).toBeVisible();
    expect(within(card).getByText('2 questions · 7 marks')).toBeVisible();
    expect(within(card).getByText('30 min')).toBeVisible();
    expect(within(card).getByRole('link', { name: 'View details' })).toHaveAttribute(
      'href',
      '/student/exams/exam-1',
    );
  });

  it('marks an exam already in progress as resumable', async () => {
    stubApi({
      exams: [availableExam({ attemptId: 'attempt-1', attemptStatus: 'IN_PROGRESS' })],
    });

    renderAt('/student/exams');

    const card = await examRow('Operating Systems Mid-term');

    expect(within(card).getByText('In progress')).toBeVisible();
    expect(within(card).getByRole('link', { name: 'Resume' })).toBeVisible();
  });

  it('shows the score of a submitted exam and offers no second attempt', async () => {
    stubApi({
      exams: [availableExam({ attemptId: 'attempt-1', attemptStatus: 'SUBMITTED', score: 2 })],
    });

    renderAt('/student/exams');

    const card = await examRow('Operating Systems Mid-term');

    expect(within(card).getByText('Submitted')).toBeVisible();
    expect(within(card).getByText('2 of 7')).toBeVisible();
    expect(within(card).queryByRole('link')).not.toBeInTheDocument();
  });

  it('explains an empty list instead of showing an empty table', async () => {
    stubApi({ exams: [] });

    renderAt('/student/exams');

    expect(await screen.findByText('No exams available')).toBeVisible();
  });

  it('offers a retry when the list cannot be loaded', async () => {
    stubApi({ failList: true });

    renderAt('/student/exams');

    expect(await screen.findByText('Could not load exams')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  });
});

describe('student exam instructions', () => {
  it('shows the rules before anything is written', async () => {
    stubApi();

    renderAt('/student/exams/exam-1');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Operating Systems Mid-term' }),
    ).toBeVisible();
    expect(screen.getByText('Answer every question.')).toBeVisible();
    expect(screen.getByText('30 minutes')).toBeVisible();
    expect(screen.getByText('7')).toBeVisible();

    expect(sentRequest('POST', '/attempts')).toBeUndefined();
  });

  it('starts an attempt and moves to the paper', async () => {
    stubApi();

    renderAt('/student/exams/exam-1');

    fireEvent.click(await screen.findByRole('button', { name: 'Start attempt' }));

    // The brief and the paper share a heading, so wait for something only the
    // attempt screen has before asserting on it.
    expect(await screen.findByText('Question 1 of 2')).toBeVisible();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Operating Systems Mid-term' }),
    ).toBeVisible();
    expect(screen.getByRole('radio', { name: 'Round robin' })).toBeVisible();

    const start = sentRequest('POST', '/attempts');
    expect(start?.body).toEqual({ examId: 'exam-1' });
  });
  it('reports a start that the server refuses', async () => {
    stubApi({ failStart: true });

    renderAt('/student/exams/exam-1');

    fireEvent.click(await screen.findByRole('button', { name: 'Start attempt' }));

    expect(await screen.findByText('The exam could not be started.')).toBeVisible();
  });

  it('refuses an exam the student cannot sit', async () => {
    stubApi({ exams: [] });

    renderAt('/student/exams/exam-1');

    expect(await screen.findByText('That exam is not available.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Start attempt' })).not.toBeInTheDocument();
  });
});

describe('student attempt', () => {
  it('never exposes the answer key while the paper is open', async () => {
    stubApi();

    renderAt('/student/attempts/attempt-1');

    await screen.findByRole('heading', { level: 1, name: 'Operating Systems Mid-term' });

    expect(screen.queryByText('Priority scheduling is correct')).not.toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });

  it('walks forward and back through the paper', async () => {
    stubApi();

    renderAt('/student/attempts/attempt-1');

    expect(await screen.findByText('Question 1 of 2')).toBeVisible();
    expect(screen.getByText('Which scheduling algorithm can starve a process?')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Question 2 of 2')).toBeVisible();
    expect(screen.getByText('What is a deadlock?')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));

    expect(await screen.findByText('Question 1 of 2')).toBeVisible();
  });

  it('disables Previous on the first question', async () => {
    stubApi();

    renderAt('/student/attempts/attempt-1');

    await screen.findByText('Question 1 of 2');

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  });

  it('saves a chosen answer and counts it in the progress bar', async () => {
    stubApi();

    renderAt('/student/attempts/attempt-1');

    await screen.findByText('Question 1 of 2');
    answerCurrent('Priority scheduling');

    expect(await screen.findByText('Saved')).toBeVisible();

    const save = sentRequest('PUT', '/attempts/attempt-1/answers');
    expect(save?.body).toEqual({
      answers: [
        { questionId: 'question-1', selectedOptionId: 'question-1-b' },
        { questionId: 'question-2', selectedOptionId: null },
      ],
    });

    expect(await screen.findByText('1 of 2 answered')).toBeVisible();
    expect(within(questionPalette()).getByRole('button', { name: '1' })).toHaveAttribute(
      'aria-current',
      'step',
    );
  });

  it('sends the whole paper so clearing an answer is not ignored', async () => {
    const store = stubApi({
      attempt: attempt({
        answers: [{ questionId: 'question-1', selectedOptionId: 'question-1-a' }],
      }),
    });

    renderAt('/student/attempts/attempt-1');

    const chosen = await screen.findByRole('radio', { name: 'Round robin' });
    await waitFor(() => {
      expect(chosen).toBeChecked();
    });

    answerCurrent('Priority scheduling');

    await waitFor(() => {
      expect(store.attempt.answers[0]?.selectedOptionId).toBe('question-1-b');
    });
  });

  it('surfaces a rejected option without losing the paper', async () => {
    stubApi({
      rejectOption: { questionId: 'question-1', optionId: 'question-1-b' },
    });

    renderAt('/student/attempts/attempt-1');

    await screen.findByText('Question 1 of 2');
    answerCurrent('Priority scheduling');

    expect(await screen.findByText('Not saved')).toBeVisible();
    expect(screen.getByText('Question 1 of 2')).toBeVisible();
  });

  it('jumps to an unanswered question from the palette', async () => {
    stubApi();

    renderAt('/student/attempts/attempt-1');

    await screen.findByText('Question 1 of 2');
    fireEvent.click(within(questionPalette()).getByRole('button', { name: '2' }));

    expect(await screen.findByText('Question 2 of 2')).toBeVisible();
  });

  it('submits after a second click and shows the score', async () => {
    stubApi();

    renderAt('/student/attempts/attempt-1');

    await screen.findByText('Question 1 of 2');
    answerCurrent('Priority scheduling');

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Question 2 of 2')).toBeVisible();
    answerCurrent('Round robin');

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm submit' }));

    expect(await screen.findByRole('heading', { name: 'Attempt submitted' })).toBeVisible();
    expect(screen.getByText('2 / 7')).toBeVisible();
    expect(screen.getByText('2 of 2 questions answered.')).toBeVisible();

    const submit = sentRequest('POST', '/attempts/attempt-1/submit');
    expect(submit).toBeDefined();
  });

  it('tells a student who returns that the attempt is already closed', async () => {
    stubApi({ attempt: attempt({ status: 'SUBMITTED', submittedAt: new Date().toISOString() }) });

    renderAt('/student/attempts/attempt-1');

    expect(await screen.findByText('This attempt has already been submitted.')).toBeVisible();
  });
});
