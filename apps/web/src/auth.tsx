import { useState } from 'react';
import { GraduationCap, Lock, LogIn, UserPlus } from 'lucide-react';

import type { Route } from './App';
import type { Role } from './data';
import { MIN_PASSWORD_LENGTH, createUser, currentUser, signIn, type Store } from './store';
import { Badge, Button, Card, CardBody, Field, Notice, cx, inputClass } from './ui';

type Go = (route: Route) => void;

const ROLE_COPY: Record<Role, { title: string; subtitle: string }> = {
  STUDENT: {
    title: 'Student sign in',
    subtitle: 'Sit your papers and review your results.',
  },
  FACULTY: {
    title: 'Faculty sign in',
    subtitle: 'Build papers, publish them and follow results.',
  },
};

/**
 * Sign-in (FR-01). Students and lecturers sign in separately: the tab chooses
 * which set of accounts the form accepts, so someone reaching for the wrong tab
 * is told to switch rather than silently landing in the other role's screens.
 */
export function LoginPage({ store, go }: { store: Store; go: Go }) {
  const { state, setState } = store;
  const [role, setRole] = useState<Role>('STUDENT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const copy = ROLE_COPY[role];
  const accounts = state.users.filter((account) => account.role === role);

  function choose(next: Role) {
    setRole(next);
    setEmail('');
    setPassword('');
    setError(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const found = signIn(state, email, password);

    if (found === null) {
      setError('That email and password do not match an account.');
      return;
    }

    if (found.role !== role) {
      const other = role === 'STUDENT' ? 'faculty' : 'student';
      setError(
        `That is a ${found.role === 'FACULTY' ? 'faculty' : 'student'} account. Use the ${other} sign-in below.`,
      );
      return;
    }

    setState((current) => ({ ...current, sessionUserId: found.id }));
    go(found.role === 'STUDENT' ? { name: 'student' } : { name: 'faculty' });
  }

  return (
    <AuthShell store={store} title={copy.title} subtitle={copy.subtitle}>
      <div
        role="tablist"
        aria-label="Account type"
        className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1"
      >
        {(['STUDENT', 'FACULTY'] as const).map((candidate) => (
          <button
            key={candidate}
            type="button"
            role="tab"
            aria-selected={role === candidate}
            onClick={() => {
              choose(candidate);
            }}
            className={cx(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              role === candidate
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {candidate === 'STUDENT' ? 'Student' : 'Faculty'}
          </button>
        ))}
      </div>

      <form className="space-y-4" onSubmit={submit}>
        <Field label="Email">
          <input
            type="email"
            autoComplete="username"
            className={inputClass}
            placeholder="you@oes.edu"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
            }}
          />
        </Field>

        <Field label="Password">
          <input
            type="password"
            autoComplete="current-password"
            className={inputClass}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
          />
        </Field>

        {error === null ? null : <Notice tone="red">{error}</Notice>}

        <Button type="submit" className="w-full">
          <LogIn aria-hidden="true" className="size-4" />
          Sign in
        </Button>

        {role === 'STUDENT' ? (
          <p className="text-center text-sm">
            No account yet?{' '}
            <button
              type="button"
              className="font-medium underline"
              onClick={() => {
                go({ name: 'create-account' });
              }}
            >
              Create a student account
            </button>
          </p>
        ) : (
          <p className="text-center text-xs text-slate-500">
            Faculty accounts are issued by an administrator.
          </p>
        )}
      </form>

      <div className="mt-6 border-t border-slate-200 pt-4">
        <h2 className="text-sm font-medium">
          {role === 'STUDENT' ? 'Student accounts' : 'Faculty accounts'}
        </h2>
        <ul className="mt-2 space-y-1.5">
          {accounts.map((account) => (
            <li key={account.id}>
              <button
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                  setError(null);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:border-slate-400"
              >
                <span className="min-w-0 truncate">
                  <span className="block truncate font-medium">{account.name}</span>
                  <span className="block truncate text-xs text-slate-500">{account.email}</span>
                </span>
                <Badge tone={account.role === 'FACULTY' ? 'blue' : 'slate'}>
                  {account.role === 'FACULTY' ? 'Faculty' : 'Student'}
                </Badge>
                <span className="sr-only">Select to fill the form</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          Select an account to fill the form. Lecturer passwords are{' '}
          <code className="rounded bg-slate-100 px-1">faculty123</code> and student passwords are{' '}
          <code className="rounded bg-slate-100 px-1">student123</code>.
        </p>
      </div>
    </AuthShell>
  );
}

/**
 * Self-service student registration (FR-01). Only student accounts can be
 * created here; lecturer accounts are added by an administrator.
 */
export function CreateAccountPage({ store, go }: { store: Store; go: Go }) {
  const { state, setState } = store;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const outcome = createUser(state, { name, email, password, role: 'STUDENT' });

    if (!outcome.ok) {
      setError(outcome.error);
      return;
    }

    setState((current) => ({
      ...current,
      users: [...current.users, outcome.user],
      sessionUserId: outcome.user.id,
    }));
    go({ name: 'student' });
  }

  return (
    <AuthShell
      store={store}
      title="Create a student account"
      subtitle="You will be signed in as soon as the account is created."
    >
      <form className="space-y-4" onSubmit={submit}>
        <Field label="Full name">
          <input
            className={inputClass}
            placeholder="Aisha Khan"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
        </Field>

        <Field label="Email">
          <input
            type="email"
            autoComplete="username"
            className={inputClass}
            placeholder="you@oes.edu"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
            }}
          />
        </Field>

        <Field label="Password" hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
          <input
            type="password"
            autoComplete="new-password"
            className={inputClass}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
          />
        </Field>

        {error === null ? null : <Notice tone="red">{error}</Notice>}

        <Button type="submit" className="w-full">
          <UserPlus aria-hidden="true" className="size-4" />
          Create account
        </Button>

        <p className="text-center text-sm">
          Already registered?{' '}
          <button
            type="button"
            className="font-medium underline"
            onClick={() => {
              go({ name: 'login' });
            }}
          >
            Sign in
          </button>
        </p>
      </form>
    </AuthShell>
  );
}

function AuthShell({
  store,
  title,
  subtitle,
  children,
}: {
  store: Store;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const signedIn = currentUser(store.state);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center py-10">
      <div className="mb-6 text-center">
        <GraduationCap aria-hidden="true" className="mx-auto size-8 text-slate-700" />
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Online Examination System</h1>
      </div>

      <Card>
        <CardBody className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>
          </div>

          {children}

          {signedIn === null ? null : (
            <Notice>
              <span className="inline-flex items-center gap-1.5">
                <Lock aria-hidden="true" className="size-3.5" />
                {signedIn.name} is still signed in.
              </span>
            </Notice>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
