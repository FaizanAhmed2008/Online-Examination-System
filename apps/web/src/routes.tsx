import type { RouteObject } from 'react-router';

import { RequireAuth, RequireRole } from '@/auth/RequireAuth';
import { AppShell } from '@/layouts/AppShell';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import { FacultyDashboardPage } from '@/pages/FacultyDashboardPage';
import { FacultyExamsPage } from '@/pages/FacultyExamsPage';
import { FacultyQuestionBankPage } from '@/pages/FacultyQuestionBankPage';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { StudentAttemptPage } from '@/pages/StudentAttemptPage';
import { StudentDashboardPage } from '@/pages/StudentDashboardPage';
import { StudentExamBriefPage } from '@/pages/StudentExamBriefPage';
import { StudentExamsPage } from '@/pages/StudentExamsPage';
import { SystemStatusPage } from '@/pages/SystemStatusPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';

/**
 * Route table for the whole client. Every new screen is registered here so the
 * navigation structure stays visible in one place.
 *
 * Role-scoped paths (`/student`, `/faculty`, `/admin`) keep URLs
 * self-describing and make the role guard obvious at the route.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'status', element: <SystemStatusPage /> },
      { path: 'login', element: <LoginPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/unauthorized',
        element: <UnauthorizedPage />,
      },
      {
        element: <AppShell />,
        children: [
          {
            element: <RequireRole allow={['STUDENT']} />,
            children: [
              { path: '/student', element: <StudentDashboardPage /> },
              { path: '/student/exams', element: <StudentExamsPage /> },
              { path: '/student/exams/:examId', element: <StudentExamBriefPage /> },
              { path: '/student/attempts/:attemptId', element: <StudentAttemptPage /> },
            ],
          },
          {
            element: <RequireRole allow={['FACULTY']} />,
            children: [
              { path: '/faculty', element: <FacultyDashboardPage /> },
              { path: '/faculty/questions', element: <FacultyQuestionBankPage /> },
              { path: '/faculty/exams', element: <FacultyExamsPage /> },
            ],
          },
          {
            element: <RequireRole allow={['ADMIN']} />,
            children: [{ path: '/admin', element: <AdminDashboardPage /> }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
];
