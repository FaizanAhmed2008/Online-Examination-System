import { PendingAreasCard } from '@/components/dashboard/PendingAreasCard';
import { SignedInAsCard } from '@/components/dashboard/SignedInAsCard';

/**
 * Admin dashboard (PRD §10). User, subject and system overview management
 * arrive with their features; no sample users are listed in the meantime.
 */
export function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage users, subjects and system visibility from here.
        </p>
      </div>

      <SignedInAsCard />

      <PendingAreasCard
        areas={['User and role management', 'Subject management', 'System overview', 'Audit state']}
        nextSprint="Admin tooling is built after the exam features."
      />
    </div>
  );
}
