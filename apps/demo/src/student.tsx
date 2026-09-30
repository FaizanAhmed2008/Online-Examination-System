import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, FileText, Send, XCircle } from 'lucide-react';

import type { Route } from './App';
import type { Attempt, Exam, Question } from './data';
import { SUBJECT_NAME, STUDENT_NAME } from './data';
import {
  attemptFor,
  examMarks,
  grade,
  isSubmitted,
  newAttempt,
  publishedExams,
  type Store,
} from './store';
import { Badge, Button, Card, CardBody, ConfirmButton, Notice, Page, Stat, cx } from './ui';

type Go = (route: Route) => void;

/** "Operating Systems (CS204)" — the label used everywhere an exam is shown. */
/** "Operating Systems (CS204)" — the label used everywhere an exam is shown. */
function subjectLabel(exam: Exam): string {
  const name = SUBJECT_NAME.get(exam.subject);
  return name === undefined ? exam.subject : `${name} (${exam.subject})`;
}

/* -------------------------------------------------------------------------- */
/* Dashboard and exam list                                                     */
/* -------------------------------------------------------------------------- */

export function StudentHome({ store, go }: { store: Store; go: Go }) {
  const { state } = store;
  const exams = publishedExams(state);
  const withAttempt = exams.map((exam) => ({ exam, attempt: attemptFor(state, exam.id) }));
  const open = withAttempt.filter(({ attempt }) => attempt === undefined || !isSubmitted(attempt));
  const done = withAttempt.filter(({ attempt }) => isSubmitted(attempt));
  const name = STUDENT_NAME.split(' ')[0] ?? STUDENT_NAME;

  return (
    <Page
      title={`Hello, ${name}`}
      subtitle="Every exam your lecturer has published, and how far you have got with each one."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Available" value={exams.length} />
        <Stat label="In progress" value={open.length} />
        <Stat label="Completed" value={done.length} />
      </div>

      {exams.length === 0 ? (
        <Notice>
          Nothing has been published yet. Ask your lecturer to publish an exam, or use the Faculty
          role to publish the seeded draft paper.
        </Notice>
      ) : (
        <ul className="grid gap-3">
          {withAttempt.map(({ exam, attempt }) => (
            <li key={exam.id}>
              <ExamCard exam={exam} attempt={attempt} store={store} go={go} />
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

function ExamCard({
  exam,
  attempt,
  store,
  go,
}: {
  exam: Exam;
  attempt: Attempt | undefined;
  store: Store;
  go: Go;
}) {
  const { state } = store;
  const name = subjectLabel(exam);
  const marks = examMarks(exam, state.questions);
  const submitted = isSubmitted(attempt);

  return (
    <Card>
      <CardBody className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">{exam.title}</h2>
            <StatusBadge attempt={attempt} />
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            <span>{name}</span>
            <span className="inline-flex items-center gap-1">
              <FileText aria-hidden="true" className="size-3.5" />
              {exam.questionIds.length} questions · {marks} marks
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock aria-hidden="true" className="size-3.5" />
              {exam.durationMinutes} min
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {submitted ? (
            <>
              <p className="text-sm">
                Scored{' '}
                <span className="font-semibold tabular-nums">
                  {attempt?.score} / {marks}
                </span>
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  go({ name: 'result', attemptId: attempt?.id ?? '' });
                }}
              >
                Review answers
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                go({ name: 'brief', examId: exam.id });
              }}
            >
              {attempt === undefined ? 'View details' : 'Resume'}
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function StatusBadge({ attempt }: { attempt: Attempt | undefined }) {
  if (attempt === undefined) {
    return <Badge>Not started</Badge>;
  }

  return isSubmitted(attempt) ? (
    <Badge tone="green">Submitted</Badge>
  ) : (
    <Badge tone="blue">In progress</Badge>
  );
}

/* -------------------------------------------------------------------------- */
/* Instructions and start                                                      */
/* -------------------------------------------------------------------------- */

export function StudentBrief({ examId, store, go }: { examId: string; store: Store; go: Go }) {
  const { state, setState } = store;
  const [error, setError] = useState<string | null>(null);
  const exam = state.exams.find((candidate) => candidate.id === examId);

  if (exam === undefined || exam.status !== 'PUBLISHED') {
    return (
      <Page title="Exam unavailable">
        <Notice tone="red">That exam is not available. It may have been unpublished.</Notice>
      </Page>
    );
  }

  const existing = attemptFor(state, exam.id);
  const marks = examMarks(exam, state.questions);
  const started = existing !== undefined && !isSubmitted(existing);

  /** Starts an attempt, or resumes the one already in flight. */
  const start = () => {
    if (existing !== undefined) {
      go({ name: 'attempt', attemptId: existing.id });
      return;
    }

    try {
      const attempt = newAttempt(exam);

      setState((state) => ({ ...state, attempts: [...state.attempts, attempt] }));
      go({ name: 'attempt', attemptId: attempt.id });
    } catch {
      setError('The attempt could not be started. Reset the demo and try again.');
    }
  };

  return (
    <div className="space-y-6">
      <BackLink go={go} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{exam.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{subjectLabel(exam)}</p>
      </div>

      <Card>
        <CardBody className="space-y-4">
          <h2 className="font-semibold">Before you start</h2>

          <dl className="grid gap-3 sm:grid-cols-3">
            <Fact label="Questions" value={String(exam.questionIds.length)} />
            <Fact label="Time limit" value={`${exam.durationMinutes} minutes`} />
            <Fact label="Total marks" value={String(marks)} />
          </dl>

          <div className="space-y-1.5">
            <h3 className="text-sm font-medium">Instructions</h3>
            <p className="text-sm whitespace-pre-line text-slate-700">{exam.instructions}</p>
          </div>

          <Notice tone="amber">
            The clock starts the moment you press Start. You can move between questions and change
            answers until you submit.
          </Notice>

          {error === null ? null : <Notice tone="red">{error}</Notice>}

          <Button onClick={start}>{started ? 'Resume exam' : 'Start attempt'}</Button>
        </CardBody>
      </Card>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The attempt screen                                                          */
/* -------------------------------------------------------------------------- */

/** Questions of an exam, in paper order. */
function paperQuestions(exam: Exam, questions: Question[]): Question[] {
  return exam.questionIds
    .map((id) => questions.find((question) => question.id === id))
    .filter((question): question is Question => question !== undefined);
}

function formatClock(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function StudentAttempt({
  attemptId,
  store,
  go,
}: {
  attemptId: string;
  store: Store;
  go: Go;
}) {
  const { state, setState } = store;
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const attempt = state.attempts.find((candidate) => candidate.id === attemptId);
  const exam = state.exams.find((candidate) => candidate.id === attempt?.examId);

  const questions = useMemo(
    () => (exam === undefined ? [] : paperQuestions(exam, state.questions)),
    [exam, state.questions],
  );

  const submit = useCallback(() => {
    if (attempt === undefined || exam === undefined) {
      return;
    }

    setState((current) => ({
      ...current,
      attempts: current.attempts.map((candidate) =>
        candidate.id === attempt.id
          ? {
              ...candidate,
              submittedAt: Date.now(),
              score: grade(exam, current.questions, candidate.answers),
            }
          : candidate,
      ),
    }));

    go({ name: 'result', attemptId: attempt.id });
  }, [attempt, exam, go, setState]);

  // One timer for the whole screen: the countdown, and the hand-off to an
  // automatic submission once the clock runs out.
  useEffect(() => {
    if (attempt === undefined || isSubmitted(attempt)) {
      return;
    }

    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      clearInterval(timer);
    };
  }, [attempt]);

  const remaining = attempt === undefined ? 0 : Math.max(0, attempt.expiresAt - now);
  const expired = attempt !== undefined && !isSubmitted(attempt) && remaining === 0;

  useEffect(() => {
    if (expired) {
      submit();
    }
  }, [expired, submit]);

  if (attempt === undefined || exam === undefined) {
    return (
      <Page title="Attempt not found">
        <Notice tone="red">That attempt no longer exists.</Notice>
      </Page>
    );
  }

  if (isSubmitted(attempt)) {
    return (
      <Page title="Already submitted">
        <Notice tone="amber">
          This attempt is closed.{' '}
          <button
            type="button"
            className="font-medium underline"
            onClick={() => {
              go({ name: 'result', attemptId: attempt.id });
            }}
          >
            View your result
          </button>
          .
        </Notice>
      </Page>
    );
  }

  const current = questions[index];
  const answered = new Set(
    Object.entries(attempt.answers)
      .filter(([, chosen]) => chosen !== null)
      .map(([questionId]) => questionId),
  );

  const choose = (optionId: string) => {
    const question = current;

    if (question === undefined) {
      return;
    }

    // Saved straight into state, so a refresh or a crash loses nothing: there is
    // no separate "save answers" step in this flow.
    setState((state) => ({
      ...state,
      attempts: state.attempts.map((candidate) =>
        candidate.id === attempt.id
          ? { ...candidate, answers: { ...candidate.answers, [question.id]: optionId } }
          : candidate,
      ),
    }));
  };

  if (current === undefined) {
    return (
      <Page title="Nothing to answer">
        <Notice tone="red">This exam has no questions yet.</Notice>
      </Page>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">{exam.title}</h1>
          <p className="mt-0.5 text-sm text-slate-600">{subjectLabel(exam)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Time remaining</p>
          <p
            className={cx(
              'text-lg font-semibold tabular-nums',
              remaining < 60_000 ? 'text-red-600' : 'text-slate-900',
            )}
          >
            {formatClock(remaining)}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <p className="font-medium">
            Question {index + 1} of {questions.length}
          </p>
          <p className="text-slate-600">
            {answered.size} of {questions.length} answered
          </p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-slate-900 transition-all"
            style={{ width: `${(answered.size / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <Card>
        <CardBody className="space-y-5">
          <fieldset>
            <legend className="flex w-full items-start justify-between gap-4">
              <span className="prose-question text-base leading-snug font-medium">
                <span className="mr-2 text-slate-500">{index + 1}.</span>
                {current.text}
              </span>
              <span className="shrink-0 text-sm text-slate-600">
                {current.marks} {current.marks === 1 ? 'mark' : 'marks'}
              </span>
            </legend>

            <div className="mt-4 flex flex-col gap-2">
              {current.options.map((option) => {
                const selected = attempt.answers[current.id] === option.id;

                return (
                  <label
                    key={option.id}
                    className={cx(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors',
                      selected
                        ? 'border-slate-900 bg-slate-100'
                        : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50',
                    )}
                  >
                    <input
                      type="radio"
                      name={`question-${current.id}`}
                      checked={selected}
                      onChange={() => {
                        choose(option.id);
                      }}
                      className="mt-0.5 size-4 shrink-0 accent-slate-900"
                    />
                    <span className="min-w-0 flex-1">{option.text}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <Button
              variant="secondary"
              disabled={index === 0}
              onClick={() => {
                setIndex((value) => Math.max(0, value - 1));
              }}
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Previous
            </Button>

            {index < questions.length - 1 ? (
              <Button
                onClick={() => {
                  setIndex((value) => value + 1);
                }}
              >
                Next
                <ArrowRight aria-hidden="true" className="size-4" />
              </Button>
            ) : (
              <ConfirmButton
                label={
                  <span className="inline-flex items-center gap-2">
                    <Send aria-hidden="true" className="size-4" />
                    Submit
                  </span>
                }
                confirmLabel="Yes, submit now"
                onConfirm={submit}
              />
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <h2 className="text-sm font-medium">Jump to a question</h2>
          <ul className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
            {questions.map((question, position) => (
              <li key={question.id}>
                <button
                  type="button"
                  aria-current={position === index ? 'step' : undefined}
                  onClick={() => {
                    setIndex(position);
                  }}
                  className={cx(
                    'flex size-9 items-center justify-center rounded-md border text-sm tabular-nums transition-colors',
                    position === index
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : answered.has(question.id)
                        ? 'border-slate-400 bg-slate-100'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                  )}
                >
                  {position + 1}
                </button>
              </li>
            ))}
          </ul>
          {answered.size < questions.length ? (
            <p className="text-xs text-slate-500">
              {questions.length - answered.size} unanswered question
              {questions.length - answered.size === 1 ? '' : 's'} — you can still submit, and an
              unanswered question simply scores zero.
            </p>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Result                                                                     */
/* -------------------------------------------------------------------------- */

export function StudentResult({
  attemptId,
  store,
  go,
}: {
  attemptId: string;
  store: Store;
  go: Go;
}) {
  const { state } = store;
  const attempt = state.attempts.find((candidate) => candidate.id === attemptId);
  const exam = state.exams.find((candidate) => candidate.id === attempt?.examId);

  if (attempt === undefined || exam === undefined || attempt.submittedAt === null) {
    return (
      <Page title="No result yet">
        <Notice tone="red">That attempt has not been submitted.</Notice>
      </Page>
    );
  }

  const questions = paperQuestions(exam, state.questions);
  const total = examMarks(exam, state.questions);
  const percent = total === 0 ? 0 : Math.round(((attempt.score ?? 0) / total) * 100);

  return (
    <Page
      title="Result published"
      subtitle={`${exam.title} · submitted ${new Date(attempt.submittedAt).toLocaleString()}`}
    >
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-6 py-6">
          <div>
            <p className="text-sm text-slate-600">Your score</p>
            <p className="text-4xl font-semibold tabular-nums">
              {`${attempt.score ?? 0} / ${total}`}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {percent}% · {Object.values(attempt.answers).filter((a) => a !== null).length} of{' '}
              {questions.length} answered
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              go({ name: 'student' });
            }}
          >
            Back to my exams
          </Button>
        </CardBody>
      </Card>

      <div className="space-y-3">
        <h2 className="font-semibold">Review</h2>
        {questions.map((question, position) => {
          const chosen = attempt.answers[question.id] ?? null;
          const correct = question.options.find((option) => option.isCorrect);
          const isRight = chosen !== null && chosen === correct?.id;

          return (
            <Card key={question.id}>
              <CardBody className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <p className="prose-question text-sm font-medium">
                    <span className="mr-2 text-slate-500">{position + 1}.</span>
                    {question.text}
                  </p>
                  {isRight ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-emerald-700">
                      <CheckCircle2 aria-hidden="true" className="size-4" />
                      Correct
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-red-700">
                      <XCircle aria-hidden="true" className="size-4" />
                      Not correct
                    </span>
                  )}
                </div>

                <dl className="space-y-1 text-sm">
                  <div className="flex gap-2">
                    <dt className="w-28 shrink-0 text-slate-500">Your answer</dt>
                    <dd>
                      {chosen === null ? (
                        <em className="text-slate-500">not answered</em>
                      ) : (
                        textOf(question, chosen)
                      )}
                    </dd>
                  </div>
                  {isRight ? null : (
                    <div className="flex gap-2">
                      <dt className="w-28 shrink-0 text-slate-500">Correct answer</dt>
                      <dd className="font-medium">{correct === undefined ? '—' : correct.text}</dd>
                    </div>
                  )}
                </dl>

                <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  {question.explanation}
                </p>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </Page>
  );
}

function textOf(question: Question, optionId: string): string {
  return question.options.find((option) => option.id === optionId)?.text ?? optionId;
}

function BackLink({ go }: { go: Go }) {
  return (
    <button
      type="button"
      onClick={() => {
        go({ name: 'student' });
      }}
      className="-ml-2 inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      All my exams
    </button>
  );
}
