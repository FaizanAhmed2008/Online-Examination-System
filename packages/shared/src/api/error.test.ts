import { describe, expect, it } from 'vitest';

import { apiErrorResponseSchema } from './error.js';

describe('apiErrorResponseSchema', () => {
  it('accepts a minimal error envelope', () => {
    const result = apiErrorResponseSchema.safeParse({
      error: { code: 'NOT_FOUND', message: 'Resource not found.' },
    });

    expect(result.success).toBe(true);
  });

  it('accepts field-level details', () => {
    const result = apiErrorResponseSchema.safeParse({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        details: [{ path: 'email', message: 'Invalid email.' }],
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects unknown error codes', () => {
    const result = apiErrorResponseSchema.safeParse({
      error: { code: 'TEAPOT', message: 'nope' },
    });

    expect(result.success).toBe(false);
  });

  it('rejects a missing message so clients always get human-readable text', () => {
    const result = apiErrorResponseSchema.safeParse({ error: { code: 'INTERNAL_ERROR' } });

    expect(result.success).toBe(false);
  });
});
