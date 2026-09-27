import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Question, Subject, UserRole } from '@oes/shared';

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

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

interface StubState {
  questions: Question[];
  subjects: Subject[];
  role: UserRole;
  /** Rejects question creation with a field-level validation error. */
  rejectCreate?: { path: string; message: string };
  /** Fails the question list request, as an unreachable API would. */
  failList?: boolean;
}

const requests: { method: string; url: string; body: unknown }[] = [];

/**
 * In-memory API stub that mirrors the real envelope, so the page is exercised
 * through the same code path production uses.
 */
function stubApi(state: Partial<StubState> = {}) {
  const current: StubState = {
    questions: state.questions ?? [],
    subjects: state.subjects ?? SUBJECTS,
    role: state.role ?? 'FACULTY',
    ...(state.rejectCreate === undefined ? {} : { rejectCreate: state.rejectCreate }),
    ...(state.failList === undefined ? {} : { failList: state.failList }),
  };

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    const body = init?.body === undefined ? undefined : JSON.parse(String(init.body));
    requests.push({ method, url: path, body });

    if (path.endsWith('/auth/me')) {
      return jsonResponse({
        user: {
          id: 'faculty-1',
          name: 'Faculty Person',
          email: 'faculty@oes.test',
          role: current.role,
        },
      });
    }

    if (path.includes('/subjects')) {
      return jsonResponse({ items: current.subjects });
    }

    if (path.includes('/questions') && method === 'GET') {
      if (current.failList === true) {
        return jsonResponse(
          { error: { code: 'INTERNAL_ERROR', message: 'The question bank could not be loaded.' } },
          500,
        );
      }

      const params = new URLSearchParams(path.split('?')[1] ?? '');
      const search = (params.get('q') ?? '').toLowerCase();
      const subjectId = params.get('subjectId');

      const items = current.questions.filter(
        (item) =>
          (search.length === 0 || item.text.toLowerCase().includes(search)) &&
          (subjectId === null || item.subject.id === subjectId),
      );

      return jsonResponse({
        items,
        page: Number(params.get('page') ?? '1'),
        pageSize: 20,
        total: items.length,
      });
    }

    if (path.includes('/questions') && method === 'POST') {
      if (current.rejectCreate !== undefined) {
        return jsonResponse(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'The question is not valid.',
              details: [current.rejectCreate],
            },
          },
          400,
        );
      }

      const created = question({
        id: `question-${current.questions.length + 1}`,
        text: String((body as { text: string }).text),
        marks: Number((body as { marks: number }).marks),
        subject:
          current.subjects.find((s) => s.id === (body as { subjectId: string }).subjectId) ??
          SUBJECTS[0]!,
        options: (body as { options: { text: string; isCorrect: boolean }[] }).options.map(
          (option, index) => ({
            id: `new-option-${index}`,
            ...option,
          }),
        ),
      });

      current.questions = [created, ...current.questions];
      return jsonResponse(created, 201);
    }

    if (path.includes('/questions') && (method === 'PATCH' || method === 'DELETE')) {
      const id = path.split('/').pop() ?? '';

      if (method === 'DELETE') {
        current.questions = current.questions.filter((item) => item.id !== id);
        return jsonResponse({ ...question({ id }), status: 'INACTIVE' });
      }

      // The API returns stored rows, so every option comes back with an id.
      const payload = body as {
        text?: string;
        marks?: number;
        subjectId?: string;
        options?: { text: string; isCorrect: boolean }[];
      };
      const base = question({ id });
      const updated: Question = {
        ...base,
        text: payload.text ?? base.text,
        marks: payload.marks ?? base.marks,
        subject:
          current.subjects.find((subject) => subject.id === payload.subjectId) ?? base.subject,
        options:
          payload.options === undefined
            ? base.options
            : payload.options.map((option, index) => ({
                id: `option-${index + 1}`,
                ...option,
              })),
      };
      current.questions = current.questions.map((item) => (item.id === id ? updated : item));
      return jsonResponse(updated);
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

beforeEach(() => {
  requests.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Renders the bank and waits for the subject list to arrive, so tests never
 * open the editor while the subject select is still empty.
 */
async function openBank({ waitForSubjects = true } = {}): Promise<void> {
  renderAt('/faculty/questions');
  await screen.findByRole('heading', { level: 1, name: 'Question bank' });

  if (waitForSubjects) {
    await screen.findByRole('option', { name: 'Operating Systems' });
  }
}

describe('faculty question bank', () => {
  it('is reachable from the faculty navigation', async () => {
    stubApi();
    renderAt('/faculty');

    const nav = await screen.findByRole('navigation', { name: 'Main' });
    fireEvent.click(within(nav).getByRole('link', { name: 'Question bank' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Question bank' }),
    ).toBeInTheDocument();
  });

  it('keeps the route closed to students', async () => {
    stubApi({ role: 'STUDENT' });
    renderAt('/faculty/questions');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'You do not have access to this page' }),
    ).toBeInTheDocument();
  });

  it('shows an empty state before any question exists', async () => {
    stubApi({ questions: [] });
    await openBank();

    expect(await screen.findByText('No questions yet')).toBeInTheDocument();
    expect(screen.queryByTestId('question-list')).not.toBeInTheDocument();
  });

  it('lists the faculty member’s own questions with the correct answer marked', async () => {
    stubApi({ questions: [question()] });
    await openBank();

    expect(
      await screen.findByText('Which scheduling algorithm can starve a process?'),
    ).toBeInTheDocument();
    expect(screen.getByText('Operating Systems (CS204)')).toBeInTheDocument();
    expect(screen.getByText('2 marks')).toBeInTheDocument();
    expect(screen.getByText('(correct answer)')).toBeInTheDocument();
  });

  it('asks the API for only the signed-in faculty member’s questions', async () => {
    stubApi({ questions: [question()] });
    await openBank();

    await waitFor(() => {
      expect(requests.some((request) => request.url.startsWith('/api/v1/questions'))).toBe(true);
    });
  });

  it('reports a load failure and offers a retry', async () => {
    stubApi({ failList: true });
    renderAt('/faculty/questions');

    expect(await screen.findByText('Could not load questions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.queryByTestId('question-list')).not.toBeInTheDocument();
  });

  it('filters by search text and shows a no-match state', async () => {
    stubApi({
      questions: [question(), question({ id: 'question-2', text: 'What is a subnet mask?' })],
    });
    await openBank();

    await screen.findByText('What is a subnet mask?');

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'quantum tunnelling' } });
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));

    expect(await screen.findByText('No questions match your filters')).toBeInTheDocument();
    expect(
      screen.queryByText('Which scheduling algorithm can starve a process?'),
    ).not.toBeInTheDocument();
  });

  it('filters by subject', async () => {
    stubApi({
      questions: [
        question(),
        question({
          id: 'question-2',
          text: 'What is a subnet mask?',
          subject: SUBJECTS[1]!,
        }),
      ],
    });
    await openBank();

    await screen.findByText('What is a subnet mask?');

    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'subject-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));

    await waitFor(() => {
      expect(requests.some((request) => request.url.includes('subjectId=subject-2'))).toBe(true);
    });
    expect(
      screen.queryByText('Which scheduling algorithm can starve a process?'),
    ).not.toBeInTheDocument();
  });

  it('validates the form in the browser before calling the API', async () => {
    const { fetchMock } = stubApi({ questions: [] });
    await openBank();

    fireEvent.click((await screen.findAllByRole('button', { name: 'New question' }))[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Create question' }));

    expect(await screen.findByText('Enter the question text.')).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.filter(
        (call) => String(call[0]).includes('/questions') && call[1]?.method === 'POST',
      ),
    ).toHaveLength(0);
  });

  it('surfaces a server-side field error against the field', async () => {
    stubApi({
      questions: [],
      rejectCreate: { path: 'options', message: 'Mark exactly one option as the correct answer.' },
    });
    await openBank();

    fireEvent.click((await screen.findAllByRole('button', { name: 'New question' }))[0]!);

    fireEvent.change(screen.getByLabelText('Question'), {
      target: { value: 'Which queue is used by a scheduler?' },
    });
    fireEvent.change(screen.getByLabelText('Option 1 text'), { target: { value: 'FIFO' } });
    fireEvent.change(screen.getByLabelText('Option 2 text'), { target: { value: 'Priority' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create question' }));

    expect(
      await screen.findByText('Mark exactly one option as the correct answer.'),
    ).toBeInTheDocument();
  });

  it('creates a question with exactly one correct option', async () => {
    const { state } = stubApi({ questions: [] });
    await openBank();

    fireEvent.click((await screen.findAllByRole('button', { name: 'New question' }))[0]!);

    fireEvent.change(screen.getByLabelText('Question'), {
      target: { value: 'Which queue does a scheduler use?' },
    });
    fireEvent.change(screen.getByLabelText('Option 1 text'), { target: { value: 'FIFO' } });
    fireEvent.change(screen.getByLabelText('Option 2 text'), { target: { value: 'Priority' } });

    // Default is option 1; move the key to option 2.
    fireEvent.click(screen.getByRole('radio', { name: 'Mark option 2 as correct' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create question' }));

    expect(await screen.findByText('Question created.')).toBeInTheDocument();

    const created = requests.find(
      (request) => request.method === 'POST' && request.url.includes('/questions'),
    );
    const payload = created?.body as { options: { isCorrect: boolean }[] };
    expect(payload.options.filter((option) => option.isCorrect)).toHaveLength(1);
    expect(state.questions[0]?.text).toBe('Which queue does a scheduler use?');
  });

  it('adds and removes options', async () => {
    stubApi({ questions: [] });
    await openBank();

    fireEvent.click((await screen.findAllByRole('button', { name: 'New question' }))[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Add option' }));

    expect(screen.getByLabelText('Option 3 text')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove option 3' }));
    expect(screen.queryByLabelText('Option 3 text')).not.toBeInTheDocument();
  });

  it('loads a question into the form for editing and saves the change', async () => {
    stubApi({ questions: [question()] });
    await openBank();

    await screen.findByText('Which scheduling algorithm can starve a process?');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    const textField = await screen.findByLabelText('Question');
    expect(textField).toHaveValue('Which scheduling algorithm can starve a process?');
    expect(screen.getByText('Edit question')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Marks'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Question updated.')).toBeInTheDocument();
    expect(screen.getByText('5 marks')).toBeInTheDocument();

    const patch = requests.find((request) => request.method === 'PATCH');
    expect(patch?.body).toMatchObject({ marks: 5 });
  });

  it('requires a second click before deleting', async () => {
    const { state } = stubApi({ questions: [question()] });
    await openBank();

    await screen.findByText('Which scheduling algorithm can starve a process?');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    // First click only arms the confirmation.
    expect(state.questions).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Confirm delete' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

    expect(await screen.findByText('Question deleted.')).toBeInTheDocument();
    expect(state.questions).toHaveLength(0);
    expect(await screen.findByText('No questions yet')).toBeInTheDocument();
  });

  it('lets the user back out of a delete', async () => {
    const { state } = stubApi({ questions: [question()] });
    await openBank();

    await screen.findByText('Which scheduling algorithm can starve a process?');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(state.questions).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('tells faculty to ask an admin when no subject exists yet', async () => {
    stubApi({ questions: [], subjects: [] });
    await openBank({ waitForSubjects: false });

    expect(await screen.findByText('Subjects unavailable')).toBeInTheDocument();
    // The create affordances stay disabled: a question cannot exist without a subject.
    for (const button of await screen.findAllByRole('button', { name: 'New question' })) {
      expect(button).toBeDisabled();
    }
  });
});
