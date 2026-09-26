import { RouterProvider, createBrowserRouter } from 'react-router';

import { AuthProvider } from '@/auth/AuthProvider';
import { routes } from '@/routes';

const router = createBrowserRouter(routes);

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
