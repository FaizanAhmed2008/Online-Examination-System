import { useState } from 'react';
import { ArrowLeft, Check, Plus, Send, UserPlus } from 'lucide-react';

import type { Route } from './App';
import type { Attempt, Exam, Question, State, User } from './data';
import { SUBJECTS, subjectLabel, totalMarks } from './data';
import { MIN_PASSWORD_LENGTH, createUser, ownExams, paperQuestions, type Store } from './store';
import { Badge, Button, Card, CardBody, Field, Notice, Page, Stat, cx, inputClass } from './ui';

type Go = (route: Route) => void;

/** Questions a lecturer can pick from: everything in the bank for their subject. */
function poolFor(questions: Question[], subject: string): Question[] {
  return questions.filter((question) => question.subject === subject);
}

/* -------------------------------------------------------------------------- */
/* Overview                                                                    */
/* -------------------------------------------------------------------------- */

export function FacultyHome({ account, store, go }: { account: User; store: Store; go: Go }) {
  const { state } = store;
  const papers = ownExams(state, account.id);
  const published = papers.filter((exam) => exam.status === 'PUBLISHED');
  const firstName = account.name.split(' ').slice(-1)[0] ?? account.name;

  return (
    <Page
      title={`Welcome, ${firstName}`}
      subtitle="Author a paper, publish it, and follow the results as they come in."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Questions in bank" value={state.questions.length} />
        <Stat label="Your papers" value={papers.length} />
        <Stat label="Published" value={published.length} />
      </div>

      <Card>
        <CardBody className="space-y-3">
          <h2 className="font-semibold">Your papers</h2>
          {papers.length === 0 ? (
            <p className="text-sm text-slate-600">
              You have not created a paper yet.{' '}
              <button
                type="button"
                className="font-medium underline"
                onClick={() => {
                  go({ name: 'exam-editor', examId: null });
                }}
              >
                Create the first one
              </button>
              .
            </p>
          ) : (
            <ul className="space-y-2">
              {papers.map((exam) => (
                <li key={exam.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm">{exam.title}</span>
                  <ExamBadge exam={exam} />
                </li>
              ))}
            </ul>
          )}
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

      <AddQuestionForm store={store} />
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

export function FacultyExamList({ account, store, go }: { account: User; store: Store; go: Go }) {
  const { state } = store;
  const papers = ownExams(state, account.id);

  return (
    <Page title="Exam papers" subtitle="Build a paper from the question bank, then publish it.">
      <Button
        onClick={() => {
          go({ name: 'exam-editor', examId: null });
        }}
      >
        <Plus aria-hidden="true" className="size-4" />
        New paper
      </Button>

      {papers.length === 0 ? (
        <Notice>You have no papers yet.</Notice>
      ) : (
        <ul className="grid gap-3">
          {papers.map((exam) => (
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
                      {totalMarks(exam, state.questions)} marks · {exam.durationMinutes} min
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
      )}
    </Page>
  );
}

/* -------------------------------------------------------------------------- */
/* Paper editor                                                                */
/* -------------------------------------------------------------------------- */

/** A paper being written, held until it is saved. */
interface Draft {
  title: string;
  subject: string;
  instructions: string;
  durationMinutes: number;
  questionIds: string[];
}

export function FacultyExamEditor({
  account,
  examId,
  store,
  go,
}: {
  account: User;
  examId: string | null;
  store: Store;
  go: Go;
}) {
  const { state, setState } = store;
  const existing =
    examId === null
      ? undefined
      : state.exams.find((exam) => exam.id === examId && exam.createdById === account.id);

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
  const [filter, setFilter] = useState<string>(existing?.subject ?? SUBJECTS[0].code);

  const pool = poolFor(state.questions, filter);
  const chosen = new Set(draft.questionIds);

  const toggle = (questionId: string) => {
    setDraft((current) => ({
      ...current,
      questionIds: chosen.has(questionId)
        ? current.questionIds.filter((id) => id !== questionId)
        : [...current.questionIds, questionId],
    }));
  };

  const save = (publish: boolean) => {
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
      id: existing?.id ?? nextPaperId(),
      title,
      subject: draft.subject,
      instructions:
        draft.instructions.trim() ||
        'Answer every question. Your answer saves as soon as you choose it.',
      durationMinutes: Math.max(1, draft.durationMinutes),
      status: publish ? 'PUBLISHED' : 'DRAFT',
      createdById: existing?.createdById ?? account.id,
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
  };

  const togglePublished = () => {
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
  };

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
              <Field label="Title">
                <input
                  className={inputClass}
                  value={draft.title}
                  placeholder="Operating Systems Mid-term"
                  onChange={(event) => {
                    setDraft((current) => ({ ...current, title: event.target.value }));
                  }}
                />
              </Field>

              <Field label="Instructions for students">
                <textarea
                  className={cx(inputClass, 'h-24 resize-y')}
                  value={draft.instructions}
                  placeholder="Answer every question. The paper is 15 minutes…"
                  onChange={(event) => {
                    setDraft((current) => ({ ...current, instructions: event.target.value }));
                  }}
                />
              </Field>

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
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-3">
              <Field label="Time limit (minutes)">
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
              </Field>

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
            <h2 className="font-semibold">Questions in {subjectLabel(filter)}</h2>
            {pool.length === 0 ? (
              <Notice>No questions in this subject yet. Add some from the overview.</Notice>
            ) : (
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
            )}
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

function nextPaperId(): string {
  return `exam-${Date.now().toString(36)}`;
}

/* -------------------------------------------------------------------------- */
/* Results                                                                     */
/* -------------------------------------------------------------------------- */

export function FacultyResults({
  account,
  examId,
  store,
  go,
}: {
  account: User;
  examId: string;
  store: Store;
  go: Go;
}) {
  const { state } = store;
  const papers = ownExams(state, account.id);

  if (examId === '') {
    return (
      <Page title="Results" subtitle="Choose a paper to see how students did.">
        {papers.length === 0 ? (
          <Notice>You have no papers yet.</Notice>
        ) : (
          <ul className="grid gap-2">
            {papers.map((exam) => (
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
        )}
      </Page>
    );
  }

  const exam = papers.find((candidate) => candidate.id === examId);

  if (exam === undefined) {
    return (
      <Page title="Paper not found">
        <Notice tone="red">That paper does not exist, or it belongs to another lecturer.</Notice>
      </Page>
    );
  }

  const attempts = state.attempts.filter(
    (candidate) => candidate.examId === exam.id && candidate.submittedAt !== null,
  );
  const marks = totalMarks(exam, state.questions);

  return (
    <Page
      title={`Results: ${exam.title}`}
      subtitle={`${attempts.length} submitted attempt${attempts.length === 1 ? '' : 's'} · ${marks} marks available`}
    >
      {attempts.length === 0 ? (
        <Notice>
          No attempts submitted yet. Once a student sits this paper and submits, the result appears
          here.
        </Notice>
      ) : (
        <Card>
          <CardBody>
            <ul className="divide-y divide-slate-200">
              {attempts.map((attempt) => (
                <AttemptRow key={attempt.id} attempt={attempt} state={state} marks={marks} />
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </Page>
  );
}

function AttemptRow({ attempt, state, marks }: { attempt: Attempt; state: State; marks: number }) {
  const student = state.users.find((user) => user.id === attempt.studentId);
  const percent = marks === 0 ? 0 : Math.round(((attempt.score ?? 0) / marks) * 100);
  const exam = state.exams.find((candidate) => candidate.id === attempt.examId);
  const answered =
    exam === undefined
      ? 0
      : paperQuestions(exam, state.questions).filter(
          (question) => attempt.answers[question.id] !== null,
        ).length;

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{student?.name ?? 'Unknown student'}</p>
        <p className="text-xs text-slate-500">
          {student?.email} · {answered} answered ·{' '}
          {attempt.submittedAt === null ? '—' : new Date(attempt.submittedAt).toLocaleString()}
        </p>
      </div>
      <p className="text-sm tabular-nums">
        <span className="font-semibold">{attempt.score}</span> / {marks}
        <span className="ml-2 text-slate-600">{percent}%</span>
      </p>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Student accounts                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Student accounts (FR-02). A lecturer can register a student here and hand over
 * the email and password, which is the normal route when a cohort is set up
 * before students can use the self-service sign-up.
 */
export function FacultyStudents({ store }: { store: Store }) {
  const { state, setState } = store;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const students = state.users.filter((user) => user.role === 'STUDENT');

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const outcome = createUser(state, { name, email, password, role: 'STUDENT' });

    if (!outcome.ok) {
      setError(outcome.error);
      return;
    }

    setState((current) => ({ ...current, users: [...current.users, outcome.user] }));
    setName('');
    setEmail('');
    setPassword('');
  }

  return (
    <Page
      title="Students"
      subtitle="Register a student account, or create one yourself from the sign-in screen."
    >
      <Card>
        <CardBody className="space-y-3">
          <h2 className="font-semibold">Add a student</h2>

          <form className="grid gap-3 sm:grid-cols-3" onSubmit={submit}>
            <Field label="Full name">
              <input
                className={inputClass}
                placeholder="Yaa Mensah"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                }}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                className={inputClass}
                placeholder="y.mensah@oes.edu"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                }}
              />
            </Field>
            <Field label="Password" hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
              <input
                className={inputClass}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
              />
            </Field>

            <div className="sm:col-span-3">
              <Button type="submit">
                <UserPlus aria-hidden="true" className="size-4" />
                Add student
              </Button>
            </div>
          </form>

          {error === null ? null : <Notice tone="red">{error}</Notice>}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold">
            Registered students{' '}
            <span className="font-normal text-slate-500">({students.length})</span>
          </h2>

          <ul className="mt-3 divide-y divide-slate-200">
            {students.map((student) => (
              <li
                key={student.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{student.name}</p>
                  <p className="text-xs text-slate-500">{student.email}</p>
                </div>
                <ProgressFor studentId={student.id} store={store} />
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </Page>
  );
}

/** How many published papers a student has completed. */
function ProgressFor({ studentId, store }: { studentId: string; store: Store }) {
  const { state } = store;
  const published = state.exams.filter((exam) => exam.status === 'PUBLISHED');
  const submitted = state.attempts.filter(
    (attempt) =>
      attempt.studentId === studentId &&
      attempt.submittedAt !== null &&
      published.some((exam) => exam.id === attempt.examId),
  ).length;

  return (
    <Badge tone={submitted > 0 ? 'green' : 'slate'}>
      {submitted} of {published.length} completed
    </Badge>
  );
}

/* -------------------------------------------------------------------------- */
/* Adding a question                                                           */
/* -------------------------------------------------------------------------- */

export function AddQuestionForm({ store }: { store: Store }) {
  const { setState } = store;
  const [text, setText] = useState('');
  const [subject, setSubject] = useState<string>(SUBJECTS[0].code);
  const [choices, setChoices] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState(0);
  const [explanation, setExplanation] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const options = choices
      .map((choice, index) => ({ text: choice.trim(), index }))
      .filter((option) => option.text.length > 0);

    if (text.trim().length === 0 || options.length < 2) {
      setError('Enter the question and at least two options.');
      return;
    }

    if (options[correct] === undefined) {
      setError('Mark one of the options as the correct answer.');
      return;
    }

    const id = `q-${Date.now().toString(36)}`;
    const correctIndex = options[correct].index;

    const question: Question = {
      id,
      subject,
      text: text.trim(),
      marks: 2,
      explanation: explanation.trim() || 'No explanation has been written for this question yet.',
      options: options.map((option, position) => ({
        id: `${id}-${position}`,
        text: option.text,
        isCorrect: option.index === correctIndex,
      })),
    };

    setState((current) => ({ ...current, questions: [...current.questions, question] }));
    setText('');
    setChoices(['', '', '', '']);
    setCorrect(0);
    setExplanation('');
    setError(null);
  };

  return (
    <Card>
      <CardBody className="space-y-3">
        <h2 className="font-semibold">Add a question</h2>

        <Field label="Question">
          <input
            className={inputClass}
            placeholder="Which scheduling algorithm can starve a process?"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
            }}
          />
        </Field>

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

        <Field label="Explanation shown after submission">
          <input
            className={inputClass}
            placeholder="Why that answer is correct"
            value={explanation}
            onChange={(event) => {
              setExplanation(event.target.value);
            }}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-2">
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

        {error === null ? null : <Notice tone="red">{error}</Notice>}
      </CardBody>
    </Card>
  );
}
