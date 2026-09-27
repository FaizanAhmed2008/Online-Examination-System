import type { PaperQuestion } from '@oes/shared';

import { cn } from '@/lib/utils';

export interface QuestionCardProps {
  question: PaperQuestion;
  /** 1-based position in the paper, as the student sees it. */
  position: number;
  selectedOptionId: string | null;
  onSelect: (optionId: string) => void;
}

/**
 * One multiple-choice question with its options (PRD §9).
 *
 * The options are real radio inputs inside labels rather than clickable divs, so
 * keyboard users get arrow-key selection and screen readers announce the group
 * and its position for free.
 */
export function QuestionCard({
  question,
  position,
  selectedOptionId,
  onSelect,
}: QuestionCardProps) {
  const groupName = `question-${question.questionId}`;

  return (
    <fieldset className="space-y-4">
      <legend className="flex w-full items-start justify-between gap-4">
        <span className="text-base leading-snug font-medium">
          <span className="text-muted-foreground mr-2">{position}.</span>
          {question.text}
        </span>
        <span className="text-muted-foreground shrink-0 text-sm">
          {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
        </span>
      </legend>

      <div className="flex flex-col gap-2">
        {question.options.map((option) => {
          const selected = option.id === selectedOptionId;

          return (
            <label
              key={option.id}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors',
                selected
                  ? 'border-primary bg-accent/50'
                  : 'hover:border-muted-foreground/40 hover:bg-accent/30',
              )}
            >
              <input
                type="radio"
                name={groupName}
                value={option.id}
                checked={selected}
                onChange={() => {
                  onSelect(option.id);
                }}
                className="mt-0.5 size-4 shrink-0 accent-primary"
              />
              <span className="min-w-0 flex-1">{option.text}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
