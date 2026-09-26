import { describe, expect, it } from 'vitest';

import { loadEnv } from './env.js';

const validEnv = {
  NODE_ENV: 'test',
  PORT: '4000',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/oes',
  CORS_ORIGIN: 'http://localhost:5173',
  SESSION_TTL_HOURS: '12',
  LOG_LEVEL: 'warn',
};

describe('loadEnv', () => {
  it('parses a valid environment', () => {
    const env = loadEnv(validEnv);

    expect(env).toEqual({
      nodeEnv: 'test',
      port: 4000,
      databaseUrl: validEnv.DATABASE_URL,
      corsOrigins: ['http://localhost:5173'],
      sessionTtlHours: 12,
      logLevel: 'warn',
    });
  });

  it('defaults the session lifetime when it is not set', () => {
    const env = loadEnv({ ...validEnv, SESSION_TTL_HOURS: undefined });

    expect(env.sessionTtlHours).toBe(12);
  });

  it('rejects an implausible session lifetime', () => {
    expect(() => loadEnv({ ...validEnv, SESSION_TTL_HOURS: '0' })).toThrowError(
      /Invalid environment/,
    );
  });

  it('splits multiple CORS origins', () => {
    const env = loadEnv({ ...validEnv, CORS_ORIGIN: 'http://localhost:5173, https://oes.test' });

    expect(env.corsOrigins).toEqual(['http://localhost:5173', 'https://oes.test']);
  });

  it('fails fast when DATABASE_URL is missing', () => {
    expect(() => loadEnv({ ...validEnv, DATABASE_URL: undefined })).toThrowError(/DATABASE_URL/);
  });

  it('rejects a non-PostgreSQL connection string', () => {
    expect(() => loadEnv({ ...validEnv, DATABASE_URL: 'mysql://localhost:3306/oes' })).toThrowError(
      /PostgreSQL/,
    );
  });

  it('rejects an out-of-range port', () => {
    expect(() => loadEnv({ ...validEnv, PORT: '70000' })).toThrowError(/Invalid environment/);
  });
});
