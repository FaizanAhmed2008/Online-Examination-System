import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PendingAreasCard } from '@/components/dashboard/PendingAreasCard';
import { SignedInAsCard } from '@/components/dashboard/SignedInAsCard';

/**
 * Faculty dashboard (PRD §10). The question bank is live; exam building,
 * publishing and results arrive with their features. No sample questions or
 * exams are shown in the meantime.
 */
export function FacultyDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Faculty dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create and manage exams, questions and results from here.
        </p>
      </div>

      <SignedInAsCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Question bank</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Write single-choice questions, tag them with a subject, and reuse them in future exams.
          </p>
          <Button asChild variant="secondary" size="sm">
            <Link to="/faculty/questions">Open question bank</Link>
          </Button>
        </CardContent>
      </Card>

      <PendingAreasCard
        areas={['Exam builder', 'Publish and unpublish', 'Exam results']}
        nextSprint="The exam builder is built next."
      />
    </div>
  );
}
