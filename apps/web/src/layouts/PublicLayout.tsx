import { NavLink, Outlet } from 'react-router';

import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/', label: 'Overview' },
  { to: '/status', label: 'System status' },
] as const;

function Wordmark() {
  return (
    <NavLink to="/" className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="grid size-7 place-items-center rounded-md bg-primary text-xs font-semibold text-primary-foreground"
      >
        OE
      </span>
      <span className="text-sm font-semibold tracking-tight">Online Examination System</span>
    </NavLink>
  );
}

/**
 * Shell for every public, unauthenticated screen. Authenticated role layouts
 * (sidebar + topbar per PRD §11) are introduced together with authentication.
 */
export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-6 px-6">
          <Wordmark />
          <nav aria-label="Main">
            <ul className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
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
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <Outlet />
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-6 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Online Examination System — Software Engineering project.</p>
          <p>Product requirements: PRD v1.0</p>
        </div>
      </footer>
    </div>
  );
}
