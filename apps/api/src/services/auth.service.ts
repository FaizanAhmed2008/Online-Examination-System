import type { Role } from '../generated/prisma/client.js';
import type { DatabaseClient } from '../db/prisma.js';
import { HttpError } from '../lib/http-error.js';
import { dummyPasswordDigest, verifyPassword } from '../lib/password.js';
import { hashSessionToken, issueSessionToken } from '../lib/session-token.js';
import { UserStatus } from '../generated/prisma/client.js';

/**
 * Authentication and session management (PRD FR-01, §21).
 *
 * The user id and role used by the rest of the application always come from the
 * session row. Nothing in this service reads a role or user id from the request
 * body, a query parameter or a client-supplied header (PRD §21: "Do not trust
 * client-provided score, role, exam ownership").
 */

/** The authenticated identity attached to a request. Contains no secrets. */
export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthServiceDependencies {
  database: DatabaseClient;
  /** Session lifetime in milliseconds. */
  sessionTtlMs: number;
  /** Injectable clock so expiry can be tested without waiting. */
  now?: () => Date;
}

export interface LoginResult {
  user: AuthenticatedUser;
  token: string;
  expiresAt: Date;
}

export async function login(
  credentials: { email: string; password: string },
  { database, sessionTtlMs, now = () => new Date() }: AuthServiceDependencies,
): Promise<LoginResult> {
  const email = normaliseEmail(credentials.email);
  const record = await database.user.findUnique({ where: { email } });

  if (record === null) {
    // Spend the same time hashing as a real check, so a missing account and a
    // wrong password are indistinguishable from the outside.
    await verifyPassword(credentials.password, await dummyPasswordDigest());
    throw invalidCredentials();
  }

  const passwordMatches = await verifyPassword(credentials.password, record.passwordHash);

  if (!passwordMatches) {
    throw invalidCredentials();
  }

  if (record.status !== UserStatus.ACTIVE) {
    // The password was correct, so saying so leaks nothing the caller did not
    // already know, and it is far clearer for the user than a generic failure.
    throw new HttpError(403, 'FORBIDDEN', 'This account has been deactivated.');
  }

  const { token, tokenHash } = issueSessionToken();
  const expiresAt = new Date(now().getTime() + sessionTtlMs);

  await database.session.create({
    data: { userId: record.id, tokenHash, expiresAt },
  });

  return {
    user: { id: record.id, name: record.name, email: record.email, role: record.role },
    token,
    expiresAt,
  };
}

/**
 * Resolves a session cookie to a user, or `null` when it is missing, unknown,
 * expired or belonging to a deactivated user. Expired and revoked sessions are
 * deleted as a side effect, so the table does not accumulate dead rows.
 */
export async function resolveSession(
  token: string | undefined,
  { database, now = () => new Date() }: Pick<AuthServiceDependencies, 'database' | 'now'>,
): Promise<AuthenticatedUser | null> {
  if (token === undefined || token.length === 0) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const record = await database.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (record === null) {
    return null;
  }

  if (record.expiresAt.getTime() <= now().getTime()) {
    await database.session.delete({ where: { id: record.id } }).catch(() => undefined);
    return null;
  }

  if (record.user.status !== UserStatus.ACTIVE) {
    await database.session.delete({ where: { id: record.id } }).catch(() => undefined);
    return null;
  }

  return {
    id: record.user.id,
    name: record.user.name,
    email: record.user.email,
    role: record.user.role,
  };
}

/**
 * Signs the current session out. Idempotent: signing out twice, or with a token
 * that is already unknown, is a success rather than an error.
 */
export async function revokeSession(
  token: string | undefined,
  { database }: Pick<AuthServiceDependencies, 'database'>,
): Promise<void> {
  if (token === undefined || token.length === 0) {
    return;
  }

  await database.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
}

/** Emails are compared case-insensitively, so they are stored normalised. */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

function invalidCredentials(): HttpError {
  return HttpError.unauthenticated('Incorrect email or password.');
}
