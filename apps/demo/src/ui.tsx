import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

/** Joins class names, dropping anything falsy. Enough for a prototype. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter((part) => typeof part === 'string' && part.length > 0).join(' ');
}

/* -------------------------------------------------------------------------- */
/* Layout                                                                     */
/* -------------------------------------------------------------------------- */

export function Page({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle === undefined ? null : <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      {children}
    </section>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('p-5', className)}>{children}</div>;
}

/* -------------------------------------------------------------------------- */
/* Controls                                                                   */
/* -------------------------------------------------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800',
  secondary: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' }) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm',
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  tone = 'slate',
  children,
}: {
  tone?: 'slate' | 'green' | 'amber' | 'red' | 'blue';
  children: ReactNode;
}) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-900',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-sky-100 text-sky-800',
  } as const;

  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint === undefined ? null : <span className="block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900';

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs tracking-wide text-slate-500 uppercase">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      </CardBody>
    </Card>
  );
}

export function Notice({
  tone = 'slate',
  children,
}: {
  tone?: 'slate' | 'red' | 'amber';
  children: ReactNode;
}) {
  const tones = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    red: 'border-red-200 bg-red-50 text-red-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
  } as const;

  return <div className={cx('rounded-lg border px-3 py-2 text-sm', tones[tone])}>{children}</div>;
}

/**
 * Two-click confirmation, so a stray click cannot submit an exam. The second
 * click is what acts; the first only arms it, and it disarms on its own after a
 * few seconds so a later click is never mistaken for a confirmation.
 */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  variant = 'primary',
  disabled = false,
}: {
  label: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) {
      return;
    }

    const timer = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(timer);
  }, [armed]);

  if (!armed) {
    return (
      <Button variant={variant} disabled={disabled} onClick={() => setArmed(true)}>
        {label}
      </Button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button
        variant={variant}
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </Button>
      <Button variant="ghost" onClick={() => setArmed(false)}>
        Cancel
      </Button>
    </span>
  );
}
