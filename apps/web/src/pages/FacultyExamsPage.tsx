import { useCallback, useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import type {
  createExamRequestSchema,
  Exam,
  ExamStatus,
  ExamSummary,
  Question,
  Subject,
} from '@oes/shared';

import { ExamForm } from '@/components/exams/ExamForm';
import { ExamPaperPreview } from '@/components/exams/ExamPaperPreview';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
  ApiError,
  createExam,
  deleteExam,
  getExam,
  listExams,
  listQuestions,
  listSubjects,
  publishExam,
  unpublishExam,
  updateExam,
} from '@/lib/api-client';

const PAGE_SIZE = 20;
/** Enough to build a paper from without paging inside the picker. */
const BANK_PAGE_SIZE = 50;

type LoadState = 'loading' | 'ready' | 'error';

type StatusFilter = ExamStatus | 'ALL';

interface ExamListState {
  items: ExamSummary[];
  total: number;
  page: number;
}

const STATUS_LABEL: Record<ExamStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
};

/**
 * Faculty exam creation and publishing (PRD FR-14, FR-15).
 *
 * The list is the working surface: a draft can be edited, previewed, published
 * or deleted, and a published exam is read-only until it is unpublished. The
 * editor lives on the same screen so moving between the list and a draft does
 * not lose the lecturer's place.
 */
export function FacultyExamsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [state, setState] = useState<ExamListState>({ items: [], total: 0, page: 1 });
  const [listState, setListState] = useState<LoadState>('loading');
  const [listError, setListError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | undefined>(undefined);
  const [bank, setBank] = useState<Question[]>([]);
  const [preview, setPreview] = useState<Exam | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | undefined>(undefined);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Mirrors the question bank page: the loaders never set state before they
  // await, so the mount effects do not cascade a render.
  const loadSubjects = useCallback(async () => {
    try {
      setSubjects(await listSubjects());
    } catch {
      // A missing subject list surfaces through the disabled "New exam" button.
      setSubjects([]);
    }
  }, []);

  const loadExams = useCallback(async () => {
    try {
      const result = await listExams({
        page,
        pageSize: PAGE_SIZE,
        ...(status === 'ALL' ? {} : { status }),
      });

      setState({ items: result.items, total: result.total, page: result.page });
      setListState('ready');
    } catch (error) {
      setListError(error instanceof ApiError ? error.message : 'Your exams could not be loaded.');
      setListState('error');
    }
  }, [page, status]);

  useEffect(() => {
    void loadSubjects();
  }, [loadSubjects]);

  useEffect(() => {
    void loadExams();
  }, [loadExams]);

  const beginReload = (): void => {
    setListState('loading');
    setListError(null);
  };

  const totalPages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));

  const openEditor = async (exam?: ExamSummary): Promise<void> => {
    setActionError(null);
    setPreview(null);
    setSaving(true);

    try {
      // The list shape omits the paper, and the editor needs it in full.
      const full = exam === undefined ? undefined : await getExam(exam.id);
      const bankResult = await listQuestions({ page: 1, pageSize: BANK_PAGE_SIZE });

      setBank(bankResult.items);
      setEditing(full);
      setEditorOpen(true);
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'That exam could not be opened.');
    } finally {
      setSaving(false);
    }
  };

  const closeEditor = (): void => {
    setEditorOpen(false);
    setEditing(undefined);
  };

  const handleSubmit = async (
    input: ReturnType<typeof createExamRequestSchema.parse>,
  ): Promise<void> => {
    setSaving(true);
    setNotice(null);
    setActionError(null);

    try {
      if (editing === undefined) {
        const created = await createExam(input);
        setNotice(`Draft "${created.title}" created. Publish it when the paper is ready.`);
      } else {
        await updateExam(editing.id, input);
        setNotice('Exam updated.');
      }

      closeEditor();
      await loadExams();
    } finally {
      setSaving(false);
      // Re-thrown so ExamForm can map field-level details onto the fields.
    }
  };

  const handlePublish = async (exam: ExamSummary): Promise<void> => {
    setBusyId(exam.id);
    setNotice(null);
    setActionError(null);

    try {
      await publishExam(exam.id);
      setNotice(`"${exam.title}" is published.`);
      await loadExams();
    } catch (error) {
      setActionError(
        error instanceof ApiError ? error.message : 'The exam could not be published.',
      );
    } finally {
      setBusyId(undefined);
    }
  };

  const handleUnpublish = async (exam: ExamSummary): Promise<void> => {
    setBusyId(exam.id);
    setNotice(null);
    setActionError(null);

    try {
      await unpublishExam(exam.id);
      setNotice(`"${exam.title}" is back to draft.`);
      await loadExams();
    } catch (error) {
      setActionError(
        error instanceof ApiError ? error.message : 'The exam could not be unpublished.',
      );
    } finally {
      setBusyId(undefined);
    }
  };

  const handleDelete = async (exam: ExamSummary): Promise<void> => {
    setBusyId(exam.id);
    setNotice(null);
    setActionError(null);

    try {
      await deleteExam(exam.id);
      setNotice(`"${exam.title}" deleted.`);
      await loadExams();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'The exam could not be deleted.');
    } finally {
      setBusyId(undefined);
    }
  };

  const handlePreview = async (exam: ExamSummary): Promise<void> => {
    setActionError(null);
    setEditorOpen(false);
    setEditing(undefined);
    setBusyId(exam.id);

    try {
      setPreview(await getExam(exam.id));
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'The exam could not be opened.');
    } finally {
      setBusyId(undefined);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Exams</h1>
          <p className="text-muted-foreground text-sm">
            Build a paper from your question bank, then publish it for your students.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => {
            setPreview(null);
            void openEditor();
          }}
          disabled={subjects.length === 0}
        >
          New exam
        </Button>
      </div>

      {notice === null ? null : <Alert tone="success">{notice}</Alert>}

      {actionError === null ? null : <Alert tone="error">{actionError}</Alert>}

      {subjects.length === 0 ? (
        <Alert tone="info" title="Subjects unavailable">
          Subjects are managed by an administrator. Ask one to create a subject before building an
          exam.
        </Alert>
      ) : null}

      {editorOpen ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editing === undefined ? 'New exam' : 'Edit exam'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ExamForm
              subjects={subjects}
              availableQuestions={bank}
              {...(editing === undefined ? {} : { exam: editing })}
              onSubmit={handleSubmit}
              onCancel={closeEditor}
              submitting={saving}
            />
          </CardContent>
        </Card>
      ) : null}

      {preview === null ? null : (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
            <CardTitle className="text-base">Paper preview</CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPreview(null)}>
              Close
            </Button>
          </CardHeader>
          <CardContent>
            <ExamPaperPreview exam={preview} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1.5">
              <label htmlFor="exam-status-filter" className="text-sm leading-none font-medium">
                Status
              </label>
              <Select
                id="exam-status-filter"
                value={status}
                onChange={(event) => {
                  beginReload();
                  setPage(1);
                  setStatus(event.target.value as StatusFilter);
                }}
                className="w-40"
              >
                <option value="ALL">All exams</option>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {listState === 'loading' ? (
        <div className="py-10 text-center">
          <Spinner label="Loading exams" />
        </div>
      ) : null}

      {listState === 'error' ? (
        <Alert tone="error" title="Could not load exams">
          {listError}
          <div className="mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                beginReload();
                void loadExams();
              }}
            >
              Try again
            </Button>
          </div>
        </Alert>
      ) : null}

      {listState === 'ready' && state.items.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <p className="font-medium">
              {status === 'ALL' ? 'No exams yet' : `No ${status.toLowerCase()} exams`}
            </p>
            <p className="text-muted-foreground text-sm">
              {status === 'ALL'
                ? 'Create your first exam, choose questions from your bank, and publish it when it is ready.'
                : 'Try a different status filter.'}
            </p>
            {status === 'ALL' ? (
              <Button
                type="button"
                disabled={subjects.length === 0}
                onClick={() => {
                  setPreview(null);
                  void openEditor();
                }}
              >
                New exam
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {listState === 'ready' && state.items.length > 0 ? (
        <>
          <ul className="flex flex-col gap-3">
            {state.items.map((exam) => (
              <li key={exam.id}>
                <Card>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-medium">{exam.title}</h2>
                          <Badge variant={exam.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                            {STATUS_LABEL[exam.status]}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">
                          {exam.subject.name} ({exam.subject.code}) · {exam.questionCount}{' '}
                          {exam.questionCount === 1 ? 'question' : 'questions'} · {exam.totalMarks}{' '}
                          marks · {exam.durationMinutes} min
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busyId === exam.id}
                        onClick={() => void handlePreview(exam)}
                      >
                        <Eye aria-hidden="true" />
                        Preview
                      </Button>

                      {exam.status === 'DRAFT' ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busyId === exam.id}
                            onClick={() => void openEditor(exam)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={busyId === exam.id || exam.questionCount === 0}
                            onClick={() => void handlePublish(exam)}
                          >
                            Publish
                          </Button>
                          <ConfirmButton
                            confirmLabel="Confirm delete"
                            onConfirm={() => handleDelete(exam)}
                            disabled={busyId === exam.id}
                          >
                            Delete
                          </ConfirmButton>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busyId === exam.id}
                          onClick={() => void handleUnpublish(exam)}
                        >
                          Unpublish
                        </Button>
                      )}
                    </div>

                    {exam.status === 'DRAFT' && exam.questionCount === 0 ? (
                      <p className="text-muted-foreground text-xs">
                        Add at least one question before this exam can be published.
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  beginReload();
                  setPage(Math.max(1, state.page - 1));
                }}
                disabled={state.page <= 1}
              >
                Previous
              </Button>
              <p className="text-muted-foreground text-sm">
                Page {state.page} of {totalPages} · {state.total} exams
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  beginReload();
                  setPage(Math.min(totalPages, state.page + 1));
                }}
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
