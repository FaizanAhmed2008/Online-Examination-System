import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

const TONE_STYLES = {
  error: {
    container: 'border-destructive/30 bg-destructive/5 text-destructive',
    icon: AlertTriangle,
  },
  success: {
    container: 'border-[color-moklch(0.55_0.13_155)]/30 bg-[color-moklch(0.55_0.13_155)]/5',
    icon: CheckCircle2,
  },
  info: {
    container: 'border-border bg-muted/40 text-foreground',
    icon: Info,
  },
} as const;

export type AlertTone = keyof typeof TONE_STYLES;

/**
 * Inline message for error, success and information states (PRD §12). Errors
 * are announced assertively so a screen reader reports a failed sign-in.
 */
function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: AlertTone;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { container, icon: Icon } = TONE_STYLES[tone];

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-lg border p-3 text-sm', container, className)}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 space-y-1">
        {title !== undefined && <p className="font-medium">{title}</p>}
        {children !== undefined && <div className="text-pretty opacity-90">{children}</div>}
      </div>
    </div>
  );
}

export { Alert };
