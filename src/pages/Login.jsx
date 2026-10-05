import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  ShieldCheck,
  User,
  Lock,
  ArrowRight,
  Sparkles,
  BookOpen,
  Award,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'teacher') navigate('/teacher');
      else if (user.role === 'examdept') navigate('/examdept');
      else if (user.role === 'student') navigate('/student');
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Minor simulated delay for smooth feel
    setTimeout(() => {
      const result = login(username, password);

      if (result.success) {
        if (result.role === 'teacher') navigate('/teacher');
        else if (result.role === 'examdept') navigate('/examdept');
        else if (result.role === 'student') navigate('/student');
      } else {
        setError(result.error || 'Invalid credentials');
      }
      setIsLoading(false);
    }, 200);
  };

  const fillDemoCredentials = (role) => {
    if (role === 'teacher') {
      setUsername('teacher');
      setPassword('teacher123');
    } else if (role === 'examdept') {
      setUsername('examdept');
      setPassword('exam123');
    } else if (role === 'student') {
      setUsername('student');
      setPassword('student123');
    }
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0B192C] to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Background soft ambient accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-600/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-600/15 blur-3xl" />
      </div>

      <div className="relative w-full max-w-5xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Branding Column */}
        <div className="lg:col-span-5 bg-gradient-to-br from-blue-900 via-[#132A52] to-[#0A162B] p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center shadow-lg">
                <GraduationCap className="w-7 h-7 text-blue-300" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-blue-300">
                  Apex University
                </span>
                <p className="text-sm text-slate-300 font-medium">
                  Examination Cell
                </p>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-3 leading-snug">
              Online Examination & Assessment Portal
            </h1>
            <p className="text-sm text-blue-100/80 leading-relaxed mb-6">
              A high-security, university-grade platform for authoring question papers, scheduling exams, and conducting proctored digital assessments.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-xs text-blue-100/90 bg-white/5 border border-white/10 rounded-xl p-3">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Multi-tier role access (Faculty, Exam Dept & Students)</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-blue-100/90 bg-white/5 border border-white/10 rounded-xl p-3">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Synchronized live timer with answer navigator</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-blue-100/90 bg-white/5 border border-white/10 rounded-xl p-3">
                <Award className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Real-time evaluation and instant grading scorecards</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-blue-200/70">
            <span>Academic Session 2026-27</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Secure Portal
            </span>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between bg-white">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Sign In
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Access your institutional examination account
                </p>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                DEMO MODE
              </span>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Institutional Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-sm text-slate-900 placeholder:text-slate-400"
                    placeholder="e.g. teacher, examdept, or student"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Access Key / Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-sm text-slate-900 placeholder:text-slate-400"
                    placeholder="Enter password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Enter Examination Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick 1-Click Demo Profiles */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                1-Click Demo Sign In
              </span>
              <span className="text-[11px] text-blue-600 font-medium">
                Click any role to load
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => fillDemoCredentials('teacher')}
                className="group p-3 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    Faculty
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                </div>
                <p className="text-[11px] font-mono text-slate-500">teacher</p>
              </button>

              <button
                type="button"
                onClick={() => fillDemoCredentials('examdept')}
                className="group p-3 border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/50 transition-all text-left flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Exam Dept
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                </div>
                <p className="text-[11px] font-mono text-slate-500">examdept</p>
              </button>

              <button
                type="button"
                onClick={() => fillDemoCredentials('student')}
                className="group p-3 border border-slate-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-left flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                    Student
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                </div>
                <p className="text-[11px] font-mono text-slate-500">student</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;