import { useState } from 'react';
import { ArrowLeft, Check, Plus, Send } from 'lucide-react';

import type { Route } from './App';
import type { Exam, Question } from './data';
import { FACULTY_NAME, SUBJECTS, SUBJECT_NAME } from './data';
import { examMarks, nextId, type Store } from './store';
import { Badge, Button, Card, CardBody, Notice, Page, Stat, cx, inputClass } from './ui';

type Go = (route: Route) => void;

function subjectLabel(code: string): string {
  const name = SUBJECT_NAME.get(code);
  return name === undefined ? code : `${name} (${code})`;
}

/* -------------------------------------------------------------------------- */
/* Overview                                                                    */
/* -------------------------------------------------------------------------- */

export function FacultyHome({ store, go }: { store: Store; go: Go }) {
  const { state } = store;
  const first = FACULTY_NAME.split(' ')[0] ?? FACULTY_NAME;
  const published = state.exams.filter((exam) => exam.status === 'PUBLISHED');

  return (
    <Page
      title={`Welcome, ${first}`}
      subtitle="Author a paper, publish it, and watch the attempt results come in."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Questions in bank" value={state.questions.length} />
        <Stat label="Exam papers" value={state.exams.length} />
        <Stat label="Published" value={published.length} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardBody className="space-y-3">
            <h2 className="font-semibold">Question bank</h2>
            <p className="text-sm text-slate-600">
              {state.questions.length} multiple-choice questions across {SUBJECTS.length} subjects,
              each with an explanation shown to the student after they submit.
            </p>
            <ul className="space-y-1 text-sm text-slate-600">
              {SUBJECTS.map((subject) => (
                <li key={subject.code} className="flex justify-between gap-4">
                  <span>{subjectLabel(subject.code)}</span>
                  <span className="tabular-nums">
                    {state.questions.filter((q) => q.subject === subject.code).length}
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <h2 className="font-semibold">Papers</h2>
            <ul className="space-y-2">
              {state.exams.map((exam) => (
                <li key={exam.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm">{exam.title}</span>
                  <ExamBadge exam={exam} />
                </li>
              ))}
            </ul>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                go({ name: 'exams' });
              }}
            >
              Manage papers
            </Button>
          </CardBody>
        </Card>
      </div>

      <AddQuestionForm store={store} />

      <Notice>
        This is the demo build: the question bank and papers live in this browser tab only.
        Refreshing keeps them, and <strong>Reset</strong> in the header puts the seeded demo back.
      </Notice>
    </Page>
  );
}

function ExamBadge({ exam }: { exam: Exam }) {
  return exam.status === 'PUBLISHED' ? (
    <Badge tone="green">Published</Badge>
  ) : (
    <Badge tone="amber">Draft</Badge>
  );
}

/* -------------------------------------------------------------------------- */
/* Paper list                                                                  */
/* -------------------------------------------------------------------------- */

export function FacultyExamList({ store, go }: { store: Store; go: Go }) {
  const { state } = store;

  return (
    <Page
      title="Exam papers"
      subtitle="Build a paper from the question bank, then publish it for students."
    >
      <Button
        onClick={() => {
          go({ name: 'exam-editor', examId: null });
        }}
      >
        <Plus aria-hidden="true" className="size-4" />
        New paper
      </Button>

      <ul className="grid gap-3">
        {state.exams.map((exam) => (
          <li key={exam.id}>
            <Card>
              <CardBody className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">{exam.title}</h2>
                    <ExamBadge exam={exam} />
                  </div>
                  <p className="text-sm text-slate-600">
                    {subjectLabel(exam.subject)} · {exam.questionIds.length} questions ·{' '}
                    {examMarks(exam, state.questions)} marks · {exam.durationMinutes} min
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      go({ name: 'exam-attempts', examId: exam.id });
                    }}
                  >
                    Results
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      go({ name: 'exam-editor', examId: exam.id });
                    }}
                  >
                    Edit
                  </Button>
                </div>
              </CardBody>
            </Card>
          </li>
        ))}
      </ul>
    </Page>
  );
}

/* -------------------------------------------------------------------------- */
/* Paper editor                                                                */
/* -------------------------------------------------------------------------- */

/** A draft being written, kept separately until it is saved. */
interface Draft {
  title: string;
  subject: string;
  instructions: string;
  durationMinutes: number;
  questionIds: string[];
}

export function FacultyExamEditor({
  examId,
  store,
  go,
}: {
  examId: string | null;
  store: Store;
  go: Go;
}) {
  const { state, setState } = store;
  const existing = examId === null ? undefined : state.exams.find((exam) => exam.id === examId);

  const [draft, setDraft] = useState<Draft>(
    existing ?? {
      title: '',
      subject: SUBJECTS[0].code,
      instructions: '',
      durationMinutes: 15,
      questionIds: [],
    },
  );
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState(existing?.subject ?? SUBJECTS[0].code);

  const pool = state.questions.filter((question) => question.subject === filter);
  const chosen = new Set(draft.questionIds);

  function toggle(questionId: string) {
    setDraft((current) => ({
      ...current,
      questionIds: chosen.has(questionId)
        ? current.questionIds.filter((id) => id !== questionId)
        : [...current.questionIds, questionId],
    }));
  }

  function save(publish: boolean) {
    const title = draft.title.trim();

    if (title.length === 0) {
      setError('Give the paper a title.');
      return;
    }

    if (draft.questionIds.length === 0) {
      setError('Add at least one question.');
      return;
    }

    const exam: Exam = {
      id: existing?.id ?? nextId('exam'),
      title,
      subject: draft.subject,
      instructions:
        draft.instructions.trim() ||
        'Answer every question. Your answer saves as soon as you choose it.',
      durationMinutes: Math.max(1, draft.durationMinutes),
      status: publish ? 'PUBLISHED' : 'DRAFT',
      questionIds: draft.questionIds,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };

    setState((current) => ({
      ...current,
      exams:
        existing === undefined
          ? [...current.exams, exam]
          : current.exams.map((candidate) => (candidate.id === exam.id ? exam : candidate)),
    }));

    go({ name: 'exams' });
  }

  function togglePublished() {
    if (existing === undefined) {
      return;
    }

    const published = existing.status === 'PUBLISHED';

    setState((current) => ({
      ...current,
      exams: current.exams.map((exam) =>
        exam.id === existing.id ? { ...exam, status: published ? 'DRAFT' : 'PUBLISHED' } : exam,
      ),
    }));
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => {
          go({ name: 'exams' });
        }}
        className="-ml-2 inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        All papers
      </button>

      <Page
        title={existing === undefined ? 'New paper' : `Edit: ${existing.title}`}
        subtitle="Pick questions in the order they should appear on the paper."
      >
        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <Card>
            <CardBody className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Title</span>
                <input
                  className={inputClass}
                  value={draft.title}
                  placeholder="Operating Systems Mid-term"
                  onChange={(event) => {
                    setDraft((current) => ({ ...current, title: event.target.value }));
                  }}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Instructions for students</span>
                <textarea
                  className={cx(inputClass, 'h-24 resize-y')}
                  value={draft.instructions}
                  placeholder="Answer every question. The paper is 15 minutes…"
                  onChange={(event) => {
                    setDraft((current) => ({ ...current, instructions: event.target.value }));
                  }}
                />
              </label>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-medium">Subject</span>
                  <select
                    className={cx(inputClass, 'w-auto')}
                    value={draft.subject}
                    onChange={(event) => {
                      const code = event.target.value;
                      setFilter(code);
                      setDraft((current) => ({ ...current, subject: code }));
                    }}
                  >
                    {SUBJECTS.map((subject) => (
                      <option key={subject.code} value={subject.code}>
                        {subjectLabel(subject.code)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Time limit (minutes)</span>
                <input
                  type="number"
                  min={1}
                  max={180}
                  className={inputClass}
                  value={draft.durationMinutes}
                  onChange={(event) => {
                    setDraft((current) => ({
                      ...current,
                      durationMinutes: Number(event.target.value),
                    }));
                  }}
                />
              </label>

              <dl className="space-y-1 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Questions</dt>
                  <dd className="tabular-nums">{draft.questionIds.length}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Total marks</dt>
                  <dd className="tabular-nums">
                    {draft.questionIds.reduce((total, id) => {
                      return total + (state.questions.find((q) => q.id === id)?.marks ?? 0);
                    }, 0)}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardBody className="space-y-3">
            <h2 className="font-semibold">Questions</h2>
            <ul className="space-y-2">
              {pool.map((question) => {
                const isChosen = chosen.has(question.id);

                return (
                  <li key={question.id}>
                    <button
                      type="button"
                      aria-pressed={isChosen}
                      onClick={() => {
                        toggle(question.id);
                      }}
                      className={cx(
                        'flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors',
                        isChosen
                          ? 'border-slate-900 bg-slate-100'
                          : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50',
                      )}
                    >
                      <span
                        className={cx(
                          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border',
                          isChosen
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300',
                        )}
                      >
                        {isChosen ? <Check aria-hidden="true" className="size-3.5" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block">{question.text}</span>
                        <span className="mt-0.5 block text-xs text-slate-600">
                          {question.marks} marks
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>

        {error === null ? null : <Notice tone="red">{error}</Notice>}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              save(true);
            }}
          >
            <Send aria-hidden="true" className="size-4" />
            {existing?.status === 'PUBLISHED' ? 'Save and keep published' : 'Save and publish'}
          </Button>
          <Button variant="secondary" onClick={() => save(false)}>
            Save as draft
          </Button>
          {existing === undefined ? null : (
            <Button variant="ghost" onClick={togglePublished}>
              {existing.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
            </Button>
          )}
        </div>
      </Page>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Results                                                                     */
/* -------------------------------------------------------------------------- */

export function FacultyResults({ examId, store, go }: { examId: string; store: Store; go: Go }) {
  const { state } = store;

  if (examId === '') {
    return (
      <Page title="Results" subtitle="Choose a paper to see how students did.">
        <ul className="grid gap-2">
          {state.exams.map((exam) => (
            <li key={exam.id}>
              <button
                type="button"
                onClick={() => {
                  go({ name: 'exam-attempts', examId: exam.id });
                }}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm hover:border-slate-400"
              >
                <span className="min-w-0 truncate">{exam.title}</span>
                <ExamBadge exam={exam} />
              </button>
            </li>
          ))}
        </ul>
      </Page>
    );
  }

  const exam = state.exams.find((candidate) => candidate.id === examId);

  if (exam === undefined) {
    return (
      <Page title="Paper not found">
        <Notice tone="red">That paper no longer exists.</Notice>
      </Page>
    );
  }

  const attempts = state.attempts.filter(
    (attempt) => attempt.examId === exam.id && attempt.submittedAt !== null,
  );
  const total = examMarks(exam, state.questions);

  return (
    <Page
      title={`Results: ${exam.title}`}
      subtitle={`${attempts.length} submitted attempt${attempts.length === 1 ? '' : 's'} · ${total} marks available`}
    >
      {attempts.length === 0 ? (
        <Notice>
          No attempts submitted yet. Switch to the Student role, sit this paper, and the result will
          be here.
        </Notice>
      ) : (
        <Card>
          <CardBody>
            <ul className="divide-y divide-slate-200">
              {attempts.map((attempt) => {
                const percent = total === 0 ? 0 : Math.round(((attempt.score ?? 0) / total) * 100);

                return (
                  <li
                    key={attempt.id}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Aisha Khan</p>
                      <p className="text-xs text-slate-500">
                        {attempt.submittedAt === null
                          ? '—'
                          : new Date(attempt.submittedAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm tabular-nums">
                      <span className="font-semibold">{attempt.score}</span> / {total}
                      <span className="ml-2 text-slate-600">{percent}%</span>
                    </p>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      )}
    </Page>
  );
}

/* -------------------------------------------------------------------------- */
/* Adding a question (kept for completeness of the faculty story)             */
/* -------------------------------------------------------------------------- */

export function AddQuestionForm({ store }: { store: Store }) {
  const { setState } = store;
  const [text, setText] = useState('');
  const [subject, setSubject] = useState<string>(SUBJECTS[0].code);
  const [choices, setChoices] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState(0);

  function add() {
    const options = choices
      .map((choice, index) => ({ choice: choice.trim(), index }))
      .filter((entry) => entry.choice.length > 0);

    if (text.trim().length === 0 || options.length < 2) {
      return;
    }

    const question: Question = {
      id: nextId('q'),
      subject,
      text: text.trim(),
      marks: 2,
      explanation: 'Added from the demo form — no explanation was given.',
      options: options.map((entry, position) => ({
        id: `${position}`,
        text: entry.choice,
        isCorrect: options[correct]?.index === entry.index,
      })),
    };

    setState((current) => ({ ...current, questions: [...current.questions, question] }));
    setText('');
    setChoices(['', '', '', '']);
    setCorrect(0);
  }

  return (
    <Card>
      <CardBody className="space-y-3">
        <h2 className="font-semibold">Add a question</h2>
        <input
          className={inputClass}
          placeholder="Question text"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {choices.map((choice, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct-option"
                aria-label={`Mark option ${index + 1} as correct`}
                checked={correct === index}
                onChange={() => {
                  setCorrect(index);
                }}
              />
              <input
                className={inputClass}
                placeholder={`Option ${index + 1}`}
                value={choice}
                onChange={(event) => {
                  setChoices((current) =>
                    current.map((entry, position) =>
                      position === index ? event.target.value : entry,
                    ),
                  );
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            className={cx(inputClass, 'w-auto')}
            value={subject}
            onChange={(event) => {
              setSubject(event.target.value);
            }}
          >
            {SUBJECTS.map((candidate) => (
              <option key={candidate.code} value={candidate.code}>
                {subjectLabel(candidate.code)}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={add}>
            <Plus aria-hidden="true" className="size-4" />
            Add to bank
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
