import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

import type { LivenessResponse, ReadinessResponse } from '@oes/shared';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { APP_ENV, API_BASE_URL } from '@/config/env';
import { ApiError, getLiveness, getReadiness } from '@/lib/api-client';
import { cn } from '@/lib/utils';

type CheckState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; liveness: LivenessResponse; readiness: ReadinessResponse }
  | { kind: 'failed'; message: string };

const STATUS_STYLES = {
  ok: 'border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]',
  unavailable: 'border-destructive/30 bg-destructive/10 text-destructive',
} as const;

function CheckRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status?: 'ok' | 'unavailable';
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="flex flex-col">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">{value}</span>
      </div>
      {status ? (
        <Badge variant="outline" className={cn('capitalize', STATUS_STYLES[status])}>
          {status}
        </Badge>
      ) : null}
    </div>
  );
}

export function SystemStatusPage() {
  const [state, setState] = useState<CheckState>({ kind: 'idle' });

  const runChecks = async () => {
    setState({ kind: 'loading' });
    try {
      const [liveness, readiness] = await Promise.all([getLiveness(), getReadiness()]);
      setState({ kind: 'ready', liveness, readiness });
    } catch (error) {
      setState({
        kind: 'failed',
        message:
          error instanceof ApiError ? error.message : 'The status check failed unexpectedly.',
      });
    }
  };

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">System status</h1>
        <p className="text-muted-foreground">
          Live checks against the API this client depends on. Development tooling only — it is not a
          product feature.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Services</CardTitle>
          <CardDescription>Run the checks to query the API from this browser.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {state.kind === 'idle' ? (
            <p className="text-sm text-muted-foreground">No checks have been run yet.</p>
          ) : null}

          {state.kind === 'loading' ? (
            <div aria-live="polite" className="flex flex-col gap-3">
              <div className="bg-muted h-4 w-1/3 animate-pulse rounded" />
              <div className="bg-muted h-4 w-1/2 animate-pulse rounded" />
              <span className="sr-only">Checking service status…</span>
            </div>
          ) : null}

          {state.kind === 'failed' ? (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          ) : null}

          {state.kind === 'ready' ? (
            <div className="divide-y">
              <CheckRow
                label="API process"
                value={`${state.liveness.service} · up ${Math.round(state.liveness.uptimeSeconds)}s`}
                status="ok"
              />
              <CheckRow
                label="Database"
                value={
                  state.readiness.checks.database.message ??
                  `Responded in ${state.readiness.checks.database.latencyMs ?? 0} ms`
                }
                status={state.readiness.checks.database.status === 'ok' ? 'ok' : 'unavailable'}
              />
            </div>
          ) : null}

          <div>
            <Button onClick={() => void runChecks()} size="sm" variant="outline">
              <RefreshCw aria-hidden="true" />
              {state.kind === 'idle' ? 'Run checks' : 'Run again'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client configuration</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <CheckRow label="Environment" value={APP_ENV} />
          <CheckRow label="API base URL" value={API_BASE_URL} />
        </CardContent>
      </Card>

      {/* A `div` cannot live inside a `p`, and `Separator` renders one. */}
      <div className="text-muted-foreground space-y-3 text-xs">
        <Separator />
        <p>
          The API runs as a separate process. Start both with <code>npm run dev</code> from the
          repository root.
        </p>
      </div>
    </div>
  );
}
