import { z } from 'zod';

/**
 * Authentication contract shared by the API and the web client.
 *
 * `SessionUser` is the only user shape that ever crosses the network: it
 * deliberately has no `passwordHash` and no `status`, so a client cannot render
 * or act on a credential digest.
 */

export const userRoleSchema = z.enum(['STUDENT', 'FACULTY', 'ADMIN']);

export type UserRole = z.infer<typeof userRoleSchema>;

/** The authenticated user, as returned by `POST /auth/login` and `GET /auth/me`. */
export const sessionUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: userRoleSchema,
});

export type SessionUser = z.infer<typeof sessionUserSchema>;

export const loginRequestSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const loginResponseSchema = z.object({
  user: sessionUserSchema,
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

/** The route a role lands on after signing in. */
export const ROLE_HOME_PATH = {
  STUDENT: '/student',
  FACULTY: '/faculty',
  ADMIN: '/admin',
} as const satisfies Record<UserRole, string>;

export function homePathForRole(role: UserRole): string {
  return ROLE_HOME_PATH[role];
}
