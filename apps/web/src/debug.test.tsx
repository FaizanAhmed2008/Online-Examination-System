import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { describe, expect, it, vi, afterEach } from 'vitest';

import { AuthProvider } from '@/auth/AuthProvider';
import { routes } from '@/routes';

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response;
}

const SUBJECTS = [
  { id: 'subject-1', name: 'Operating Systems', code: 'CS204', description: null, status: 'ACTIVE' },
];

describe('debug', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows why submit does not succeed', async () => {
    const calls: string[] = [];

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input).replace(/^https?:\/\/[^/]+/, '');
        const method = init?.method ?? 'GET';
        calls.push(`${method} ${url} ${init?.body ?? ''}`);

        if (url.endsWith('/auth/me')) {
          return jsonResponse({
            user: { id: 'f1', name: 'F', email: 'f@oes.test', role: 'FACULTY' },
          });
        }
        if (url.includes('/subjects')) return jsonResponse({ items: SUBJECTS });
        if (url.includes('/questions') && method === 'GET') {
          return jsonResponse({ items: [], page: 1, pageSize: 20, total: 0 });
        }
        if (url.includes('/questions') && method === 'POST') {
          const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
          return jsonResponse(
            {
              id: 'q1',
              text: body['text'],
              type: 'SINGLE_CHOICE',
              marks: body['marks'],
              explanation: null,
              status: 'ACTIVE',
              subject: SUBJECTS[0],
              options: (body['options'] as { text: string; isCorrect: boolean }[]).map((o, i) => ({
                id: `o${i}`,
                ...o,
              })),
              createdAt: '2026-01-01T00:00:00.000Z',
            },
            201,
          );
        }
        return jsonResponse({ error: { code: 'NOT_FOUND', message: 'x' } }, 404);
      }),
    );

    const router = createMemoryRouter(routes, { initialEntries: ['/faculty/questions'] });
    render(
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>,
    );

    await screen.findByRole('heading', { level: 1, name: 'Question bank' });
    await screen.findByRole('option', { name: 'Operating Systems' });

    const buttons = await screen.findAllByRole('button', { name: 'New question' });
    fireEvent.click(buttons[0]!);

    fireEvent.change(screen.getByLabelText('Question'), { target: { value: 'Which queue?' } });
    fireEvent.change(screen.getByLabelText('Option 1 text'), { target: { value: 'FIFO' } });
    fireEvent.change(screen.getByLabelText('Option 2 text'), { target: { value: 'Priority' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create question' }));

    await waitFor(() => {
      const notices = screen.queryAllByRole('status');
      const alerts = screen.queryAllByRole('alert');
      const texts = [...notices, ...alerts].map((n) => n.textContent);
      // eslint-disable-next-line no-console
      console.log('NOTICES/ALERTS:', JSON.stringify(texts));
      // eslint-disable-next-line no-console
      console.log('CALLS:', JSON.stringify(calls, null, 1));
      expect(true).toBe(true);
    });

    await new Promise((r) => setTimeout(r, 300));
    // eslint-disable-next-line no-console
    console.log(
      'FINAL STATUS:',
      JSON.stringify(
        [...screen.queryAllByRole('status'), ...screen.queryAllByRole('alert')].map((n) => n.textContent),
      ),
    );
    // eslint-disable-next-line no-console
    console.log('FINAL CALLS:', JSON.stringify(calls, null, 1));
  });
});
