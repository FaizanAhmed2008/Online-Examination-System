import { useAuth } from '@/auth/session-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ROLE_LABEL = {
  STUDENT: 'Student',
  FACULTY: 'Faculty',
  ADMIN: 'Administrator',
} as const;

/**
 * The signed-in identity, straight from `GET /auth/me`. Nothing here is
 * placeholder content: every value is what the server returned.
 */
export function SignedInAsCard() {
  const { user } = useAuth();

  if (user === null) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signed in as</CardTitle>
        <CardDescription>Your account, as recognised by the server.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Name</dt>
            <dd className="text-sm font-medium">{user.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd className="text-sm font-medium break-all">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Role</dt>
            <dd className="mt-0.5">
              <Badge variant="secondary">{ROLE_LABEL[user.role]}</Badge>
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
