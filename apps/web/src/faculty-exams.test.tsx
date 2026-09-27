import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExamStatus, Question, Subject, UserRole } from '@oes/shared';

import { AuthProvider } from '@/auth/AuthProvider';
import { routes } from '@/routes';

const SUBJECTS: Subject[] = [
  {
    id: 'subject-1',
    name: 'Operating Systems',
    code: 'CS204',
    description: null,
    status: 'ACTIVE',
  },
  { id: 'subject-2', name: 'Networks', code: 'CS305', description: null, status: 'ACTIVE' },
];

function question(overrides: Partial<Question> = {}): Question {
  return {
    id: 'question-1',
    text: 'Which scheduling algorithm can starve a process?',
    type: 'SINGLE_CHOICE',
    marks: 2,
    explanation: null,
    status: 'ACTIVE',
    subject: SUBJECTS[0]!,
    options: [
      { id: 'option-1', text: 'Round robin', isCorrect: false },
      { id: 'option-2', text: 'Priority scheduling', isCorrect: true },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const QUESTIONS: Question[] = [
  question(),
  question({ id: 'question-2', text: 'What is a deadlock?', marks: 5 }),
  question({ id: 'question-3', text: 'What is a subnet mask?', subject: SUBJECTS[1]! }),
];

function exam(overrides: Record<string, unknown> = {}) {
  return {
    id: 'exam-1',
    title: 'Operating Systems Mid-term',
    instructions: 'Answer every question.',
    durationMinutes: 45,
    totalMarks: 2,
    status: 'DRAFT' as ExamStatus,
    subject: SUBJECTS[0]!,
    questionCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

/** The full exam shape, which the list omits and the editor and preview need. */
function fullExam(overrides: Record<string, unknown> = {}) {
  return {
    ...exam(),
    questions: [
      {
        questionId: 'question-1',
        position: 0,
        marks: 2,
        question: QUESTIONS[0]!,
      },
    ],
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

interface StubState {
  exams: Record<string, unknown>[];
  questions: Question[];
  subjects: Subject[];
  role: UserRole;
  failList?: boolean;
  /** Rejects exam creation with a field-level validation error. */
  rejectCreate?: { path: string; message: string };
}

const requests: { method: string; url: string; body: unknown }[] = [];

/**
 * In-memory API stub covering the endpoints the page touches, so the screen is
 * exercised through the same code path production uses.
 */
function stubApi(state: Partial<StubState> = {}) {
  const current: StubState = {
    exams: state.exams ?? [],
    questions: state.questions ?? QUESTIONS,
    subjects: state.subjects ?? SUBJECTS,
    role: state.role ?? 'FACULTY',
    ...(state.failList === undefined ? {} : { failList: state.failList }),
    ...(state.rejectCreate === undefined ? {} : { rejectCreate: state.rejectCreate }),
  };

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    const query = path.includes('?') ? path.slice(path.indexOf('?')) : '';
    const body = init?.body === undefined ? undefined : JSON.parse(String(init.body));
    requests.push({ method, url: path, body });

    if (path.endsWith('/auth/me')) {
      return jsonResponse({
        user: { id: 'faculty-1', name: 'Faculty Person', email: 'f@oes.test', role: current.role },
      });
    }

    if (path.includes('/subjects')) {
      return jsonResponse({ items: current.subjects });
    }

    if (path.includes('/questions')) {
      return jsonResponse({
        items: current.questions,
        page: 1,
        pageSize: 50,
        total: current.questions.length,
      });
    }

    if (path.includes('/exams') && method === 'GET' && !path.includes('/exams/')) {
      if (current.failList === true) {
        return jsonResponse(
          { error: { code: 'INTERNAL_ERROR', message: 'Your exams could not be loaded.' } },
          500,
        );
      }

      const wanted = new URLSearchParams(query).get('status');
      const items =
        wanted === null ? current.exams : current.exams.filter((e) => e['status'] === wanted);

      return jsonResponse({ items, page: 1, pageSize: 20, total: items.length });
    }

    if (path.includes('/exams') && method === 'POST' && path.endsWith('/publish')) {
      const id = path.split('/').at(-2) ?? '';
      const stored = current.exams.find((e) => e['id'] === id);
      if (stored === undefined) {
        return jsonResponse(
          { error: { code: 'NOT_FOUND', message: 'That exam does not exist.' } },
          404,
        );
      }
      stored['status'] = 'PUBLISHED';
      return jsonResponse(stored);
    }

    if (path.includes('/exams') && method === 'POST' && path.endsWith('/unpublish')) {
      const id = path.split('/').at(-2) ?? '';
      const stored = current.exams.find((e) => e['id'] === id);
      if (stored === undefined) {
        return jsonResponse(
          { error: { code: 'NOT_FOUND', message: 'That exam does not exist.' } },
          404,
        );
      }
      stored['status'] = 'DRAFT';
      return jsonResponse(stored);
    }

    if (path.includes('/exams') && method === 'POST' && !path.includes('/exams/')) {
      if (current.rejectCreate !== undefined) {
        return jsonResponse(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'The exam is not valid.',
              details: [current.rejectCreate],
            },
          },
          400,
        );
      }

      const created = fullExam({
        id: `exam-${current.exams.length + 1}`,
        ...(body as Record<string, unknown>),
        questionCount: ((body as { questionIds?: string[] }).questionIds ?? []).length,
      });
      current.exams = [created, ...current.exams];
      return jsonResponse(created, 201);
    }

    if (path.includes('/exams') && method === 'GET') {
      const id = path.split('/').at(-1) ?? '';
      const stored = current.exams.find((e) => e['id'] === id);
      return stored === undefined
        ? jsonResponse({ error: { code: 'NOT_FOUND', message: 'That exam does not exist.' } }, 404)
        : jsonResponse(stored);
    }

    if (path.includes('/exams') && method === 'PATCH') {
      const id = path.split('/').at(-1) ?? '';
      const stored = current.exams.find((e) => e['id'] === id);
      if (stored === undefined) {
        return jsonResponse(
          { error: { code: 'NOT_FOUND', message: 'That exam does not exist.' } },
          404,
        );
      }
      Object.assign(stored, body);
      return jsonResponse(stored);
    }

    if (path.includes('/exams') && method === 'DELETE') {
      const id = path.split('/').at(-1) ?? '';
      current.exams = current.exams.filter((e) => e['id'] !== id);
      return { ok: true, status: 204, json: async () => null } as unknown as Response;
    }

    return jsonResponse({ error: { code: 'NOT_FOUND', message: 'No route.' } }, 404);
  });

  vi.stubGlobal('fetch', fetchMock);

  return { fetchMock, state: current };
}

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  return render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
}

async function openNewExamForm() {
  await screen.findByRole('heading', { level: 1, name: 'Exams' });

  const button = screen.getAllByRole('button', { name: 'New exam' })[0];

  if (button === undefined) {
    throw new Error('The page has no "New exam" button.');
  }

  // The button stays disabled until the subject list arrives, so clicking it
  // early would silently do nothing.
  await waitFor(() => {
    expect(button).toBeEnabled();
  });
  fireEvent.click(button);
}

async function examCard(title: string) {
  const heading = await screen.findByRole('heading', { name: title });
  const card = heading.closest('li');

  if (card === null) {
    throw new Error(`No exam card rendered for "${title}".`);
  }

  return within(card);
}

beforeEach(() => {
  requests.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('faculty exams page', () => {
  it('lists the lecturer’s own exams with their shape', async () => {
    stubApi({ exams: [exam()] });
    renderAt('/faculty/exams');

    const card = await examCard('Operating Systems Mid-term');
    expect(card.getByText('Draft')).toBeVisible();
    expect(card.getByText(/1 question · 2 marks · 45 min/)).toBeVisible();
  });

  it('shows an empty state before anything exists', async () => {
    stubApi({ exams: [] });
    renderAt('/faculty/exams');

    expect(await screen.findByText('No exams yet')).toBeVisible();
  });

  it('offers only the subject’s questions in the picker', async () => {
    stubApi();
    renderAt('/faculty/exams');

    await openNewExamForm();

    expect(
      await screen.findByText('Which scheduling algorithm can starve a process?'),
    ).toBeVisible();
    expect(screen.getByText('What is a deadlock?')).toBeVisible();
    // A different subject's question is not offered for an Operating Systems exam.
    expect(screen.queryByText('What is a subnet mask?')).toBeNull();
  });

  it('builds a paper in order and shows a running total', async () => {
    stubApi();
    renderAt('/faculty/exams');

    await openNewExamForm();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Add question: Which scheduling algorithm can starve a process?',
      }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Add question: What is a deadlock?' }),
    );

    const items = within(screen.getByRole('region', { name: 'Paper' })).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Which scheduling algorithm can starve a process?');
    expect(items[1]).toHaveTextContent('What is a deadlock?');

    // 2 + 5 marks, two questions.
    expect(await screen.findByText('2 questions · 7 marks')).toBeVisible();
  });

  it('reorders and removes questions in the paper', async () => {
    stubApi();
    renderAt('/faculty/exams');

    await openNewExamForm();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Add question: Which scheduling algorithm can starve a process?',
      }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Add question: What is a deadlock?' }),
    );

    // Adding is idempotent: an added question cannot be added twice.
    expect(
      screen.getByRole('button', { name: 'Add question: What is a deadlock?' }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Move question 2 up' }));

    const reordered = within(screen.getByRole('region', { name: 'Paper' })).getAllByRole(
      'listitem',
    );
    expect(reordered[0]).toHaveTextContent('What is a deadlock?');
    expect(reordered[1]).toHaveTextContent('Which scheduling algorithm can starve a process?');

    fireEvent.click(screen.getByRole('button', { name: 'Remove question 1' }));
    expect(screen.getByText('1 question · 2 marks')).toBeVisible();
  });

  it('creates a draft and reports it', async () => {
    const api = stubApi({ exams: [] });
    renderAt('/faculty/exams');

    await openNewExamForm();

    fireEvent.change(await screen.findByLabelText('Title'), {
      target: { value: 'Networks Quiz' },
    });
    fireEvent.change(screen.getByLabelText('Duration (minutes)'), { target: { value: '20' } });
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Add question: Which scheduling algorithm can starve a process?',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }));

    expect(await screen.findByText(/Draft "Networks Quiz" created/)).toBeVisible();

    const created = requests.find(
      (entry) => entry.method === 'POST' && entry.url.endsWith('/api/v1/exams'),
    );
    expect(created?.body).toMatchObject({
      title: 'Networks Quiz',
      durationMinutes: 20,
      questionIds: ['question-1'],
    });
    expect(api.state.exams).toHaveLength(1);
  });

  it('surfaces a field-level rejection from the API', async () => {
    stubApi({ exams: [], rejectCreate: { path: 'questionIds', message: 'Pick fewer questions.' } });
    renderAt('/faculty/exams');

    await openNewExamForm();
    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'Anything' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }));

    expect(await screen.findByText('Pick fewer questions.')).toBeVisible();
  });

  it('publishes a draft that has questions', async () => {
    const api = stubApi({ exams: [fullExam()] });
    renderAt('/faculty/exams');

    fireEvent.click(await screen.findByRole('button', { name: 'Publish' }));

    await waitFor(() => {
      expect(api.state.exams[0]?.['status']).toBe('PUBLISHED');
    });
    expect(await screen.findByText(/"Operating Systems Mid-term" is published/)).toBeVisible();
  });

  it('will not offer to publish an empty paper, and says why', async () => {
    stubApi({ exams: [exam({ questionCount: 0, totalMarks: 0 })] });
    renderAt('/faculty/exams');

    expect(
      await screen.findByText('Add at least one question before this exam can be published.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });

  it('unpublishes a published exam so it can be edited again', async () => {
    const api = stubApi({ exams: [fullExam({ status: 'PUBLISHED' })] });
    renderAt('/faculty/exams');

    fireEvent.click(await screen.findByRole('button', { name: 'Unpublish' }));

    await waitFor(() => {
      expect(api.state.exams[0]?.['status']).toBe('DRAFT');
    });
    expect(await screen.findByRole('button', { name: 'Edit' })).toBeVisible();
  });

  it('offers no edit or delete control for a published exam', async () => {
    stubApi({ exams: [fullExam({ status: 'PUBLISHED' })] });
    renderAt('/faculty/exams');

    const card = await examCard('Operating Systems Mid-term');
    expect(card.getByText('Published')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('opens the editor with the existing paper in place', async () => {
    stubApi({ exams: [fullExam()] });
    renderAt('/faculty/exams');

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));

    expect(await screen.findByDisplayValue('Operating Systems Mid-term')).toBeVisible();
    expect(await screen.findByText('1 question · 2 marks')).toBeVisible();
  });

  it('previews the paper in order', async () => {
    stubApi({ exams: [fullExam()] });
    renderAt('/faculty/exams');

    fireEvent.click(await screen.findByRole('button', { name: 'Preview' }));

    expect(await screen.findByText('Paper preview')).toBeVisible();
    expect(screen.getByText('Round robin')).toBeVisible();
    expect(screen.getByText('Priority scheduling')).toBeVisible();
  });

  it('filters the list by status', async () => {
    stubApi({
      exams: [exam(), exam({ id: 'exam-2', title: 'Networks Quiz', status: 'PUBLISHED' })],
    });
    renderAt('/faculty/exams');

    await screen.findByText('Operating Systems Mid-term');
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'PUBLISHED' } });

    await waitFor(() => {
      expect(screen.queryByText('Operating Systems Mid-term')).toBeNull();
    });
    expect(screen.getByText('Networks Quiz')).toBeVisible();
  });

  it('deletes a draft after a confirmation click', async () => {
    const api = stubApi({ exams: [exam()] });
    renderAt('/faculty/exams');

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(api.state.exams).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

    await waitFor(() => {
      expect(api.state.exams).toHaveLength(0);
    });
  });

  it('reports a failed list load and retries', async () => {
    const api = stubApi({ exams: [], failList: true });
    renderAt('/faculty/exams');

    expect(await screen.findByText('Could not load exams')).toBeVisible();

    api.state.failList = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('No exams yet')).toBeVisible();
  });

  it('explains that an administrator must create a subject first', async () => {
    stubApi({ exams: [], subjects: [] });
    renderAt('/faculty/exams');

    expect(await screen.findByText('Subjects unavailable')).toBeVisible();
    for (const button of screen.getAllByRole('button', { name: 'New exam' })) {
      expect(button).toBeDisabled();
    }
  });

  it('keeps students out of the page', async () => {
    stubApi({ role: 'STUDENT' });
    renderAt('/faculty/exams');

    expect(
      await screen.findByRole('heading', { level: 1, name: /do not have access to this page/i }),
    ).toBeVisible();
  });

  it('puts the exam screen in the faculty navigation', async () => {
    stubApi();
    renderAt('/faculty/exams');

    const nav = await screen.findByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Exams' })).toBeVisible();
  });
});
