import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  ShieldCheck,
  Clock,
  Award,
  BookOpen,
  FileText,
  CheckCircle2,
  ArrowRight,
  Menu,
  X,
  Calendar,
  Layers,
  Laptop,
  Check,
  Lock,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);

  const workflowSteps = [
    {
      step: '01',
      title: 'Question Paper Authoring',
      actor: 'Faculty Members',
      desc: 'Subject teachers author standardized question sets (Set A, Set B, Set C) with customized marks, multi-choice options, and difficulty tagging.',
      icon: FileText,
      badge: 'Academic Drafting',
    },
    {
      step: '02',
      title: 'Confidential CoE Review',
      actor: 'Controller of Examinations',
      desc: 'The Examination Cell reviews submitted sets for syllabus coverage, verifies answer keys, and grants official approval or requests revisions.',
      icon: ShieldCheck,
      badge: 'Moderation Phase',
    },
    {
      step: '03',
      title: 'Schedule & Portal Publishing',
      actor: 'Exam Department Cell',
      desc: 'Approved question sets are scheduled with synchronized time windows and published to enrolled students.',
      icon: Calendar,
      badge: 'Timetable Release',
    },
    {
      step: '04',
      title: 'Proctored CBT Examination',
      actor: 'Enrolled Candidates',
      desc: 'Students enter the distraction-free exam interface with live countdown timers, questions palette navigation, and instant answer saving.',
      icon: Laptop,
      badge: 'Live Assessment',
    },
    {
      step: '05',
      title: 'Instant Grading & Transcripts',
      actor: 'Automated CBT Engine',
      desc: 'Tests are evaluated automatically upon submission. Instant scorecards are generated with percentage breakdowns and archived to official university records.',
      icon: Award,
      badge: 'Result Declaration',
    },
  ];

  const features = [
    {
      icon: ShieldCheck,
      title: 'Multi-Tier Role Governance',
      description: 'Role-specific views separate faculty authoring, department scheduling, and student exam workflows in this browser-based demo.',
    },
    {
      icon: Layers,
      title: 'Standardized Multi-Set Papers',
      description: 'Create and manage parallel paper sets (Set A, B, C) for balanced evaluation, complete with question bank reuse and marks weighting.',
    },
    {
      icon: Clock,
      title: 'Synchronized Countdown Engine',
      description: 'High-precision examination timers with critical threshold alerts and automatic auto-submit when the allotted window concludes.',
    },
    {
      icon: Laptop,
      title: 'Distraction-Free CBT Environment',
      description: 'Streamlined test interface featuring intuitive question status palettes: Answered, Visited, Marked for Review, and Unvisited.',
    },
    {
      icon: Award,
      title: 'Instant Automated Evaluation',
      description: 'Automated evaluation pipeline calculates scores, percentages, and performance grades immediately upon submission.',
    },
    {
      icon: Calendar,
      title: 'Timetable & Invigilation Control',
      description: 'Comprehensive examination schedules, hall ticket verification records, assigned faculty invigilators, and real-time status tracking.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top University Announcement Bar */}
      <div className="bg-[#0b192c] text-slate-300 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-white">MGM University</span>
            <span className="text-slate-500 hidden sm:inline">&middot;</span>
            <span className="text-slate-400 hidden sm:inline">Central Examination Cell &middot; Academic Session 2025–26</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span className="hidden md:inline">UGC & AICTE Digital Examination Standards Compliant</span>
            <span className="font-mono text-emerald-400 font-semibold">CBT Portal v2.4 Active</span>
          </div>
        </div>
      </div>

      {/* Main Sticky Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18">
            {/* Logo & Brand */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-700/20 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <span className="text-lg font-extrabold text-slate-900 tracking-tight leading-tight block">
                  MGM University
                </span>
                <span className="text-xs font-semibold text-blue-600 tracking-wide uppercase">
                  Online Examination System
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-8 text-sm font-semibold text-slate-600">
              <a href="#home" className="hover:text-blue-600 transition-colors">Home</a>
              <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
              <a href="#workflow" className="hover:text-blue-600 transition-colors">Examination Workflow</a>
              <a href="#roles" className="hover:text-blue-600 transition-colors">Portals & Roles</a>
              <a href="#about" className="hover:text-blue-600 transition-colors">About CoE Cell</a>
            </nav>

            {/* User Auth Action Button */}
            <div className="hidden sm:flex items-center space-x-3">
              {isAuthenticated && user ? (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900">{user.name}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{user.role} Portal</p>
                  </div>
                  <Link
                    to={`/${user.role}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
                  >
                    <span>Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={logout}
                    title="Sign Out"
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Portal Sign In</span>
                </Link>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-5 space-y-3 shadow-lg">
            <nav className="flex flex-col space-y-3 text-sm font-semibold text-slate-700">
              <a
                href="#home"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-blue-600"
              >
                Home
              </a>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-blue-600"
              >
                Features
              </a>
              <a
                href="#workflow"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-blue-600"
              >
                Examination Workflow
              </a>
              <a
                href="#roles"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-blue-600"
              >
                Portals & Roles
              </a>
              <a
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-blue-600"
              >
                About CoE Cell
              </a>
            </nav>

            <div className="pt-3 border-t border-slate-100">
              {isAuthenticated && user ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>{user.name}</span>
                    <span className="text-blue-600 capitalize">({user.role})</span>
                  </div>
                  <Link
                    to={`/${user.role}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold"
                  >
                    <span>Go to Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Enter Examination Portal</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="home" className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-slate-100 via-white to-slate-50">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Headlines & CTA */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>MGM University Examination Management System</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
                Standardized, Proctored & Secure <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600">University Examinations</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                A unified institutional platform powering question paper lifecycle authoring, confidential CoE moderation, synchronized CBT assessments, and real-time student evaluation transcripts.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/25 hover:shadow-xl transition-all"
                >
                  <Lock className="w-4 h-4" />
                  <span>Enter Examination Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href="#workflow"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-sm shadow-2xs transition-colors"
                >
                  <BookOpen className="w-4 h-4 text-slate-500" />
                  <span>View Examination Workflow</span>
                </a>
              </div>

              {/* Institutional Trust Indicators */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-4 text-left">
                <div>
                  <p className="text-xl sm:text-2xl font-black text-slate-900">10,000+</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Enrolled Candidates</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-blue-600">100%</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Tamper-Proof Audit</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-slate-900">3-Tier</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Role Governance</p>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive CBT Interface Preview */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Decorative border glow */}
                <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur-md opacity-25"></div>

                {/* Preview Window Container */}
                <div className="relative bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden text-left">
                  {/* Mock Window Title Bar */}
                  <div className="bg-[#0f172a] text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                      <span className="text-xs font-mono text-slate-300 ml-2 font-semibold truncate">
                        MGM CBT Terminal &middot; CS-302
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[11px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      LIVE
                    </span>
                  </div>

                  {/* Header Meta Info */}
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Candidate</span>
                      <span className="font-bold text-slate-900">Aarav Sharma</span>
                      <span className="text-slate-500 font-mono text-[11px] ml-1.5">(2026-CS-401)</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Allotted Timer</span>
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                        24m 18s left
                      </span>
                    </div>
                  </div>

                  {/* Simulated Question Area */}
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        Question 04 of 10
                      </span>
                      <span className="text-slate-500 font-semibold text-[11px]">Marks: +2.0</span>
                    </div>

                    <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
                      Which software process model places primary emphasis on delivering functional working increments and continuous user collaboration?
                    </p>

                    <div className="space-y-2 pt-1 text-xs">
                      <div className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center gap-2.5 text-slate-600">
                        <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">A</span>
                        <span>Waterfall Sequential Model</span>
                      </div>
                      <div className="p-2.5 rounded-xl border-2 border-blue-600 bg-blue-50/70 flex items-center gap-2.5 text-blue-900 font-semibold shadow-2xs">
                        <span className="w-5 h-5 rounded-md bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">B</span>
                        <span>Agile Development Methodology</span>
                        <Check className="w-3.5 h-3.5 text-blue-600 ml-auto" />
                      </div>
                      <div className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center gap-2.5 text-slate-600">
                        <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">C</span>
                        <span>Big Bang Development Model</span>
                      </div>
                    </div>

                    {/* Question Palette Indicator */}
                    <div className="pt-3 border-t border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-2">Question Navigation Palette</span>
                      <div className="grid grid-cols-10 gap-1 text-center font-mono text-[10px] font-bold">
                        <span className="p-1 rounded bg-emerald-600 text-white">01</span>
                        <span className="p-1 rounded bg-emerald-600 text-white">02</span>
                        <span className="p-1 rounded bg-emerald-600 text-white">03</span>
                        <span className="p-1 rounded bg-blue-600 text-white ring-2 ring-blue-300">04</span>
                        <span className="p-1 rounded bg-purple-600 text-white">05</span>
                        <span className="p-1 rounded bg-slate-200 text-slate-600">06</span>
                        <span className="p-1 rounded bg-slate-200 text-slate-600">07</span>
                        <span className="p-1 rounded bg-slate-200 text-slate-600">08</span>
                        <span className="p-1 rounded bg-slate-200 text-slate-600">09</span>
                        <span className="p-1 rounded bg-slate-200 text-slate-600">10</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 font-medium">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-600"></span> Answered (3)</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-purple-600"></span> Review (1)</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-slate-300"></span> Unvisited (5)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Role-Based Portals Section */}
      <section id="roles" className="py-16 sm:py-24 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              Role-Specific Access
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Purpose-Built Portals for Every Academic Stakeholder
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Three role-specific dashboards for faculty paper setters, examination department officers, and enrolled students.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Faculty Portal Card */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 flex flex-col justify-between hover:border-blue-300 hover:shadow-lg transition-all group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold mb-6 group-hover:scale-105 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono font-bold text-blue-700 uppercase tracking-wider">
                  Academic Faculty
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1 mb-3">
                  Faculty & Paper Setter Portal
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                  Empowering professors to author questions, compile multi-set exam papers (Set A, B, C), set marks weighting, and submit finalized assessments to the Exam Department.
                </p>

                <ul className="space-y-2 text-xs text-slate-700 mb-8 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Create and edit multiple paper sets</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Syllabus question bank management</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>One-click confidential submission to CoE</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Official printable question paper preview</span>
                  </li>
                </ul>
              </div>

              <Link
                to="/login"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                <span>Faculty Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Exam Dept Card */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 flex flex-col justify-between hover:border-indigo-300 hover:shadow-lg transition-all group relative">
              <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-indigo-600 text-white font-mono text-[10px] font-bold uppercase tracking-wider shadow-xs">
                Administrative Authority
              </div>
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold mb-6 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono font-bold text-indigo-700 uppercase tracking-wider">
                  Examination Cell
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1 mb-3">
                  Controller of Exams (CoE)
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                  Institutional governance for review and moderation of paper sets, publishing live assessments, tracking timetables, and verifying candidate scorecards.
                </p>

                <ul className="space-y-2 text-xs text-slate-700 mb-8 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Approve and publish paper sets</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Institutional examination timetable</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Scorecards and result moderation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Proctoring audit and time tracking</span>
                  </li>
                </ul>
              </div>

              <Link
                to="/login"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                <span>CoE Department Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Student Portal Card */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 flex flex-col justify-between hover:border-emerald-300 hover:shadow-lg transition-all group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mb-6 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700 uppercase tracking-wider">
                  Enrolled Students
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1 mb-3">
                  Student Candidate Portal
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                  Clear, distraction-free testing environment for students to view published exams, take time-synced tests, and access evaluated scorecards with answer breakdown.
                </p>

                <ul className="space-y-2 text-xs text-slate-700 mb-8 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Browse scheduled examinations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Question palette & review markers</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Instant score breakdown and grade cards</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Complete past exam submission archive</span>
                  </li>
                </ul>
              </div>

              <Link
                to="/login"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                <span>Student Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section id="features" className="py-16 sm:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              System Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Engineered for Institutional Reliability
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Built specifically to replace manual paper handling and fragmented assessment workflows with a standardized, tamper-resistant system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs hover:shadow-md transition-shadow"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    {f.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive Examination Workflow */}
      <section id="workflow" className="py-16 sm:py-24 bg-white border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              Standardized Procedure
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              The 5-Stage Examination Lifecycle
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              A transparent, end-to-end operational protocol from initial faculty drafting to final transcript archiving.
            </p>
          </div>

          {/* Workflow Tabs / Steps */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Step Selector Buttons */}
            <div className="lg:col-span-5 space-y-3">
              {workflowSteps.map((w, index) => {
                const isSelected = activeWorkflowStep === index;
                return (
                  <button
                    key={w.step}
                    onClick={() => setActiveWorkflowStep(index)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl font-mono text-sm font-bold flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {w.step}
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {w.title}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block truncate">
                        Actor: {w.actor}
                      </span>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 ml-auto shrink-0 transition-transform ${
                        isSelected ? 'text-blue-600 translate-x-1' : 'text-slate-400'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Step Detail Card */}
            <div className="lg:col-span-7">
              {(() => {
                const active = workflowSteps[activeWorkflowStep];
                const Icon = active.icon;
                return (
                  <div className="bg-gradient-to-br from-[#0d1b2a] via-[#102238] to-[#0b192c] rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden border border-slate-800">
                    <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

                    <div className="flex items-center justify-between mb-6">
                      <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-600/30 text-blue-300 border border-blue-500/30">
                        {active.badge} &middot; Stage {active.step}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Workflow Process
                      </span>
                    </div>

                    <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 mb-6">
                      <Icon className="w-7 h-7" />
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
                      {active.title}
                    </h3>
                    <p className="text-xs text-blue-300 font-bold uppercase tracking-wider mb-4">
                      Responsible Authority: {active.actor}
                    </p>
                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-8">
                      {active.desc}
                    </p>

                    <div className="pt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <span>Standard Operating Procedure (SOP-EX-24)</span>
                      <Link
                        to="/login"
                        className="text-blue-400 font-bold hover:text-blue-300 flex items-center gap-1 transition-colors"
                      >
                        <span>Access Portal</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* Institutional About / Credentials */}
      <section id="about" className="py-16 sm:py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4 text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                Institutional Integrity
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                About the Central Examination Cell
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                The Central Examination Cell at MGM University is responsible for the conduct, coordination, and evaluation of all semester assessments, mid-term examinations, and final degree evaluations across constituent faculties of Engineering, Technology, and Applied Sciences.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 pt-2 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Controller of Examinations: Dr. Sneha Joshi</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Jurisdiction: All Engineering & Tech Departments</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>AICTE & UGC Norms Compliant Infrastructure</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Support: coe@mgmu.ac.in</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 bg-slate-50 rounded-2xl border border-slate-200 p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">MGM University</h4>
                <p className="text-xs text-slate-500 font-mono mt-0.5">Est. Under State Act &middot; NAAC A+</p>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                University Campus: MGM Campus, N-6, CIDCO, Chhatrapati Sambhajinagar, Maharashtra 431003
              </p>
              <Link
                to="/login"
                className="w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                <span>Enter Academic Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trustworthy Footer */}
      <footer className="bg-[#0b192c] text-white pt-14 pb-8 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b border-slate-800 text-xs">
            {/* Brand column */}
            <div className="lg:col-span-2 space-y-4 pr-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    MGM University
                  </h3>
                  <p className="text-xs text-blue-300 font-medium">
                    Central Examination Cell
                  </p>
                </div>
              </div>
              <p className="text-slate-400 leading-relaxed text-xs">
                Demo online examination and timed CBT workflow for faculty paper setters, examination department officers, and enrolled students. Browser monitoring is best-effort and localStorage is not production-grade security.
              </p>
              <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>System Operational &middot; SSL Encrypted Access</span>
              </div>
            </div>

            {/* Navigation links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                System Navigation
              </h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#home" className="hover:text-white transition-colors">Portal Home</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Core Features</a></li>
                <li><a href="#workflow" className="hover:text-white transition-colors">Examination Workflow</a></li>
                <li><a href="#roles" className="hover:text-white transition-colors">Stakeholder Portals</a></li>
                <li><a href="#about" className="hover:text-white transition-colors">About CoE Cell</a></li>
              </ul>
            </div>

            {/* Role Portals */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                Authorized Logins
              </h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link to="/login" className="hover:text-white transition-colors">Faculty Member Portal</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Examination Department (CoE)</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Candidate CBT Portal</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">1-Click Test Login</Link></li>
              </ul>
            </div>

            {/* University Details */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                Contact & Support
              </h4>
              <ul className="space-y-2 text-slate-400">
                <li>MGM University Campus</li>
                <li>Central Examination Division</li>
                <li>Chhatrapati Sambhajinagar, Maharashtra 431003</li>
                <li className="text-blue-300 font-mono">coe@mgmu.ac.in</li>
                <li>Exam Helpline: +91 (0240) 2480-490</li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-3">
            <p>&copy; 2026 MGM University Central Examination Division. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span>Confidentiality Notice</span>
              <span>&middot;</span>
              <span>CBT Academic Guidelines</span>
              <span>&middot;</span>
              <span>UGC Digital Norms</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
