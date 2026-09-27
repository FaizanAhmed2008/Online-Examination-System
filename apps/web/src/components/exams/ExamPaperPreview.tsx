import { type Exam } from '@oes/shared';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export interface ExamPaperPreviewProps {
  exam: Exam;
}

/**
 * Read-only view of an exam in the order a student would meet it (PRD FR-16).
 *
 * The answer key is shown because this screen is only reachable by the lecturer
 * who owns the exam. The student-facing paper (PRD §21) deliberately omits it.
 */
export function ExamPaperPreview({ exam }: ExamPaperPreviewProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium">{exam.title}</h3>
          <Badge variant="outline">{exam.subject.code}</Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          {exam.questions.length} {exam.questions.length === 1 ? 'question' : 'questions'} ·{' '}
          {exam.totalMarks} marks · {exam.durationMinutes} minutes
        </p>
        {exam.instructions === null ? null : (
          <p className="text-muted-foreground text-sm">{exam.instructions}</p>
        )}
      </div>

      {exam.questions.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
          This exam has no questions yet.
        </p>
      ) : (
        <ol className="space-y-4">
          {exam.questions.map((entry, index) => (
            <li key={entry.questionId} className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <span className="text-muted-foreground w-5 shrink-0 pt-0.5 text-xs">
                  {index + 1}.
                </span>
                <p className="min-w-0 flex-1">{entry.question.text}</p>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {entry.marks} {entry.marks === 1 ? 'mark' : 'marks'}
                </span>
              </div>

              <ul className="ml-7 space-y-1.5">
                {entry.question.options.map((option) => (
                  <li
                    key={option.id}
                    className="text-muted-foreground flex items-center gap-2 text-sm"
                  >
                    <span
                      aria-hidden="true"
                      className={
                        option.isCorrect
                          ? 'size-1.5 rounded-full bg-[var(--success)]'
                          : 'size-1.5 rounded-full bg-border'
                      }
                    />
                    <span className={option.isCorrect ? 'text-foreground' : undefined}>
                      {option.text}
                    </span>
                    {option.isCorrect ? <span className="sr-only">(correct answer)</span> : null}
                  </li>
                ))}
              </ul>

              {index < exam.questions.length - 1 ? <Separator className="my-4" /> : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
