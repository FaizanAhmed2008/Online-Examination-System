import { describe, expect, it } from 'vitest';

import { livenessResponseSchema, readinessResponseSchema } from './health.js';

describe('livenessResponseSchema', () => {
  it('accepts a liveness payload', () => {
    const result = livenessResponseSchema.safeParse({
      status: 'ok',
      service: 'oes-api',
      uptimeSeconds: 12.5,
    });

    expect(result.success).toBe(true);
  });

  it('rejects a negative uptime', () => {
    const result = livenessResponseSchema.safeParse({
      status: 'ok',
      service: 'oes-api',
      uptimeSeconds: -1,
    });

    expect(result.success).toBe(false);
  });
});

describe('readinessResponseSchema', () => {
  it('requires a database check result', () => {
    const result = readinessResponseSchema.safeParse({ status: 'ok', checks: {} });

    expect(result.success).toBe(false);
  });

  it('accepts a degraded database check', () => {
    const result = readinessResponseSchema.safeParse({
      status: 'degraded',
      checks: {
        database: { status: 'degraded', latencyMs: null, message: 'Connection pool exhausted.' },
      },
    });

    expect(result.success).toBe(true);
  });
});
