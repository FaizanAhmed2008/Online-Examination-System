import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface ConfirmButtonProps {
  /** Label of the first, harmless-looking click. */
  children: React.ReactNode;
  /** Question shown after the first click. */
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}

/**
 * Two-step confirmation for destructive actions (PRD §11).
 *
 * The button asks for a second click instead of opening a modal, so it needs no
 * focus trap and behaves predictably in tests and on touch screens.
 */
export function ConfirmButton({
  children,
  confirmLabel = 'Confirm delete',
  onConfirm,
  disabled = false,
  className,
  variant = 'destructive',
  size = 'sm',
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Disarm automatically so a stray second click minutes later is not a delete.
  useEffect(() => {
    if (!armed) {
      return;
    }

    timer.current = setTimeout(() => setArmed(false), 5000);

    return () => clearTimeout(timer.current);
  }, [armed]);

  if (!armed) {
    return (
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={disabled}
        onClick={() => setArmed(true)}
      >
        {children}
      </Button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2" role="group" aria-label={confirmLabel}>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void Promise.resolve(onConfirm()).finally(() => {
            setBusy(false);
            setArmed(false);
          });
        }}
      >
        {confirmLabel}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size={size}
        disabled={busy}
        className={cn('text-muted-foreground', className)}
        onClick={() => setArmed(false)}
      >
        Cancel
      </Button>
    </span>
  );
}
