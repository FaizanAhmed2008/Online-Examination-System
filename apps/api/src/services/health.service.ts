import type { CheckResult, ReadinessResponse } from '@oes/shared';

import type { DatabaseClient } from '../db/prisma.js';

export interface LivenessResult {
  status: 'ok';
  service: string;
  uptimeSeconds: number;
}

const SERVICE_NAME = 'oes-api';

export function getLiveness(): LivenessResult {
  return {
    status: 'ok',
    service: SERVICE_NAME,
    uptimeSeconds: Number(process.uptime().toFixed(3)),
  };
}

/**
 * Verifies database connectivity. The failure message is intentionally generic:
 * driver errors can contain host names and credentials.
 */
export async function checkDatabase(database: DatabaseClient): Promise<CheckResult> {
  const startedAt = performance.now();

  try {
    await database.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      latencyMs: Math.round(performance.now() - startedAt),
      message: null,
    };
  } catch {
    return {
      status: 'unavailable',
      latencyMs: null,
      message: 'Database connection failed.',
    };
  }
}

export async function getReadiness(database: DatabaseClient): Promise<ReadinessResponse> {
  const databaseCheck = await checkDatabase(database);

  return {
    status: databaseCheck.status === 'ok' ? 'ok' : 'unavailable',
    checks: { database: databaseCheck },
  };
}
