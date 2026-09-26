/**
 * Cookie helpers.
 *
 * Reading is done by hand instead of adding `cookie-parser`, because the API
 * only ever looks up one cookie. Writing uses `res.cookie()` from Express
 * core, which handles the `Set-Cookie` serialisation.
 */

export const SESSION_COOKIE_NAME = 'oes_session';

/**
 * Returns the value of a single cookie from a `Cookie` request header, or
 * `undefined` when it is absent. Malformed pairs are ignored.
 */
export function readCookie(header: string | undefined, name: string): string | undefined {
  if (header === undefined || header.length === 0) {
    return undefined;
  }

  for (const pair of header.split(';')) {
    const separator = pair.indexOf('=');

    if (separator === -1) {
      continue;
    }

    const key = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();

    if (key === name) {
      return value.length > 0 ? value : undefined;
    }
  }

  return undefined;
}

export interface SessionCookieOptions {
  httpOnly: true;
  sameSite: 'strict';
  secure: boolean;
  path: '/';
  maxAge: number;
}

/**
 * Cookie flags for the session cookie.
 *
 * `httpOnly` keeps the token away from JavaScript, `sameSite: 'strict'` blocks
 * cross-site delivery (the CSRF defence, since the API also only accepts
 * `application/json` bodies), and `secure` is enabled outside development.
 */
export function sessionCookieOptions(ttlMs: number, isProduction: boolean): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction,
    path: '/',
    maxAge: ttlMs,
  };
}
