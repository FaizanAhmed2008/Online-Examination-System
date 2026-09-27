import { useId, useState } from 'react';
import { createQuestionRequestSchema, type Question, type Subject } from '@oes/shared';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { ApiError } from '@/lib/api-client';

interface OptionDraft {
  key: string;
  text: string;
  isCorrect: boolean;
}

export interface QuestionFormProps {
  subjects: Subject[];
  /** Provided when editing; omitted when creating. */
  question?: Question;
  onSubmit: (input: ReturnType<typeof createQuestionRequestSchema.parse>) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

let optionKey = 0;
const nextKey = (): string => `option-${(optionKey += 1)}`;

function draftFrom(question: Question | undefined): OptionDraft[] {
  if (question === undefined || question.options.length === 0) {
    return [
      { key: nextKey(), text: '', isCorrect: true },
      { key: nextKey(), text: '', isCorrect: false },
    ];
  }

  return question.options.map((option) => ({
    key: nextKey(),
    text: option.text,
    isCorrect: option.isCorrect,
  }));
}

/**
 * Create/edit form for a single-correct multiple choice question (PRD FR-13).
 *
 * The correct answer is chosen with a radio group rather than a checkbox, so
 * "exactly one correct option" is impossible to violate from the UI. The shared
 * schema re-checks it anyway before the request is sent.
 */
export function QuestionForm({
  subjects,
  question,
  onSubmit,
  onCancel,
  submitting = false,
}: QuestionFormProps) {
  const fieldId = useId();
  const [subjectId, setSubjectId] = useState(question?.subject.id ?? subjects[0]?.id ?? '');
  const [text, setText] = useState(question?.text ?? '');
  const [marks, setMarks] = useState(String(question?.marks ?? 1));
  const [explanation, setExplanation] = useState(question?.explanation ?? '');
  const [options, setOptions] = useState<OptionDraft[]>(() => draftFrom(question));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const correctIndex = options.findIndex((option) => option.isCorrect);

  const markCorrect = (index: number): void => {
    setOptions((current) =>
      current.map((option, position) => ({ ...option, isCorrect: position === index })),
    );
    setFieldErrors((current) => {
      const { options: _removed, ...rest } = current;
      return rest;
    });
  };

  const patchOption = (index: number, next: string): void => {
    setOptions((current) =>
      current.map((option, position) => (position === index ? { ...option, text: next } : option)),
    );
  };

  const addOption = (): void => {
    setOptions((current) => [...current, { key: nextKey(), text: '', isCorrect: false }]);
  };

  const removeOption = (index: number): void => {
    setOptions((current) => {
      const next = current.filter((_, position) => position !== index);

      if (correctIndex === index) {
        // Never leave the form with no correct answer after removing the keyed one.
        return next.map((option, position) => ({ ...option, isCorrect: position === 0 }));
      }

      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = createQuestionRequestSchema.safeParse({
      subjectId,
      text,
      type: 'SINGLE_CHOICE',
      marks: Number(marks),
      explanation: explanation.length === 0 ? null : explanation,
      options: options.map((option) => ({ text: option.text, isCorrect: option.isCorrect })),
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

      setFormError('The question could not be saved.');
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5" noValidate>
      {formError === null ? null : <Alert tone="error">{formError}</Alert>}

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
        <Label htmlFor={`${fieldId}-text`}>Question</Label>
        <Textarea
          id={`${fieldId}-text`}
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          placeholder="Which scheduling algorithm can starve a process?"
          aria-invalid={fieldErrors['text'] !== undefined}
        />
        <FieldError message={fieldErrors['text']} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${fieldId}-marks`}>Marks</Label>
          <Input
            id={`${fieldId}-marks`}
            type="number"
            min={1}
            max={100}
            value={marks}
            onChange={(event) => setMarks(event.target.value)}
            aria-invalid={fieldErrors['marks'] !== undefined}
          />
          <FieldError message={fieldErrors['marks']} />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${fieldId}-type`}>Type</Label>
          <Input id={`${fieldId}-type`} value="Single choice" readOnly disabled />
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Options</legend>
        <p className="text-muted-foreground text-xs">
          Select the radio button next to the correct answer. Exactly one option must be correct.
        </p>

        {options.map((option, index) => (
          <div key={option.key} className="flex items-start gap-3">
            <input
              type="radio"
              name={`${fieldId}-correct`}
              className="mt-2.5 size-4"
              checked={option.isCorrect}
              onChange={() => markCorrect(index)}
              aria-label={`Mark option ${index + 1} as correct`}
            />
            <Input
              value={option.text}
              onChange={(event) => patchOption(index, event.target.value)}
              placeholder={`Option ${index + 1}`}
              aria-label={`Option ${index + 1} text`}
              aria-invalid={fieldErrors['options'] !== undefined}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeOption(index)}
              disabled={options.length <= 2}
              aria-label={`Remove option ${index + 1}`}
            >
              Remove
            </Button>
          </div>
        ))}

        <FieldError message={fieldErrors['options']} />

        <Button type="button" variant="outline" size="sm" onClick={addOption}>
          Add option
        </Button>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-explanation`}>
          Explanation <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id={`${fieldId}-explanation`}
          value={explanation}
          onChange={(event) => setExplanation(event.target.value)}
          rows={2}
          placeholder="Shown to students after they submit."
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? <Spinner label="Saving" /> : null}
          {question === undefined ? 'Create question' : 'Save changes'}
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
