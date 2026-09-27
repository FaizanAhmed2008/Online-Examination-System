import { useCallback, useEffect, useMemo, useState } from 'react';
import type { createQuestionRequestSchema, Question, Subject } from '@oes/shared';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { QuestionForm } from '@/components/questions/QuestionForm';
import { QuestionList } from '@/components/questions/QuestionList';
import {
  ApiError,
  archiveQuestion,
  createQuestion,
  listQuestions,
  listSubjects,
  updateQuestion,
} from '@/lib/api-client';

const PAGE_SIZE = 20;

type LoadState = 'loading' | 'ready' | 'error';

interface QuestionBankState {
  questions: Question[];
  total: number;
  page: number;
}

/**
 * Faculty question bank (PRD FR-13).
 *
 * Reads only the signed-in lecturer's own questions. Subjects come from the
 * admin-managed list and are read-only here.
 */
export function FacultyQuestionBankPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsState, setSubjectsState] = useState<LoadState>('loading');
  const [state, setState] = useState<QuestionBankState>({ questions: [], total: 0, page: 1 });
  const [listState, setListState] = useState<LoadState>('loading');
  const [listError, setListError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [page, setPage] = useState(1);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Question | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | undefined>(undefined);

  const [actionError, setActionError] = useState<string | null>(null);

  const loadSubjects = useCallback(async () => {
    try {
      setSubjects(await listSubjects());
      setSubjectsState('ready');
    } catch {
      setSubjectsState('error');
    }
  }, []);

  // `submitted` distinguishes "no filter" from "a filter that matched nothing",
  // which is what makes the empty state honest.
  const [submitted, setSubmitted] = useState({ q: '', subjectId: '' });

  // Neither loader sets state before it awaits: the mount effects below start from
  // an initial `loading` value, and a user-triggered reload sets `loading` in the
  // handler that caused it. Setting it here would cascade a render on mount.
  const loadQuestions = useCallback(async () => {
    try {
      const result = await listQuestions({
        page,
        pageSize: PAGE_SIZE,
        ...(submitted.q.length === 0 ? {} : { q: submitted.q }),
        ...(submitted.subjectId.length === 0 ? {} : { subjectId: submitted.subjectId }),
      });

      setState({ questions: result.items, total: result.total, page: result.page });
      setListState('ready');
    } catch (error) {
      setListError(
        error instanceof ApiError ? error.message : 'The question bank could not be loaded.',
      );
      setListState('error');
    }
  }, [page, submitted]);

  useEffect(() => {
    void loadSubjects();
  }, [loadSubjects]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  /** Marks the list as loading again before a reload the user asked for. */
  const beginReload = (): void => {
    setListState('loading');
    setListError(null);
  };

  const applyFilter = (q: string, subjectId: string): void => {
    beginReload();
    setPage(1);
    setSubmitted({ q, subjectId });
  };

  const goToPage = (next: number): void => {
    beginReload();
    setPage(next);
  };

  const totalPages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
  const filtersActive = submitted.q.length > 0 || submitted.subjectId.length > 0;

  const heading = useMemo(
    () => (editing === undefined ? 'New question' : 'Edit question'),
    [editing],
  );

  const handleSubmit = async (
    input: ReturnType<typeof createQuestionRequestSchema.parse>,
  ): Promise<void> => {
    setSaving(true);
    setNotice(null);
    setActionError(null);

    try {
      if (editing === undefined) {
        await createQuestion(input);
        setNotice('Question created.');
      } else {
        await updateQuestion(editing.id, input);
        setNotice('Question updated.');
      }

      setEditorOpen(false);
      setEditing(undefined);
      await loadQuestions();
    } finally {
      setSaving(false);
      // Re-thrown so QuestionForm can map field-level details onto the fields.
    }
  };

  const handleDelete = async (question: Question): Promise<void> => {
    setBusyId(question.id);
    setNotice(null);
    setActionError(null);

    try {
      await archiveQuestion(question.id);
      setNotice('Question deleted.');
      await loadQuestions();
    } catch (error) {
      setActionError(
        error instanceof ApiError ? error.message : 'The question could not be deleted.',
      );
    } finally {
      setBusyId(undefined);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Question bank</h1>
          <p className="text-muted-foreground text-sm">
            Your single-choice questions. Only you can see or change them.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => {
            setEditing(undefined);
            setEditorOpen((open) => !open);
          }}
          disabled={subjects.length === 0}
        >
          {editorOpen && editing === undefined ? 'Close' : 'New question'}
        </Button>
      </div>

      {notice === null ? null : <Alert tone="success">{notice}</Alert>}

      {actionError === null ? null : <Alert tone="error">{actionError}</Alert>}

      {/* Shown whether the list failed to load or came back empty: either way a
          question cannot be created, and the disabled button needs a reason. */}
      {subjectsState === 'error' || (subjectsState === 'ready' && subjects.length === 0) ? (
        <Alert tone="info" title="Subjects unavailable">
          Subjects are managed by an administrator. Ask one to create a subject before adding
          questions.
        </Alert>
      ) : null}

      {subjectsState === 'loading' ? <Spinner label="Loading subjects" /> : null}

      {editorOpen ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{heading}</CardTitle>
          </CardHeader>
          <CardContent>
            <QuestionForm
              subjects={subjects}
              {...(editing === undefined ? {} : { question: editing })}
              onSubmit={handleSubmit}
              onCancel={() => {
                setEditorOpen(false);
                setEditing(undefined);
              }}
              submitting={saving}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="space-y-4">
          <form
            className="grid gap-3 sm:grid-cols-[1fr_auto_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              applyFilter(search.trim(), subjectFilter);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="question-search">Search</Label>
              <Input
                id="question-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search question text"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="question-subject">Subject</Label>
              <Select
                id="question-subject"
                value={subjectFilter}
                onChange={(event) => setSubjectFilter(event.target.value)}
              >
                <option value="">All subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button type="submit" variant="secondary">
                Filter
              </Button>
              {filtersActive ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSearch('');
                    setSubjectFilter('');
                    applyFilter('', '');
                  }}
                >
                  Clear
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      {listState === 'loading' ? (
        <div className="py-10 text-center">
          <Spinner label="Loading questions" />
        </div>
      ) : null}

      {listState === 'error' ? (
        <Alert tone="error" title="Could not load questions">
          {listError}
          <div className="mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                beginReload();
                void loadQuestions();
              }}
            >
              Try again
            </Button>
          </div>
        </Alert>
      ) : null}

      {listState === 'ready' && state.questions.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <p className="font-medium">
              {filtersActive ? 'No questions match your filters' : 'No questions yet'}
            </p>
            <p className="text-muted-foreground text-sm">
              {filtersActive
                ? 'Try a different search term or subject.'
                : 'Add your first single-choice question to start building your bank.'}
            </p>
            {filtersActive ? null : (
              <Button
                type="button"
                disabled={subjects.length === 0}
                onClick={() => {
                  setEditing(undefined);
                  setEditorOpen(true);
                }}
              >
                New question
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}

      {listState === 'ready' && state.questions.length > 0 ? (
        <>
          <QuestionList
            questions={state.questions}
            onEdit={(question) => {
              setEditing(question);
              setEditorOpen(true);
            }}
            onDelete={handleDelete}
            busyId={busyId}
          />

          {totalPages > 1 ? (
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => goToPage(Math.max(1, state.page - 1))}
                disabled={state.page <= 1}
              >
                Previous
              </Button>
              <p className="text-muted-foreground text-sm">
                Page {state.page} of {totalPages} · {state.total} questions
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => goToPage(Math.min(totalPages, state.page + 1))}
                disabled={state.page >= totalPages}
              >
                Next
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
