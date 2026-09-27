import { useId, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { createExamRequestSchema, type Exam, type Question, type Subject } from '@oes/shared';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api-client';

export interface ExamFormProps {
  subjects: Subject[];
  /** The lecturer's active questions, used to populate the picker. */
  availableQuestions: Question[];
  /** Provided when editing a draft; omitted when creating. */
  exam?: Exam;
  onSubmit: (input: ReturnType<typeof createExamRequestSchema.parse>) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

/**
 * Create/edit form for an exam draft (PRD FR-14).
 *
 * The paper is an ordered list rather than a set of checkboxes, because the order
 * is what a student sees. Marks are copied from the question by the API, so the
 * running total here is a preview of what the exam is worth, not a second source
 * of truth.
 */
export function ExamForm({
  subjects,
  availableQuestions,
  exam,
  onSubmit,
  onCancel,
  submitting = false,
}: ExamFormProps) {
  const fieldId = useId();
  const [subjectId, setSubjectId] = useState(exam?.subject.id ?? subjects[0]?.id ?? '');
  const [title, setTitle] = useState(exam?.title ?? '');
  const [durationMinutes, setDurationMinutes] = useState(String(exam?.durationMinutes ?? 30));
  const [instructions, setInstructions] = useState(exam?.instructions ?? '');
  const [paper, setPaper] = useState<Question[]>(() =>
    exam === undefined ? [] : exam.questions.map((entry) => entry.question),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // An exam is scoped to one subject, so the picker only offers that subject's
  // questions rather than letting a paper mix subjects.
  const candidates = useMemo(
    () => availableQuestions.filter((question) => question.subject.id === subjectId),
    [availableQuestions, subjectId],
  );

  const chosenIds = new Set(paper.map((question) => question.id));
  const totalMarks = paper.reduce((sum, question) => sum + question.marks, 0);

  const addQuestion = (question: Question): void => {
    setPaper((current) => [...current, question]);
  };

  const removeAt = (index: number): void => {
    setPaper((current) => current.filter((_, position) => position !== index));
  };

  const move = (index: number, offset: -1 | 1): void => {
    setPaper((current) => {
      const target = index + offset;

      if (target < 0 || target >= current.length) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(index, 1);

      if (moved === undefined) {
        return current;
      }

      next.splice(target, 0, moved);
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = createExamRequestSchema.safeParse({
      subjectId,
      title,
      instructions: instructions.length === 0 ? null : instructions,
      durationMinutes: Number(durationMinutes),
      questionIds: paper.map((question) => question.id),
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};

      for (const issue of parsed.error.issues) {
        const key = issue.path[0] === undefined ? 'form' : String(issue.path[0]);
        errors[key] ??= issue.message;
      }

      setFieldErrors(errors);
      return;
    }

    try {
      await onSubmit(parsed.data);
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(
          error.details.reduce<Record<string, string>>((accumulator, detail) => {
            accumulator[detail.path.split('.')[0] ?? 'form'] ??= detail.message;
            return accumulator;
          }, {}),
        );

        if (error.details.length === 0) {
          setFormError(error.message);
        }

        return;
      }

      setFormError('The exam could not be saved.');
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5" noValidate>
      {formError === null ? null : <Alert tone="error">{formError}</Alert>}

      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-title`}>Title</Label>
        <Input
          id={`${fieldId}-title`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Operating Systems Mid-term"
          aria-invalid={fieldErrors['title'] !== undefined}
        />
        <FieldError message={fieldErrors['title']} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${fieldId}-subject`}>Subject</Label>
          <Select
            id={`${fieldId}-subject`}
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            aria-invalid={fieldErrors['subjectId'] !== undefined}
          >
            <option value="" disabled>
              Choose a subject
            </option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name} ({subject.code})
              </option>
            ))}
          </Select>
          <FieldError message={fieldErrors['subjectId']} />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${fieldId}-duration`}>Duration (minutes)</Label>
          <Input
            id={`${fieldId}-duration`}
            type="number"
            min={5}
            max={300}
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(event.target.value)}
            aria-invalid={fieldErrors['durationMinutes'] !== undefined}
          />
          <FieldError message={fieldErrors['durationMinutes']} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-instructions`}>
          Instructions <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id={`${fieldId}-instructions`}
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          rows={2}
          placeholder="Shown to students before the exam starts."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3" aria-labelledby={`${fieldId}-paper-heading`}>
          <div className="flex items-baseline justify-between gap-2">
            <h3 id={`${fieldId}-paper-heading`} className="text-sm font-medium">
              Paper
            </h3>
            <p className="text-muted-foreground text-xs">
              {paper.length} {paper.length === 1 ? 'question' : 'questions'} · {totalMarks} marks
            </p>
          </div>

          {paper.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
              No questions yet. Pick some from your question bank on the right. A draft can be saved
              empty, but it cannot be published until it has at least one question.
            </p>
          ) : (
            <ol className="space-y-2">
              {paper.map((question, index) => (
                <li
                  key={question.id}
                  className="flex items-start gap-2 rounded-lg border p-3 text-sm"
                >
                  <span className="text-muted-foreground w-5 shrink-0 pt-0.5 text-xs">
                    {index + 1}.
                  </span>
                  <span className="min-w-0 flex-1">{question.text}</span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
                  </span>
                  <span className="flex shrink-0 items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move question ${index + 1} up`}
                    >
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => move(index, 1)}
                      disabled={index === paper.length - 1}
                      aria-label={`Move question ${index + 1} down`}
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAt(index)}
                      aria-label={`Remove question ${index + 1}`}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </span>
                </li>
              ))}
            </ol>
          )}
          <FieldError message={fieldErrors['questionIds']} />
        </section>

        <section className="space-y-3" aria-labelledby={`${fieldId}-bank-heading`}>
          <h3 id={`${fieldId}-bank-heading`} className="text-sm font-medium">
            Your question bank
          </h3>

          {candidates.length === 0 ? (
            <Alert tone="info" title="No questions in this subject">
              Add questions to the bank first, then come back and build the paper from them.
            </Alert>
          ) : (
            <ul className="space-y-2">
              {candidates.map((question) => {
                const chosen = chosenIds.has(question.id);

                return (
                  <li
                    key={question.id}
                    className="flex items-start gap-2 rounded-lg border p-3 text-sm"
                  >
                    <span className="min-w-0 flex-1">{question.text}</span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
                    </span>
                    <Button
                      type="button"
                      variant={chosen ? 'ghost' : 'outline'}
                      size="sm"
                      disabled={chosen}
                      onClick={() => addQuestion(question)}
                      aria-label={`Add question: ${question.text}`}
                    >
                      <Plus aria-hidden="true" />
                      {chosen ? 'Added' : 'Add'}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? <Spinner label="Saving" /> : null}
          {exam === undefined ? 'Create draft' : 'Save changes'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function FieldError({ message }: { message: string | undefined }) {
  if (message === undefined) {
    return null;
  }

  return (
    <p role="alert" className="text-destructive text-sm">
      {message}
    </p>
  );
}
