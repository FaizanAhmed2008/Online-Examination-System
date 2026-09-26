import * as React from 'react';

import type { LoginRequest, SessionUser } from '@oes/shared';

/**
 * Session state shared through React context.
 *
 * Kept in its own module (no JSX) so the provider component can live in a
 * separate file — a module that exports both a component and a hook breaks
 * React Fast Refresh.
 *
 * This is a UI convenience, never a security boundary. The role shown here
 * comes from `GET /auth/me`, and the API verifies the session and role again on
 * every protected request.
 */
export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  status: AuthStatus;
  user: SessionUser | null;
  /** Set when the session could not be checked, or when a background call failed. */
  error: string | null;
  signIn: (credentials: LoginRequest) => Promise<SessionUser>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = React.createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);

  if (context === null) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }

  return context;
}
