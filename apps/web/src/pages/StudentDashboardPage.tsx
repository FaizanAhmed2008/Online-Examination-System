import { PendingAreasCard } from '@/components/dashboard/PendingAreasCard';
import { SignedInAsCard } from '@/components/dashboard/SignedInAsCard';

/**
 * Student dashboard (PRD §10, FR-03). The exam sections — upcoming, available
 * and completed — arrive with the exam features; until there are no exams,
 * this screen states that instead of showing invented rows.
 */
export function StudentDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Student dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your available, upcoming and completed examinations appear here.
        </p>
      </div>

      <SignedInAsCard />

      <PendingAreasCard
        areas={['Available exams', 'Upcoming exams', 'Completed exams', 'Results and review']}
        nextSprint="Exam discovery and the attempt flow are built next."
      />
    </div>
  );
}
