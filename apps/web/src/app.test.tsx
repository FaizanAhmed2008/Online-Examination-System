import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UserRole } from '@oes/shared';

import { AuthProvider } from '@/auth/AuthProvider';
import { routes } from '@/routes';

interface StubOptions {
  /** Role returned by `GET /auth/me`, or `null` for an anonymous session. */
  currentUserRole?: UserRole | null;
  /** Credentials accepted by `POST /auth/login`. */
  loginEmail?: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function userFor(role: UserRole) {
  return { id: 'user-1', name: 'Test Person', email: 'test@oes.test', role };
}

function stubApi({ currentUserRole = null, loginEmail = 'test@oes.test' }: StubOptions = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.endsWith('/auth/me')) {
        return currentUserRole === null
          ? jsonResponse(
              { error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' } },
              401,
            )
          : jsonResponse({ user: userFor(currentUserRole) });
      }

      if (url.endsWith('/auth/login') && method === 'POST') {
        const body = JSON.parse(String(init?.body ?? '{}')) as { email?: string };

        return body.email === loginEmail
          ? jsonResponse({ user: userFor('STUDENT') })
          : jsonResponse(
              { error: { code: 'UNAUTHENTICATED', message: 'Incorrect email or password.' } },
              401,
            );
      }

      if (url.endsWith('/auth/logout')) {
        return { ok: true, status: 204, json: async () => null } as unknown as Response;
      }

      throw new Error(`Unexpected request: ${method} ${url}`);
    }),
  );
}

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  return render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('public routes', () => {
  it('renders the product overview at the root route', async () => {
    stubApi();
    renderAt('/');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Online Examination System' }),
    ).toBeInTheDocument();
  });

  it('renders the status route inside the public layout', async () => {
    stubApi();
    renderAt('/status');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'System status' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  });

  it('renders a recoverable not-found page for unknown routes', async () => {
    stubApi();
    renderAt('/does-not-exist');

    expect(
      await screen.findByRole('heading', { level: 1, name: /does not exist/i }),
    ).toBeInTheDocument();
  });
});

describe('authentication', () => {
  it('sends an anonymous visitor from a protected route to sign in', async () => {
    stubApi({ currentUserRole: null });
    renderAt('/student');

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
  });

  it('renders the sign-in form with accessible, labelled fields', async () => {
    stubApi();
    renderAt('/login');

    expect(await screen.findByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('reports a wrong password without leaving the form', async () => {
    stubApi();
    renderAt('/login');

    fireEvent.change(await screen.findByLabelText('Email'), {
      target: { value: 'wrong@oes.test' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.');
  });

  it('validates the email format before calling the API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderAt('/login');

    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    // The session bootstrap still runs, but no sign-in request is made.
    const loginCalls = fetchMock.mock.calls.filter((call) =>
      String(call[0]).endsWith('/auth/login'),
    );
    expect(loginCalls).toHaveLength(0);
  });

  it('lands on the dashboard for the signed-in role', async () => {
    stubApi();
    renderAt('/login');

    fireEvent.change(await screen.findByLabelText('Email'), {
      target: { value: 'test@oes.test' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'valid-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Student dashboard' }),
    ).toBeInTheDocument();
  });
});

describe('role authorisation', () => {
  it('shows the student dashboard to a student', async () => {
    stubApi({ currentUserRole: 'STUDENT' });
    renderAt('/student');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Student dashboard' }),
    ).toBeInTheDocument();
  });

  it('shows the faculty dashboard to faculty', async () => {
    stubApi({ currentUserRole: 'FACULTY' });
    renderAt('/faculty');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Faculty dashboard' }),
    ).toBeInTheDocument();
  });

  it('shows the admin dashboard to an administrator', async () => {
    stubApi({ currentUserRole: 'ADMIN' });
    renderAt('/admin');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Admin dashboard' }),
    ).toBeInTheDocument();
  });

  it('blocks a student from the admin area and explains why', async () => {
    stubApi({ currentUserRole: 'STUDENT' });
    renderAt('/admin');

    expect(
      await screen.findByRole('heading', { level: 1, name: /do not have access to this page/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/does not have permission/i)).toBeInTheDocument();
  });

  it('blocks faculty from the student area', async () => {
    stubApi({ currentUserRole: 'FACULTY' });
    renderAt('/student');

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /do not have access to this page/i }),
      ).toBeInTheDocument();
    });
  });

  it('never renders another role protected area for a student', async () => {
    stubApi({ currentUserRole: 'STUDENT' });
    renderAt('/faculty');

    await screen.findByRole('heading', { level: 1, name: /do not have access to this page/i });
    expect(screen.queryByRole('heading', { level: 1, name: 'Faculty dashboard' })).toBeNull();
  });
});

describe('sign out', () => {
  it('returns to the sign-in screen and forgets the session', async () => {
    stubApi({ currentUserRole: 'STUDENT' });
    renderAt('/student');

    fireEvent.click(await screen.findByRole('button', { name: /sign out/i }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
  });
});
