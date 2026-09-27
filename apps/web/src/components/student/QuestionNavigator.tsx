export interface QuestionNavigatorProps {
  total: number;
  current: number;
  /** 1-based numbers the student has answered. */
  answered: ReadonlySet<number>;
  onJump: (index: number) => void;
}

/**
 * The question palette (PRD §16: a student must be able to move around a paper
 * and see at a glance what is still unanswered).
 *
 * Each cell is a real button with its number as the accessible name, and colour
 * is only ever an addition to that: answered, current and unanswered are all
 * distinguishable from the number and the outline.
 */
export function QuestionNavigator({ total, current, answered, onJump }: QuestionNavigatorProps) {
  return (
    <nav aria-label="Questions">
      <ul className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
        {Array.from({ length: total }, (_, index) => index + 1).map((number) => {
          const isCurrent = number === current;
          const isAnswered = answered.has(number);

          return (
            <li key={number}>
              <button
                type="button"
                onClick={() => {
                  onJump(number - 1);
                }}
                aria-current={isCurrent ? 'step' : undefined}
                className={[
                  'flex size-9 items-center justify-center rounded-md border text-sm tabular-nums transition-colors',
                  isCurrent
                    ? 'border-primary bg-primary text-primary-foreground'
                    : isAnswered
                      ? 'border-primary/40 bg-accent text-foreground'
                      : 'border-border text-muted-foreground hover:bg-accent/50',
                ].join(' ')}
              >
                {number}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
