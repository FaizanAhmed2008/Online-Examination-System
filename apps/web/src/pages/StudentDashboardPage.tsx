import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';

import { PendingAreasCard } from '@/components/dashboard/PendingAreasCard';
import { SignedInAsCard } from '@/components/dashboard/SignedInAsCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Student dashboard (PRD §10, FR-03). The attempt flow exists now, so the way
 * into it is the primary action; the remaining exam areas are still listed as
 * pending rather than filled with invented rows.
 */
export function StudentDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Student dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sit a published exam, resume one in progress, and see what you have already submitted.
        </p>
      </div>

      <SignedInAsCard />

      <Card>
        <CardHeader>
          <CardTitle>Exams</CardTitle>
          <CardDescription>
            Every exam published to you, with the time limit, the number of questions and where your
            last attempt got to.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm">
            <Link to="/student/exams">
              Go to my exams
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <PendingAreasCard
        areas={['Upcoming exams', 'Completed exams', 'Results and review']}
        nextSprint="Exam discovery and the attempt flow are built next."
      />
    </div>
  );
}
