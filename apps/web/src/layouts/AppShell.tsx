import { NavLink, Outlet, useNavigate } from 'react-router';
import { LogOut } from 'lucide-react';

import { useAuth } from '@/auth/session-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Navigation for each role. Deliberately short: it lists the areas the role can
 * actually open today, not the areas the PRD will eventually add (PRD §11).
 */
const NAV_BY_ROLE = {
  STUDENT: [
    { to: '/student', label: 'My dashboard', end: true },
    { to: '/student/exams', label: 'Exams', end: false },
  ],
  FACULTY: [
    { to: '/faculty', label: 'Dashboard', end: true },
    { to: '/faculty/exams', label: 'Exams', end: false },
    { to: '/faculty/questions', label: 'Question bank', end: false },
  ],
  ADMIN: [{ to: '/admin', label: 'Dashboard', end: true }],
} as const;

const ROLE_LABEL = {
  STUDENT: 'Student',
  FACULTY: 'Faculty',
  ADMIN: 'Administrator',
} as const;

/**
 * Authenticated shell (PRD §11: predictable sidebar/topbar patterns by role).
 * The wordmark and sign-out control are always present; role navigation sits in
 * the top bar until there is enough of it to justify a sidebar.
 */
export function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (user === null) {
    return null;
  }

  const navItems = NAV_BY_ROLE[user.role];

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-6 px-6">
          <nav aria-label="Main" className="flex items-center gap-1">
            <ul className="flex items-center gap-1">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={'end' in item ? item.end : false}
                    className={({ isActive }) =>
                      cn(
                        'rounded-md px-3 py-1.5 text-sm transition-colors',
                        isActive
                          ? 'font-medium text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm leading-tight font-medium">{user.name}</p>
              <p className="text-xs leading-tight text-muted-foreground">{ROLE_LABEL[user.role]}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
