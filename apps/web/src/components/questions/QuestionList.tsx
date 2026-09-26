import type { Question } from '@oes/shared';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmButton } from '@/components/ui/confirm-button';

export interface QuestionListProps {
  questions: Question[];
  onEdit: (question: Question) => void;
  onDelete: (question: Question) => void | Promise<void>;
  busyId?: string | undefined;
}

/**
 * The faculty's own questions, newest first.
 *
 * The correct option is marked here because this list is only ever rendered for
 * the author; the student-facing view is the attempt feature's job (PRD §21).
 */
export function QuestionList({ questions, onEdit, onDelete, busyId }: QuestionListProps) {
  return (
    <ul className="space-y-4" data-testid="question-list">
      {questions.map((question) => (
        <li key={question.id}>
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-base font-medium text-balance">
                  {question.text}
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  {question.subject.name} ({question.subject.code})
                </p>
              </div>
              <Badge variant="secondary">{question.marks} marks</Badge>
            </CardHeader>

            <CardContent className="space-y-4">
              <ol className="space-y-1.5">
                {question.options.map((option) => (
                  <li
                    key={option.id}
                    className={
                      option.isCorrect ? 'text-foreground font-medium' : 'text-muted-foreground'
                    }
                  >
                    <span aria-hidden="true" className="mr-2">
                      {option.isCorrect ? '✓' : '○'}
                    </span>
                    {option.text}
                    {option.isCorrect ? <span className="sr-only"> (correct answer)</span> : null}
                  </li>
                ))}
              </ol>

              {question.explanation === null || question.explanation.length === 0 ? null : (
                <p className="text-muted-foreground border-l-2 pl-3 text-sm italic">
                  {question.explanation}
                </p>
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(question)}
                  disabled={busyId === question.id}
                >
                  Edit
                </Button>
                <ConfirmButton
                  onConfirm={() => onDelete(question)}
                  disabled={busyId === question.id}
                >
                  Delete
                </ConfirmButton>
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
