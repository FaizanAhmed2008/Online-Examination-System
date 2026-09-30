import { useState } from 'react';
import { GraduationCap, RotateCcw, ShieldCheck, User } from 'lucide-react';

import { FacultyExamEditor, FacultyExamList, FacultyHome, FacultyResults } from './faculty';
import type { Role } from './data';
import { StudentAttempt, StudentBrief, StudentHome, StudentResult } from './student';
import { useDemoStore, type Store } from './store';
import { Button, cx } from './ui';

/**
 * Navigation is a plain state machine rather than a router. The prototype has a
 * handful of screens and no URLs worth bookmarking, so a route union keeps the
 * whole flow visible in one place instead of spread across a route table.
 */
export type Route =
  | { name: 'student' }
  | { name: 'brief'; examId: string }
  | { name: 'attempt'; attemptId: string }
  | { name: 'result'; attemptId: string }
  | { name: 'faculty' }
  | { name: 'exams' }
  | { name: 'exam-editor'; examId: string | null }
  | { name: 'exam-attempts'; examId: string };

type Navigate = (route: Route) => void;

const TABS: Record<Role, readonly { label: string; route: Route; active: Route['name'] }[]> = {
  STUDENT: [{ label: 'My exams', route: { name: 'student' }, active: 'student' }],
  FACULTY: [
    { label: 'Overview', route: { name: 'faculty' }, active: 'faculty' },
    { label: 'Exam papers', route: { name: 'exams' }, active: 'exams' },
    { label: 'Results', route: { name: 'exam-attempts', examId: '' }, active: 'exam-attempts' },
  ],
};

export function App() {
  const store = useDemoStore();
  const [role, setRole] = useState<Role>('STUDENT');
  const [route, setRoute] = useState<Route>({ name: 'student' });

  const go: Navigate = (next) => setRoute(next);

  function switchRole(next: Role) {
    setRole(next);
    setRoute(next === 'STUDENT' ? { name: 'student' } : { name: 'faculty' });
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-6">
          <div className="flex min-w-0 items-center gap-3">
            <GraduationCap aria-hidden="true" className="size-6 shrink-0 text-slate-700" />
            <span className="truncate text-sm font-semibold">Online Examination System</span>
            <span className="hidden rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 sm:inline">
              Demo · demo data only
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div
              role="group"
              aria-label="Switch role"
              className="flex rounded-lg border border-slate-300 p-0.5"
            >
              <RoleButton
                active={role === 'STUDENT'}
                icon={<User aria-hidden="true" className="size-3.5" />}
                label="Student"
                onClick={() => {
                  switchRole('STUDENT');
                }}
              />
              <RoleButton
                active={role === 'FACULTY'}
                icon={<ShieldCheck aria-hidden="true" className="size-3.5" />}
                label="Faculty"
                onClick={() => {
                  switchRole('FACULTY');
                }}
              />
            </div>

            <Button
              variant="ghost"
              title="Reset the demo back to its seeded state"
              onClick={() => {
                store.reset();
                setRoute(role === 'STUDENT' ? { name: 'student' } : { name: 'faculty' });
              }}
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          </div>
        </div>

        <nav aria-label="Sections" className="border-t border-slate-200">
          <ul className="mx-auto flex w-full max-w-5xl gap-1 px-5">
            {TABS[role].map((tab) => (
              <li key={tab.label}>
                <button
                  type="button"
                  aria-current={route.name === tab.active ? 'page' : undefined}
                  onClick={() => {
                    go(tab.route);
                  }}
                  className={cx(
                    '-mb-px border-b-2 px-3 py-2.5 text-sm transition-colors',
                    route.name === tab.active
                      ? 'border-slate-900 font-medium text-slate-900'
                      : 'border-transparent text-slate-600 hover:text-slate-900',
                  )}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        {role === 'STUDENT' ? (
          <StudentScreen route={route} store={store} go={go} />
        ) : (
          <FacultyScreen route={route} store={store} go={go} />
        )}
      </main>

      <footer className="mx-auto w-full max-w-5xl px-6 pb-8 text-xs text-slate-500">
        Prototype. Everything on screen is seeded demo data held in this browser tab — there is no
        server, database or login behind it.
      </footer>
    </div>
  );
}

function RoleButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition-colors',
        active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function StudentScreen({ route, store, go }: { route: Route; store: Store; go: Navigate }) {
  switch (route.name) {
    case 'brief':
      return <StudentBrief examId={route.examId} store={store} go={go} />;
    case 'attempt':
      return <StudentAttempt attemptId={route.attemptId} store={store} go={go} />;
    case 'result':
      return <StudentResult attemptId={route.attemptId} store={store} go={go} />;
    case 'student':
      return <StudentHome store={store} go={go} />;
    default:
      return <StudentHome store={store} go={go} />;
  }
}

function FacultyScreen({ route, store, go }: { route: Route; store: Store; go: Navigate }) {
  switch (route.name) {
    case 'exams':
      return <FacultyExamList store={store} go={go} />;
    case 'exam-editor':
      return <FacultyExamEditor examId={route.examId} store={store} go={go} />;
    case 'exam-attempts':
      return <FacultyResults examId={route.examId} store={store} go={go} />;
    default:
      return <FacultyHome store={store} go={go} />;
  }
}
