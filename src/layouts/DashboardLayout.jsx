import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  LayoutDashboard,
  FileText,
  HelpCircle,
  User,
  CheckCircle2,
  Calendar,
  Award,
  BookOpen,
  LogOut,
  Menu,
  X,
  Bell,
  Clock,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Icon mapping helper for nav items
const getNavIcon = (name) => {
  const lower = name.toLowerCase();
  if (lower.includes('dashboard')) return LayoutDashboard;
  if (lower.includes('paper set') || lower.includes('question paper')) return FileText;
  if (lower.includes('question')) return HelpCircle;
  if (lower.includes('exam')) return BookOpen;
  if (lower.includes('schedule')) return Calendar;
  if (lower.includes('result')) return Award;
  if (lower.includes('profile')) return User;
  return FileText;
};

const DashboardLayout = ({ title, navItems, children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const basePath = location.pathname.split('/').slice(0, 2).join('/');

  const isActive = (path) => {
    if (path === '.' || path === '') {
      return location.pathname === basePath || location.pathname === `${basePath}/`;
    }
    return location.pathname.startsWith(`${basePath}/${path}`);
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'teacher':
        return { label: 'Faculty Member', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'examdept':
        return { label: 'Exam Department', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'student':
        return { label: 'Enrolled Student', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      default:
        return { label: role, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const roleInfo = getRoleBadge(user?.role);
  const activeNavItem = navItems.find((item) => isActive(item.path)) || { name: 'Overview' };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row text-slate-800">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0d1b2a] text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-900/40">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight leading-snug">
                Apex University
              </h1>
              <p className="text-xs text-blue-300 font-medium">
                Examination Portal
              </p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Portal Role Card */}
        <div className="px-5 py-4 border-b border-slate-800/60 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">
                {user?.name || 'Authorized User'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {roleInfo.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Navigation
          </p>
          {navItems.map((item) => {
            const Icon = getNavIcon(item.name);
            const active = isActive(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      active ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* System info & logout footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Secure Portal Active
            </span>
            <span className="font-mono text-[10px] text-slate-500">v2.4.0</span>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 transition-all duration-200 text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
          <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
                aria-label="Toggle menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
                  <span>Portal</span>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                  <span className="capitalize">{user?.role}</span>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                  <span className="text-blue-600 font-semibold">{activeNavItem.name}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
                  {title}
                </h2>
              </div>
            </div>

            <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
                DEMO MODE
              </span>

              <span
                className={`hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${roleInfo.color}`}
              >
                {roleInfo.label}
              </span>

              <div className="h-6 w-px bg-slate-200 hidden sm:block" />

              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-semibold text-slate-800 leading-tight">
                    {user?.name}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    ID: {user?.username}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;