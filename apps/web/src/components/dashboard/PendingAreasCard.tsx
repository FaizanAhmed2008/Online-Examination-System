import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Honest empty state (PRD §12: explain why there is no data and give a next
 * action). Areas that a later sprint will build are listed as pending rather
 * than filled with sample content, so nothing on screen is ever fake.
 */
export function PendingAreasCard({
  areas,
  nextSprint,
}: {
  areas: readonly string[];
  nextSprint: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Not available yet</CardTitle>
        <CardDescription>
          This area is scheduled for a later sprint. Nothing is shown here because no data exists
          yet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 sm:grid-cols-2">
          {areas.map((area) => (
            <li
              key={area}
              className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground"
            >
              {area}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">{nextSprint}</p>
      </CardContent>
    </Card>
  );
}
