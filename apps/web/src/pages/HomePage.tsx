import { ArrowRight, Database, Layers, Server, Shapes } from 'lucide-react';
import { Link } from 'react-router';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ROLES = [
  {
    role: 'Student',
    purpose: 'Attempt examinations',
    detail: 'See eligible exams, read instructions, answer questions and review results.',
  },
  {
    role: 'Faculty',
    purpose: 'Create and manage exams',
    detail: 'Maintain a question bank, build exams, publish them and review results.',
  },
  {
    role: 'Admin',
    purpose: 'System administration',
    detail: 'Manage users, roles and subjects with controlled system-wide visibility.',
  },
] as const;

const FOUNDATION = [
  {
    icon: Layers,
    title: 'Workspace structure',
    detail: 'Web client, REST API and shared contracts in one repository.',
  },
  {
    icon: Server,
    title: 'API foundation',
    detail: 'Express + TypeScript with health checks and centralised error handling.',
  },
  {
    icon: Shapes,
    title: 'Design system',
    detail: 'Tailwind tokens and reusable components with one restrained accent.',
  },
  {
    icon: Database,
    title: 'Data layer',
    detail: 'PostgreSQL with Prisma migrations, ready for the first feature.',
  },
] as const;

export function HomePage() {
  return (
    <div className="flex flex-col gap-16">
      <section className="flex max-w-2xl flex-col gap-6">
        <Badge variant="outline" className="w-fit">
          Sprint 0 · Foundation
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight text-balance">
          Online Examination System
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          A lightweight, web-based examination platform where students attempt exams without
          confusion and faculty build assessments with minimal administrative work.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link to="/status">
              Check system status
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <a href="#foundation">What is in place</a>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Examination features are not implemented yet. This release contains the foundation they
          will be built on.
        </p>
      </section>

      <section aria-labelledby="roles-heading" className="flex flex-col gap-5">
        <h2 id="roles-heading" className="text-xl font-semibold tracking-tight">
          Built for three roles
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {ROLES.map(({ role, purpose, detail }) => (
            <Card key={role}>
              <CardHeader>
                <CardTitle className="text-base">{role}</CardTitle>
                <CardDescription>{purpose}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{detail}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="foundation" aria-labelledby="foundation-heading" className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 id="foundation-heading" className="text-xl font-semibold tracking-tight">
            What is in place
          </h2>
          <p className="text-sm text-muted-foreground">
            Verified parts of the foundation. Live service health is reported on the status page.
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {FOUNDATION.map(({ icon: Icon, title, detail }) => (
            <li key={title}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
                    {title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-start justify-between gap-3 text-sm text-muted-foreground">
                  <span>{detail}</span>
                  <Badge variant="secondary">In place</Badge>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
