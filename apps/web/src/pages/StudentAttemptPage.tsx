import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, ArrowRight, Send } from 'lucide-react';
import type { Attempt, AttemptAnswerInput, AttemptResult } from '@oes/shared';

import { QuestionCard } from '@/components/student/QuestionCard';
import { QuestionNavigator } from '@/components/student/QuestionNavigator';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { ApiError, getAttempt, saveAttemptAnswers, submitAttempt } from '@/lib/api-client';

type LoadState = 'loading' | 'ready' | 'error';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const SAVE_LABEL: Record<SaveState, string> = {
  idle: 'All changes saved',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Not saved',
};

/** Milliseconds left, never negative, so the countdown can floor at zero. */
function remainingMs(expiresAt: string, now: number): number {
  return Math.max(0, Date.parse(expiresAt) - now);
}

function formatClock(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * The attempt screen (PRD FR-16).
 *
 * One question is shown at a time, because a paper read end-to-end on one screen
 * tempts a student to answer from memory of the layout rather than from the
 * question in front of them. Answers autosave on every choice so a refresh, a
 * crash or a closed tab costs nothing, and the palette shows what is left.
 */
export function StudentAttemptPage() {
  const { attemptId } = useParams();

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [now, setNow] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);

  const load = useCallback(async () => {
    if (attemptId === undefined) {
      setError('That attempt does not exist.');
      setState('error');
      return;
    }

    setState('loading');
    setError(null);

    try {
      const loaded = await getAttempt(attemptId);

      setAttempt(loaded);
      setAnswers(toAnswerMap(loaded));
      setState('ready');

      if (loaded.status === 'SUBMITTED') {
        setError('This attempt has already been submitted.');
      }
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'That attempt could not be opened.');
      setState('error');
    }
  }, [attemptId]);

  useEffect(() => {
    void load();
  }, [load]);

  const questions = useMemo(() => attempt?.questions ?? [], [attempt]);
  const current = questions[index];
  const total = questions.length;

  const answeredNumbers = useMemo(() => {
    const numbers = new Set<number>();

    questions.forEach((question, position) => {
      if (answers[question.questionId] !== undefined) {
        numbers.add(position + 1);
      }
    });

    return numbers;
  }, [answers, questions]);

  const remaining = attempt === null ? 0 : remainingMs(attempt.expiresAt, now);
  const expired = attempt !== null && attempt.status === 'IN_PROGRESS' && remaining === 0;

  /**
   * Autosave. Every choice is written immediately rather than on a debounce:
   * a lost keystroke-free click is the one failure a student cannot detect, and
   * the request is small and idempotent.
   */
  const persist = useCallback(
    async (next: Record<string, string>) => {
      if (attempt === null || attempt.status === 'SUBMITTED') {
        return;
      }

      setSaveState('saving');

      try {
        await saveAttemptAnswers(attempt.attemptId, toPayload(questions, next));
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    },
    [attempt, questions],
  );

  function handleSelect(optionId: string) {
    if (current === undefined) {
      return;
    }

    const next = { ...answers, [current.questionId]: optionId };
    setAnswers(next);
    void persist(next);
  }

  const handleSubmit = useCallback(async () => {
    if (attempt === null) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const outcome = await submitAttempt(attempt.attemptId, toPayload(questions, answers));
      setResult(outcome);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Your attempt could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  }, [answers, attempt, questions]);

  // Runs the countdown only while an attempt is actually in progress.
  useEffect(() => {
    if (attempt === null || attempt.status === 'SUBMITTED' || result !== null) {
      return;
    }

    setNow(Date.now());
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [attempt, result]);

  // Out of time: submit what has been saved rather than leaving a dead screen.
  useEffect(() => {
    if (expired && !submitting) {
      void handleSubmit();
    }
  }, [expired, handleSubmit, submitting]);

  if (result !== null) {
    return <SubmittedResult result={result} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{attempt?.title ?? 'Exam'}</h1>
          {attempt === null ? null : (
            <p className="text-muted-foreground text-sm">
              {attempt.subject.name} ({attempt.subject.code}) · {attempt.totalMarks} marks
            </p>
          )}
        </div>

        {attempt === null ? null : (
          <div className="text-right">
            <p className="text-muted-foreground text-xs">Time remaining</p>
            <p
              className={`text-lg font-semibold tabular-nums ${remaining < 60_000 ? 'text-destructive' : ''}`}
            >
              {formatClock(remaining)}
            </p>
          </div>
        )}
      </div>

      {error === null ? null : <Alert tone="error">{error}</Alert>}

      {state === 'loading' ? (
        <div className="py-10 text-center">
          <Spinner label="Loading attempt" />
        </div>
      ) : null}

      {state === 'error' ? (
        <Alert tone="error" title="Attempt unavailable">
          {error === null ? 'That attempt could not be opened.' : null}
          <div className="mt-2">
            <Button asChild type="button" variant="outline" size="sm">
              <Link to="/student/exams">Back to exams</Link>
            </Button>
          </div>
        </Alert>
      ) : null}

      {state === 'ready' && current !== undefined ? (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <p className="font-medium">
                Question {index + 1} of {total}
              </p>
              <p className="text-muted-foreground" role="status">
                {answeredNumbers.size} of {total} answered
              </p>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={answeredNumbers.size}
              aria-label="Questions answered"
              className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
            >
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${total === 0 ? 0 : (answeredNumbers.size / total) * 100}%` }}
              />
            </div>
          </div>

          <Card>
            <CardContent className="space-y-5">
              <QuestionCard
                question={current}
                position={index + 1}
                selectedOptionId={answers[current.questionId] ?? null}
                onSelect={handleSelect}
              />

              <Separator />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={index === 0}
                  onClick={() => {
                    setIndex((current) => Math.max(0, current - 1));
                  }}
                >
                  <ArrowLeft aria-hidden="true" />
                  Previous
                </Button>

                <div className="flex items-center gap-3">
                  <Badge variant={saveState === 'error' ? 'destructive' : 'secondary'}>
                    {SAVE_LABEL[saveState]}
                  </Badge>

                  {index < total - 1 ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setIndex((current) => current + 1);
                      }}
                    >
                      Next
                      <ArrowRight aria-hidden="true" />
                    </Button>
                  ) : (
                    <ConfirmButton
                      confirmLabel="Confirm submit"
                      onConfirm={() => handleSubmit()}
                      disabled={submitting || expired}
                    >
                      {submitting ? <Spinner label="Submitting" /> : <Send aria-hidden="true" />}
                      Submit
                    </ConfirmButton>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-medium">Questions</h2>
                <p className="text-muted-foreground text-xs">
                  Jump to any question you have not answered yet.
                </p>
              </div>

              <QuestionNavigator
                total={total}
                current={index + 1}
                answered={answeredNumbers}
                onJump={(next) => {
                  setIndex(next);
                }}
              />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

/** What the student sees the moment their paper is finalised. */
function SubmittedResult({ result }: { result: AttemptResult }) {
  const navigate = useNavigate();
  const percent =
    result.totalMarks === 0 ? 0 : Math.round((result.score / result.totalMarks) * 100);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Attempt submitted</h1>
        <p className="text-muted-foreground text-sm">{result.title}</p>
      </div>

      <Card>
        <CardContent className="space-y-4 py-8 text-center">
          <p className="text-muted-foreground text-sm">Your score</p>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">
            {`${result.score} / ${result.totalMarks}`}
          </p>
          <p className="text-sm">{percent}%</p>
          <p className="text-muted-foreground text-sm">
            {result.answeredCount} of {result.questionCount} questions answered.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button type="button" onClick={() => navigate('/student/exams')}>
          Back to exams
        </Button>
        <Button asChild type="button" variant="ghost">
          <Link to="/student">My dashboard</Link>
        </Button>
      </div>
    </div>
  );
}

function toAnswerMap(attempt: Attempt): Record<string, string> {
  const map: Record<string, string> = {};

  for (const answer of attempt.answers) {
    if (answer.selectedOptionId !== null) {
      map[answer.questionId] = answer.selectedOptionId;
    }
  }

  return map;
}

/**
 * The full answer set, sent as a replace rather than a diff: one unanswered
 * question is sent as `null` so clearing a choice actually clears it on the
 * server instead of leaving the previous selection behind.
 */
function toPayload(
  questions: readonly { questionId: string }[],
  answers: Record<string, string>,
): AttemptAnswerInput[] {
  return questions.map((question) => ({
    questionId: question.questionId,
    selectedOptionId: answers[question.questionId] ?? null,
  }));
}
