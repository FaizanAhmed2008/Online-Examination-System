import { Link } from 'react-router';
import { homePathForRole } from '@oes/shared';

import { useAuth } from '@/auth/session-context';
import { Button } from '@/components/ui/button';

/**
 * Shown when a signed-in user opens a screen their role cannot use (PRD §12:
 * "Unauthorized: explain that the user does not have permission; never reveal
 * protected data"). It links back to the dashboard the user is allowed to see.
 */
export function UnauthorizedPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto flex min-h-[60dvh] w-full max-w-md flex-col items-center justify-center text-center">
      <p className="text-sm font-medium text-muted-foreground">403</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        You do not have access to this page
      </h1>
      <p className="mt-3 text-sm text-pretty text-muted-foreground">
        {user === null
          ? 'Sign in with an account that is allowed to view this area.'
          : `Your ${user.role.toLowerCase()} account does not have permission to view this area. If you think this is wrong, contact your administrator.`}
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link to={user === null ? '/login' : homePathForRole(user.role)}>
          {user === null ? 'Go to sign in' : 'Back to your dashboard'}
        </Link>
      </Button>
    </div>
  );
}
