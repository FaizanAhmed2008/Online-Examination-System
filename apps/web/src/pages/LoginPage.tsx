import * as React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { homePathForRole, loginRequestSchema } from '@oes/shared';

import { useAuth } from '@/auth/session-context';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { ApiError } from '@/lib/api-client';

/**
 * Role-aware sign-in (PRD §10, "Login": clear errors, loading, session
 * handling). On success the user is sent to the dashboard for their role —
 * the role comes from the server response, never from the form.
 */
export function LoginPage() {
  const { status, user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const requestedPath = (location.state as { from?: string } | null)?.from;

  if (status === 'loading') {
    return (
      <div className="grid min-h-[60dvh] place-items-center">
        <Spinner label="Checking your session" className="text-muted-foreground" />
      </div>
    );
  }

  if (user !== null) {
    return <Navigate to={requestedPath ?? homePathForRole(user.role)} replace />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = loginRequestSchema.safeParse({ email, password });

    if (!parsed.success) {
      setFieldErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [String(issue.path[0] ?? 'form'), issue.message]),
        ),
      );
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const signedIn = await signIn(parsed.data);
      navigate(requestedPath ?? homePathForRole(signedIn.role), { replace: true });
    } catch (cause) {
      setFormError(
        cause instanceof ApiError ? cause.message : 'Could not sign in. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm py-8">
      <div className="mb-8 space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Use the account issued to you by your administrator.
        </p>
      </div>

      {formError !== null && (
        <Alert tone="error" className="mb-6">
          {formError}
        </Alert>
      )}

      <form noValidate onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={fieldErrors.email !== undefined}
            aria-describedby={fieldErrors.email === undefined ? undefined : 'email-error'}
            placeholder="you@example.com"
          />
          {fieldErrors.email !== undefined && (
            <p id="email-error" className="text-xs text-destructive">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={fieldErrors.password !== undefined}
            aria-describedby={fieldErrors.password === undefined ? undefined : 'password-error'}
          />
          {fieldErrors.password !== undefined && (
            <p id="password-error" className="text-xs text-destructive">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? <Spinner label="Signing in" /> : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
