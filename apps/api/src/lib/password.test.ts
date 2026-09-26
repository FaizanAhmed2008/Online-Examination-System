import { describe, expect, it } from 'vitest';

import { dummyPasswordDigest, hashPassword, verifyPassword } from './password.js';

describe('hashPassword / verifyPassword', () => {
  it('accepts the original password and rejects a different one', async () => {
    const digest = await hashPassword('correct horse battery staple');

    await expect(verifyPassword('correct horse battery staple', digest)).resolves.toBe(true);
    await expect(verifyPassword('Correct horse battery staple', digest)).resolves.toBe(false);
    await expect(verifyPassword('', digest)).resolves.toBe(false);
  });

  it('never stores the plaintext in the digest', async () => {
    const digest = await hashPassword('plaintext-must-not-appear');

    expect(digest).not.toContain('plaintext-must-not-appear');
    expect(digest.startsWith('scrypt$16384$8$1$')).toBe(true);
  });

  it('salts each hash, so the same password hashes differently', async () => {
    const first = await hashPassword('same-password');
    const second = await hashPassword('same-password');

    expect(first).not.toBe(second);
  });

  it('returns false for a malformed digest instead of throwing', async () => {
    await expect(verifyPassword('anything', 'not-a-digest')).resolves.toBe(false);
    await expect(verifyPassword('anything', 'scrypt$16384$8$1$onlyfive')).resolves.toBe(false);
    await expect(verifyPassword('anything', 'bcrypt$16384$8$1$c2FsdA==$aGFzaA==')).resolves.toBe(
      false,
    );
    await expect(verifyPassword('anything', '')).resolves.toBe(false);
  });

  it('rejects a digest whose cost parameters are nonsense', async () => {
    await expect(verifyPassword('anything', 'scrypt$0$8$1$c2FsdA==$aGFzaA==')).resolves.toBe(false);
  });

  it('exposes a stable dummy digest for the unknown-account path', async () => {
    await expect(dummyPasswordDigest()).resolves.toBe(await dummyPasswordDigest());
  });
});
