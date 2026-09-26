import { Button } from '@/components/ui/button';
import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="flex max-w-md flex-col items-start gap-4">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">This page does not exist</h1>
      <p className="text-muted-foreground">
        The address you opened is not part of the application. Check the link or return to the
        overview.
      </p>
      <Button asChild variant="outline">
        <Link to="/">Back to overview</Link>
      </Button>
    </div>
  );
}
