import { Link } from 'react-router-dom';
import { GraduationCap, Home, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NotFound = () => {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 text-center shadow-lg">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-6 border border-blue-100">
          <ShieldAlert className="w-8 h-8 text-blue-600" />
        </div>

        <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 uppercase tracking-wider">
          404 &middot; Page Not Found
        </span>

        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-4 mb-2">
          Examination Resource Missing
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-8">
          The requested examination URL or dashboard route does not exist or has been relocated by the Central Examination Cell.
        </p>

        <div className="space-y-3">
          {isAuthenticated && user && (
            <Link
              to={`/${user.role}`}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/25 transition-all"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Return to {user.role.toUpperCase()} Portal</span>
            </Link>
          )}

          <Link
            to="/"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Go to Public Homepage</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
