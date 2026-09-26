import { cn } from '@/lib/utils';

/**
 * Indeterminate progress indicator for async surfaces (PRD §12: skeletons or
 * purposeful loading indicators instead of blank screens).
 */
function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn('inline-flex items-center gap-2', className)}
    >
      <span
        aria-hidden="true"
        className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export { Spinner };
