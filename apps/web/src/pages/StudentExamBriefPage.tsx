import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Clock, FileText } from 'lucide-react';
import type { AvailableExam } from '@oes/shared';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ApiError, listAvailableExams, startAttempt } from '@/lib/api-client';

type LoadState = 'loading' | 'ready' | 'error';

/**
 * Exam instructions and the start gate (PRD FR-16).
 *
 * Nothing is written to the database until the student presses Start, so opening
 * this screen and reading the rules costs no attempt. A student who already has
 * an attempt in flight is sent straight back into it instead of being offered a
 * second start, because the API allows only one.
 */
export function StudentExamBriefPage() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState<AvailableExam | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    if (examId === undefined) {
      setError('That exam does not exist.');
      setState('error');
      return;
    }

    setState('loading');
    setError(null);

    try {
      // The list is the only student-readable view of a published exam, and it
      // is small, so it answers "is this exam still open to me" as well.
      const items = await listAvailableExams();
      const found = items.find((item) => item.id === examId);

      if (found === undefined) {
        setError('That exam is not available.');
        setState('error');
        return;
      }

      setExam(found);
      setState('ready');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'That exam could not be opened.');
      setState('error');
    }
  }, [examId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleStart() {
    if (exam === null) {
      return;
    }

    setStarting(true);
    setError(null);

    try {
      const attempt = await startAttempt({ examId: exam.id });
      navigate(`/student/attempts/${attempt.attemptId}`);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'The exam could not be started.');
      setStarting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/student/exams">
          <ArrowLeft aria-hidden="true" />
          All exams
        </Link>
      </Button>

      {state === 'loading' ? (
        <div className="py-10 text-center">
          <Spinner label="Loading exam" />
        </div>
      ) : null}

      {state === 'error' ? (
        <Alert tone="error" title="Exam unavailable">
          {error}
        </Alert>
      ) : null}

      {state === 'ready' && exam !== null ? (
        <>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{exam.title}</h1>
            <p className="text-muted-foreground text-sm">
              {exam.subject.name} ({exam.subject.code})
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Before you start</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <FileText aria-hidden="true" className="size-3.5" />
                    Questions
                  </dt>
                  <dd className="mt-1 text-sm font-medium">
                    {exam.questionCount} {exam.questionCount === 1 ? 'question' : 'questions'}
                  </dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <Clock aria-hidden="true" className="size-3.5" />
                    Time limit
                  </dt>
                  <dd className="mt-1 text-sm font-medium">{exam.durationMinutes} minutes</dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-muted-foreground text-xs">Total marks</dt>
                  <dd className="mt-1 text-sm font-medium">{exam.totalMarks}</dd>
                </div>
              </dl>

              {exam.instructions === null ? (
                <p className="text-muted-foreground text-sm">
                  Your lecturer has not added any extra instructions.
                </p>
              ) : (
                <div className="space-y-1.5">
                  <h2 className="text-sm font-medium">Instructions</h2>
                  <p className="text-sm whitespace-pre-line">{exam.instructions}</p>
                </div>
              )}

              <Alert tone="info">
                The timer starts the moment you press Start and runs for {exam.durationMinutes}{' '}
                minutes. You can leave and come back, but the clock keeps running.
              </Alert>

              {error === null ? null : <Alert tone="error">{error}</Alert>}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => void handleStart()}
                  disabled={starting || exam.questionCount === 0}
                >
                  {starting ? <Spinner label="Starting" /> : null}
                  {exam.attemptStatus === 'IN_PROGRESS' ? 'Resume exam' : 'Start attempt'}
                </Button>
                <Button asChild type="button" variant="ghost" disabled={starting}>
                  <Link to="/student/exams">Cancel</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
