import { z } from 'zod';

export const CHECK_STATUSES = ['ok', 'degraded', 'unavailable'] as const;

export type CheckStatus = (typeof CHECK_STATUSES)[number];

export const checkResultSchema = z.object({
  status: z.enum(CHECK_STATUSES),
  latencyMs: z.number().nonnegative().nullable(),
  message: z.string().nullable(),
});

export type CheckResult = z.infer<typeof checkResultSchema>;

/** `GET /health` — process liveness. Does not touch any dependency. */
export const livenessResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
  uptimeSeconds: z.number().nonnegative(),
});

export type LivenessResponse = z.infer<typeof livenessResponseSchema>;

/** `GET /health/ready` — readiness, including database connectivity. */
export const readinessResponseSchema = z.object({
  status: z.enum(CHECK_STATUSES),
  checks: z.object({
    database: checkResultSchema,
  }),
});

export type ReadinessResponse = z.infer<typeof readinessResponseSchema>;
