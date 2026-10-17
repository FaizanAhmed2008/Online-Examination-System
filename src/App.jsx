import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PaperProvider } from './context/PaperContext';
import ExamDeptDashboard from './pages/ExamDeptDashboard';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import LandingPage from './pages/LandingPage';
import NotFound from './pages/NotFound';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // The stored session is restored asynchronously on the very first render.
  // Waiting for it keeps deep links such as /teacher/question-papers from
  // bouncing back to the role dashboard on refresh.
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 grid place-items-center text-blue-300 text-sm font-semibold tracking-wide">
        Restoring secure session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Authentication */}
      <Route path="/login" element={<Login />} />

      {/* Role-Specific Protected Dashboards */}
      <Route
        path="/teacher/*"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/examdept/*"
        element={
          <ProtectedRoute allowedRoles={['examdept']}>
            <ExamDeptDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/*"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      {/* 404 Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <PaperProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </PaperProvider>
    </AuthProvider>
  );
}

export default App;
