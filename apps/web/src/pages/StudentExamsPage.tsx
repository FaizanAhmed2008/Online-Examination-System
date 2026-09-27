import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Clock, FileText } from 'lucide-react';
import type { AvailableExam } from '@oes/shared';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ApiError, listAvailableExams } from '@/lib/api-client';

type LoadState = 'loading' | 'ready' | 'error';

/**
 * Available exams (PRD §10, FR-16).
 *
 * The list is the student's entry point to an attempt, so each row says which of
 * the three states it is in — not started, in progress, or submitted — rather
 * than making the student guess from the wording of a button.
 */
export function StudentExamsPage() {
  const [items, setItems] = useState<AvailableExam[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    setError(null);

    try {
      setItems(await listAvailableExams());
      setState('ready');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Your exams could not be loaded.');
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Exams</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Published exams you can sit. Open one to read the instructions and start.
        </p>
      </div>

      {state === 'error' ? (
        <Alert tone="error" title="Could not load exams">
          {error}
          <div className="mt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        </Alert>
      ) : null}

      {state === 'loading' ? (
        <div className="py-10 text-center">
          <Spinner label="Loading exams" />
        </div>
      ) : null}

      {state === 'ready' && items.length === 0 ? (
        <Card>
          <CardContent className="space-y-2 py-10 text-center">
            <p className="font-medium">No exams available</p>
            <p className="text-sm text-muted-foreground">
              Nothing has been published for you yet. Check back once your lecturer publishes an
              exam.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {state === 'ready' && items.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {items.map((exam) => (
            <li key={exam.id}>
              <ExamRow exam={exam} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ExamRow({ exam }: { exam: AvailableExam }) {
  const started = exam.attemptStatus === 'IN_PROGRESS';
  const submitted = exam.attemptStatus === 'SUBMITTED';

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base">{exam.title}</CardTitle>
          <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span>
              {exam.subject.name} ({exam.subject.code})
            </span>
            <span className="inline-flex items-center gap-1">
              <FileText aria-hidden="true" className="size-3.5" />
              {exam.questionCount} {exam.questionCount === 1 ? 'question' : 'questions'} ·{' '}
              {exam.totalMarks} marks
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock aria-hidden="true" className="size-3.5" />
              {exam.durationMinutes} min
            </span>
          </p>
        </div>

        <Badge variant={submitted ? 'secondary' : started ? 'default' : 'outline'}>
          {submitted ? 'Submitted' : started ? 'In progress' : 'Not started'}
        </Badge>
      </CardHeader>

      <CardContent>
        {submitted ? (
          <p className="text-sm">
            {exam.score === null ? (
              'Your attempt has been submitted.'
            ) : (
              <>
                You scored{' '}
                <span className="font-medium">
                  {exam.score} of {exam.totalMarks}
                </span>
                .
              </>
            )}
          </p>
        ) : (
          <Button asChild size="sm" variant={started ? 'default' : 'outline'}>
            <Link to={`/student/exams/${exam.id}`}>{started ? 'Resume' : 'View details'}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
