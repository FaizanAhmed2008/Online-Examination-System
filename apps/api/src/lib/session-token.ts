import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Opaque session tokens (PRD §21: secure cookie practices).
 *
 * The cookie carries 32 bytes of CSPRNG output. The database only ever stores
 * the SHA-256 digest, so read access to the table does not yield usable
 * session cookies, and a token is never logged or returned in a response body.
 */
const TOKEN_BYTES = 32;

export interface IssuedSessionToken {
  /** Given to the client in the httpOnly cookie. Never persisted. */
  token: string;
  /** Stored in `sessions.tokenHash`. */
  tokenHash: string;
}

export function issueSessionToken(): IssuedSessionToken {
  const token = randomBytes(TOKEN_BYTES).toString('base64url');

  return { token, tokenHash: hashSessionToken(token) };
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Length-agnostic constant-time comparison of two digests. */
export function digestsMatch(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}
