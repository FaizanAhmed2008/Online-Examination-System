import { z } from 'zod';

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  DATABASE_URL: z
    .string()
    .default('')
    .refine(
      (value) => value.startsWith('postgres://') || value.startsWith('postgresql://'),
      'DATABASE_URL must be set to a PostgreSQL connection string (see .env.example)',
    ),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SESSION_TTL_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 30)
    .default(12),
  LOG_LEVEL: z.enum(['silent', 'debug', 'info', 'warn', 'error']).default('info'),
});

export type NodeEnv = z.infer<typeof rawEnvSchema>['NODE_ENV'];
export type LogLevel = z.infer<typeof rawEnvSchema>['LOG_LEVEL'];

export interface Env {
  nodeEnv: NodeEnv;
  port: number;
  databaseUrl: string;
  corsOrigins: string[];
  sessionTtlHours: number;
  logLevel: LogLevel;
}

export type EnvSource = Record<string, string | undefined>;

/**
 * Validates process environment variables once, at process start.
 * Failing fast here keeps misconfiguration out of request handling.
 */
export function loadEnv(source: EnvSource = process.env): Env {
  const parsed = rawEnvSchema.safeParse({
    NODE_ENV: source.NODE_ENV,
    PORT: source.PORT,
    DATABASE_URL: source.DATABASE_URL,
    CORS_ORIGIN: source.CORS_ORIGIN,
    SESSION_TTL_HOURS: source.SESSION_TTL_HOURS,
    LOG_LEVEL: source.LOG_LEVEL,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration -> ${details}`);
  }

  const corsOrigins = parsed.data.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return {
    nodeEnv: parsed.data.NODE_ENV,
    port: parsed.data.PORT,
    databaseUrl: parsed.data.DATABASE_URL,
    corsOrigins: corsOrigins.length > 0 ? corsOrigins : ['http://localhost:5173'],
    sessionTtlHours: parsed.data.SESSION_TTL_HOURS,
    logLevel: parsed.data.LOG_LEVEL,
  };
}
