import { Navigate, Outlet, useLocation } from 'react-router';
import type { UserRole } from '@oes/shared';

import { useAuth } from '@/auth/session-context';
import { Spinner } from '@/components/ui/spinner';

function FullPageSpinner({ label }: { label: string }) {
  return (
    <div className="grid min-h-dvh place-items-center">
      <Spinner label={label} className="text-muted-foreground" />
    </div>
  );
}

/**
 * Client-side gate for signed-in routes.
 *
 * This exists to keep the UI honest and to send an unauthenticated visitor to
 * the sign-in page. It is not a security control — the API independently
 * verifies the session on every protected request.
 */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <FullPageSpinner label="Checking your session" />;
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

/**
 * Redirects a signed-in user whose role is not allowed here.
 * Renders `<UnauthorizedPage>` when signed out so the state is explained
 * rather than silently bouncing between routes.
 */
export function RequireRole({ allow }: { allow: readonly UserRole[] }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <FullPageSpinner label="Checking your access" />;
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user !== null && !allow.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
