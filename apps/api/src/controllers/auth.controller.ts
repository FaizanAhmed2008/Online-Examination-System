import type { Request, RequestHandler, Response } from 'express';
import { loginRequestSchema, type SessionUser } from '@oes/shared';

import type { DatabaseClient } from '../db/prisma.js';
import type { Env } from '../config/env.js';
import { readCookie, SESSION_COOKIE_NAME, sessionCookieOptions } from '../lib/cookies.js';
import { HttpError } from '../lib/http-error.js';
import type { AuthenticatedUser } from '../services/auth.service.js';
import { login, revokeSession } from '../services/auth.service.js';

export interface AuthControllerDependencies {
  env: Env;
  database: DatabaseClient;
  now?: () => Date;
}

/**
 * `POST /auth/login`, `POST /auth/logout` and `GET /auth/me` (PRD §15).
 *
 * Responses only ever contain `SessionUser`, so a `passwordHash` cannot leak
 * through a response body even by accident.
 */
export function createAuthController({ env, database, now }: AuthControllerDependencies): {
  login: RequestHandler;
  logout: RequestHandler;
  me: RequestHandler;
} {
  const sessionTtlMs = env.sessionTtlHours * 60 * 60 * 1000;
  const isProduction = env.nodeEnv === 'production';

  const loginHandler: RequestHandler = async (req, res) => {
    const parsed = loginRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      throw HttpError.badRequest(
        'Enter your email and password.',
        parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      );
    }

    const result = await login(parsed.data, {
      database,
      sessionTtlMs,
      ...(now ? { now } : {}),
    });

    res.cookie(SESSION_COOKIE_NAME, result.token, sessionCookieOptions(sessionTtlMs, isProduction));

    res.status(200).json({ user: toSessionUser(result.user) });
  };

  const logoutHandler: RequestHandler = async (req, res) => {
    await revokeSession(readCookie(req.headers.cookie, SESSION_COOKIE_NAME), { database });

    // Always clear the cookie, even if the token was already unknown, so the
    // browser stops sending it.
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'strict',
      secure: isProduction,
      path: '/',
    });

    res.status(204).end();
  };

  const meHandler: RequestHandler = (req: Request, res: Response) => {
    // `requireAuth` has already attached the identity, so a missing one here
    // means the route was mounted without it.
    if (req.auth === undefined) {
      throw HttpError.unauthenticated();
    }

    res.status(200).json({ user: toSessionUser(req.auth) });
  };

  return { login: loginHandler, logout: logoutHandler, me: meHandler };
}

/**
 * Strips everything the client has no business seeing. The explicit field list
 * is deliberate: spreading a database record would leak `passwordHash` the day
 * a column is added.
 */
function toSessionUser(user: AuthenticatedUser): SessionUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
