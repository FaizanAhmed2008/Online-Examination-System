import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { ScryptOptions } from 'node:crypto';

/**
 * Password hashing with scrypt from `node:crypto` (PRD §21: never store
 * plaintext passwords). scrypt is memory-hard, ships with Node, and therefore
 * adds no dependency to the project.
 *
 * The digest is self-describing so cost parameters can be raised later without
 * invalidating existing passwords:
 *
 *   scrypt$<N>$<r>$<p>$<saltBase64>$<hashBase64>
 */
const SCRYPT_OPTIONS: ScryptOptions = { N: 16_384, r: 8, p: 1 };
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const ALGORITHM = 'scrypt';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

interface ParsedDigest {
  salt: Buffer;
  hash: Buffer;
  options: ScryptOptions;
}

/**
 * Hashes a plaintext password with a fresh random salt.
 * The plaintext is never stored, logged or returned.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const hash = await scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS);

  return [
    ALGORITHM,
    SCRYPT_OPTIONS.N,
    SCRYPT_OPTIONS.r,
    SCRYPT_OPTIONS.p,
    salt.toString('base64'),
    hash.toString('base64'),
  ].join('$');
}

/**
 * Verifies a candidate password against a stored digest.
 * Returns `false` for any malformed digest instead of throwing, so a corrupt
 * row cannot turn a sign-in attempt into a 500.
 */
export async function verifyPassword(password: string, storedDigest: string): Promise<boolean> {
  const parsed = parseDigest(storedDigest);

  if (parsed === null) {
    return false;
  }

  const candidate = await scrypt(password, parsed.salt, parsed.hash.length, parsed.options);

  return timingSafeEqual(candidate, parsed.hash);
}

function parseDigest(storedDigest: string): ParsedDigest | null {
  const parts = storedDigest.split('$');

  if (parts.length !== 6 || parts[0] !== ALGORITHM) {
    return null;
  }

  const [, rawN, rawR, rawP, rawSalt, rawHash] = parts;
  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);

  if (
    rawN === undefined ||
    rawR === undefined ||
    rawP === undefined ||
    rawSalt === undefined ||
    rawHash === undefined ||
    !Number.isInteger(N) ||
    !Number.isInteger(r) ||
    !Number.isInteger(p) ||
    N <= 1 ||
    r <= 0 ||
    p <= 0
  ) {
    return null;
  }

  const salt = Buffer.from(rawSalt, 'base64');
  const hash = Buffer.from(rawHash, 'base64');

  if (salt.length === 0 || hash.length === 0) {
    return null;
  }

  return { salt, hash, options: { N, r, p } };
}

/**
 * A digest of a value nobody knows, used to keep the "unknown email" path as
 * slow as the "wrong password" path. Without it, response timing would reveal
 * which email addresses are registered. Computed once and memoised.
 */
let dummyDigest: Promise<string> | undefined;

export function dummyPasswordDigest(): Promise<string> {
  dummyDigest ??= hashPassword(randomBytes(32).toString('base64'));
  return dummyDigest;
}
