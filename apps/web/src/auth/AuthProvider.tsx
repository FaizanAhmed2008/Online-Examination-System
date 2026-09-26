import * as React from 'react';
import type { LoginRequest, SessionUser } from '@oes/shared';

import {
  ApiError,
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
} from '@/lib/api-client';
import { AuthContext, type AuthContextValue, type AuthStatus } from '@/auth/session-context';

/**
 * Loads the current session once on mount and exposes sign-in / sign-out.
 *
 * The httpOnly session cookie is sent automatically by the API client; this
 * provider never sees the token.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AuthStatus>('loading');
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((currentUser) => {
        if (!active) {
          return;
        }
        setUser(currentUser);
        setStatus('authenticated');
      })
      .catch((cause: unknown) => {
        if (!active) {
          return;
        }
        // A 401 here is the normal "not signed in" case, not a failure to
        // report. Anything else (network, server) is worth surfacing.
        if (!(cause instanceof ApiError && cause.code === 'UNAUTHENTICATED')) {
          setError(messageFor(cause));
        }
        setUser(null);
        setStatus('anonymous');
      });

    return () => {
      active = false;
    };
  }, []);

  const signIn = React.useCallback(async (credentials: LoginRequest) => {
    setError(null);
    const { user: signedIn } = await loginRequest(credentials);
    setUser(signedIn);
    setStatus('authenticated');
    return signedIn;
  }, []);

  const signOut = React.useCallback(async () => {
    await logoutRequest();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({ status, user, error, signIn, signOut, clearError }),
    [status, user, error, signIn, signOut, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function messageFor(cause: unknown): string {
  if (cause instanceof ApiError) {
    return cause.message;
  }

  return 'Something went wrong while contacting the server.';
}
