import { useState } from 'react';
import { GraduationCap, LogOut, RotateCcw } from 'lucide-react';

import { CreateAccountPage, LoginPage } from './auth';
import type { Role, User as Account } from './data';
import {
  FacultyExamEditor,
  FacultyExamList,
  FacultyHome,
  FacultyResults,
  FacultyStudents,
} from './faculty';
import { StudentAttempt, StudentBrief, StudentHome, StudentResult } from './student';
import { currentUser, useStore, type Store } from './store';
import { Button, cx } from './ui';

/**
 * Navigation is a plain state machine rather than a router. The role a person
 * sees is decided by the account they signed in with, so the guard and the
 * navigation live together here rather than in a route table that would have to
 * repeat the role check on every entry.
 */
export type Route =
  | { name: 'login' }
  | { name: 'create-account' }
  | { name: 'student' }
  | { name: 'brief'; examId: string }
  | { name: 'attempt'; attemptId: string }
  | { name: 'result'; attemptId: string }
  | { name: 'faculty' }
  | { name: 'exams' }
  | { name: 'exam-editor'; examId: string | null }
  | { name: 'exam-attempts'; examId: string }
  | { name: 'students' };

type Navigate = (route: Route) => void;

const TABS: Record<Role, readonly { label: string; route: Route; active: Route['name'] }[]> = {
  STUDENT: [{ label: 'My exams', route: { name: 'student' }, active: 'student' }],
  FACULTY: [
    { label: 'Overview', route: { name: 'faculty' }, active: 'faculty' },
    { label: 'Exam papers', route: { name: 'exams' }, active: 'exams' },
    { label: 'Results', route: { name: 'exam-attempts', examId: '' }, active: 'exam-attempts' },
    { label: 'Students', route: { name: 'students' }, active: 'students' },
  ],
};

/** Where each role belongs, used after signing in and after signing out. */
const HOME: Record<Role, Route> = {
  STUDENT: { name: 'student' },
  FACULTY: { name: 'faculty' },
};

export function App() {
  const store = useStore();
  const [route, setRoute] = useState<Route>({ name: 'login' });

  const account = currentUser(store.state);
  const go: Navigate = (next) => setRoute(next);

  if (account === null) {
    return (
      <>
        {route.name === 'create-account' ? (
          <CreateAccountPage store={store} go={go} />
        ) : (
          <LoginPage store={store} go={go} />
        )}
      </>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-6">
          <div className="flex min-w-0 items-center gap-2">
            <GraduationCap aria-hidden="true" className="size-6 shrink-0 text-slate-700" />
            <span className="truncate text-sm font-semibold">Online Examination System</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-sm leading-tight font-medium">{account.name}</p>
              <p className="text-xs leading-tight text-slate-500">
                {account.role === 'FACULTY' ? 'Faculty' : 'Student'}
              </p>
            </div>

            <Button
              variant="ghost"
              title="Restore the starting data"
              onClick={() => {
                store.restore();
                setRoute(HOME[account.role]);
              }}
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Reset</span>
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                store.setState((current) => ({ ...current, sessionUserId: null }));
                setRoute({ name: 'login' });
              }}
            >
              <LogOut aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>

        <nav aria-label="Sections" className="border-t border-slate-200">
          <ul className="mx-auto flex w-full max-w-5xl gap-1 px-5">
            {TABS[account.role].map((tab) => (
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
        <Screen route={route} account={account} store={store} go={go} />
      </main>
    </div>
  );
}

/**
 * Renders the screen for the signed-in account. Anything a role has no business
 * seeing falls back to its own home screen rather than rendering a partial view.
 */
function Screen({
  route,
  account,
  store,
  go,
}: {
  route: Route;
  account: Account;
  store: Store;
  go: Navigate;
}) {
  if (account.role === 'FACULTY') {
    switch (route.name) {
      case 'exams':
        return <FacultyExamList account={account} store={store} go={go} />;
      case 'exam-editor':
        return <FacultyExamEditor account={account} examId={route.examId} store={store} go={go} />;
      case 'exam-attempts':
        return <FacultyResults account={account} examId={route.examId} store={store} go={go} />;
      case 'students':
        return <FacultyStudents store={store} />;
      default:
        return <FacultyHome account={account} store={store} go={go} />;
    }
  }

  switch (route.name) {
    case 'brief':
      return <StudentBrief account={account} examId={route.examId} store={store} go={go} />;
    case 'attempt':
      return <StudentAttempt account={account} attemptId={route.attemptId} store={store} go={go} />;
    case 'result':
      return <StudentResult account={account} attemptId={route.attemptId} store={store} go={go} />;
    default:
      return <StudentHome account={account} store={store} go={go} />;
  }
}
