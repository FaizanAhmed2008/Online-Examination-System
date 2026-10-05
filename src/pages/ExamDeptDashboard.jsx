import { useState } from 'react';
import { Route, Routes, Link } from 'react-router-dom';
import {
  FileText,
  BookOpen,
  Calendar,
  Award,
  Users,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Send,
  AlertCircle,
  Eye,
  Filter,
  Check,
  ChevronRight,
  TrendingUp,
  Layers,
  Sparkles,
} from 'lucide-react';
import DashboardCard from '../components/DashboardCard';
import DashboardLayout from '../layouts/DashboardLayout';
import { usePapers } from '../context/PaperContext';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Paper/Toast';

const navItems = [
  { name: 'Dashboard', path: '' },
  { name: 'Paper Sets', path: 'paper-sets' },
  { name: 'Examinations', path: 'examinations' },
  { name: 'Exam Schedule', path: 'schedule' },
  { name: 'Results & Moderation', path: 'results' },
  { name: 'Officer Profile', path: 'profile' },
];

const getStatusBadge = (status) => {
  switch (status) {
    case 'Published':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Approved':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Submitted':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Draft':
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const ExamDeptHome = () => {
  const { paperSets, submissions, publishPaperSet, approvePaperSet } = usePapers();
  const { user } = useAuth();
  const [toast, setToast] = useState({ show: false, message: '' });

  const totalSets = Object.keys(paperSets).length;
  const publishedCount = Object.values(paperSets).filter((p) => p.status === 'Published').length;
  const pendingReview = Object.entries(paperSets).filter(([_, p]) => p.status === 'Submitted');

  const handleQuickPublish = (key, name) => {
    publishPaperSet(key);
    setToast({
      show: true,
      message: `${name} has been approved and published to all eligible student portals!`,
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {toast.show && (
        <Toast
          message={toast.message}
          onClose={() => setToast({ show: false, message: '' })}
        />
      )}

      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-semibold backdrop-blur-xs mb-3 border border-white/15">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
            <span>Controller of Examinations Authority</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Examination Cell Administration
          </h2>
          <p className="text-sm text-indigo-100/90 leading-relaxed mb-6">
            Review faculty submitted question paper sets, approve confidential sets, publish active examinations, and monitor institutional candidate scorecards.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="paper-sets"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-md shadow-blue-600/25"
            >
              <FileText className="w-4 h-4" />
              <span>Review Paper Sets</span>
            </Link>
            <Link
              to="results"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-all border border-white/20"
            >
              <Award className="w-4 h-4" />
              <span>Assessment Results</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <DashboardCard
          title="Available Paper Sets"
          value={totalSets.toString()}
          description="In institutional vault"
          color="blue"
        />
        <DashboardCard
          title="Published Exams"
          value={publishedCount.toString()}
          description="Live on student portals"
          color="green"
        />
        <DashboardCard
          title="Students"
          value="120"
          description="Enrolled candidates"
          color="purple"
        />
        <DashboardCard
          title="Status"
          value="Active Session"
          description="Fall Semester 2026"
          color="orange"
        />
      </div>

      {/* Pending Faculty Submissions Queue */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Faculty Moderation Queue
              </h3>
              {pendingReview.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  {pendingReview.length} Pending
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Submitted question papers awaiting formal clearance and publication
            </p>
          </div>
          <Link
            to="paper-sets"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>All Sets</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {pendingReview.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No pending faculty submissions</p>
            <p className="text-xs text-slate-400 mt-0.5">All received paper sets have been approved or published.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingReview.map(([key, paper]) => (
              <div
                key={key}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-slate-900 text-sm">
                      {paper.paperSet}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      ({paper.subject})
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Awaiting Moderation
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {paper.examName} &middot; {paper.questions.length} Questions &middot; {paper.totalMarks} Marks
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => handleQuickPublish(key, paper.paperSet)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve & Publish</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Operational Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Current Schedule</h4>
              <p className="text-xs text-slate-500">Internal Assessment 1</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Software Engineering examination active for all 3rd Year CSE student cohorts.
          </p>
          <Link
            to="schedule"
            className="mt-3 inline-flex items-center text-xs font-semibold text-blue-600 hover:underline gap-1"
          >
            <span>View Timetable</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Candidate Results</h4>
              <p className="text-xs text-slate-500">{submissions.length} Submissions Logged</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Automated grading pipeline calculated real-time passing rate at 94.2%.
          </p>
          <Link
            to="results"
            className="mt-3 inline-flex items-center text-xs font-semibold text-emerald-600 hover:underline gap-1"
          >
            <span>Moderate Results</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Proctoring Status</h4>
              <p className="text-xs text-slate-500">AI Integrity Shield</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            All active test sessions monitored with tab-focus tracking and time-fenced questions.
          </p>
          <span className="mt-3 inline-flex items-center text-xs font-semibold text-indigo-600 gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>All systems nominal</span>
          </span>
        </div>
      </div>
    </div>
  );
};

// Paper Sets View for Exam Dept
const ExamDeptPaperSets = () => {
  const { paperSets, publishPaperSet, approvePaperSet } = usePapers();
  const [toast, setToast] = useState({ show: false, message: '' });

  const handlePublish = (key, name) => {
    publishPaperSet(key);
    setToast({ show: true, message: `${name} has been published successfully!` });
  };

  const handleApprove = (key, name) => {
    approvePaperSet(key);
    setToast({ show: true, message: `${name} marked as Approved.` });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {toast.show && (
        <Toast
          message={toast.message}
          onClose={() => setToast({ show: false, message: '' })}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Institutional Paper Set Registry
          </h3>
          <p className="text-xs text-slate-500">
            Review status, approve question sets, and publish examinations to student portals
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Set Code</th>
                <th className="px-6 py-3.5">Exam Name & Subject</th>
                <th className="px-6 py-3.5">Questions</th>
                <th className="px-6 py-3.5">Duration</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Administrative Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {Object.entries(paperSets).map(([key, paper]) => (
                <tr key={key} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">
                    {paper.paperSet}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{paper.examName}</div>
                    <div className="text-xs text-slate-500 font-mono">{paper.subject}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-700 font-medium">
                    {paper.questions?.length || 0} Questions ({paper.totalMarks} Marks)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                    {paper.duration}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                        paper.status
                      )}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70"></span>
                      {paper.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                    {paper.status === 'Submitted' && (
                      <button
                        onClick={() => handlePublish(key, paper.paperSet)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        <span>Approve & Publish</span>
                      </button>
                    )}
                    {paper.status === 'Approved' && (
                      <button
                        onClick={() => handlePublish(key, paper.paperSet)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                      >
                        <Send className="w-3 h-3" />
                        <span>Publish to Portal</span>
                      </button>
                    )}
                    {paper.status === 'Published' && (
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                        Live on Portal
                      </span>
                    )}
                    {paper.status === 'Draft' && (
                      <span className="text-xs font-medium text-slate-400 italic">
                        Authoring in Progress
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Examinations List
const ExamDeptExaminations = () => {
  const { paperSets } = usePapers();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-slate-900">
          Scheduled Institutional Examinations
        </h3>
        <p className="text-xs text-slate-500">
          Active session computer-based test configurations and session parameters
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                EXAM-SE-2026
              </span>
              <h4 className="text-base font-bold text-slate-900 mt-2">
                Software Engineering Internal Examination
              </h4>
              <p className="text-xs text-slate-500">Department of Computer Science & Engineering</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Active Session
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center text-xs mb-4">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Paper Set</span>
              <span className="font-bold text-slate-800">Set A / B</span>
            </div>
            <div className="border-x border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase">Registered</span>
              <span className="font-bold text-slate-800">120 Students</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Duration</span>
              <span className="font-bold text-slate-800">30 Mins</span>
            </div>
          </div>

          <div className="text-xs text-slate-600 flex items-center justify-between border-t border-slate-100 pt-3">
            <span>Proctoring: <strong>AI Auto-Invigilation</strong></span>
            <span className="text-emerald-700 font-semibold">Ready for Taking</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs opacity-85">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                EXAM-DS-2026
              </span>
              <h4 className="text-base font-bold text-slate-900 mt-2">
                Data Structures & Algorithms Final
              </h4>
              <p className="text-xs text-slate-500">Department of Computer Science & Engineering</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Upcoming
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center text-xs mb-4">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Paper Set</span>
              <span className="font-bold text-slate-800">TBD</span>
            </div>
            <div className="border-x border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase">Registered</span>
              <span className="font-bold text-slate-800">145 Students</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Duration</span>
              <span className="font-bold text-slate-800">45 Mins</span>
            </div>
          </div>

          <div className="text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-3">
            <span>Scheduled: <strong>Next Week</strong></span>
            <span>Registration Open</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Exam Timetable Schedule
const ExamDeptSchedule = () => {
  const scheduleData = [
    {
      course: 'Software Engineering (SE-302)',
      date: 'Today / Ongoing',
      timeSlot: '10:00 AM - 12:00 PM',
      mode: 'Online CBT Portal',
      invigilator: 'Dr. A. Sharma / Automated AI',
      status: 'Live',
    },
    {
      course: 'Database Management Systems (CS-304)',
      date: 'Tomorrow',
      timeSlot: '02:00 PM - 03:30 PM',
      mode: 'Exam Lab Block 3',
      invigilator: 'Prof. R. Mehta',
      status: 'Scheduled',
    },
    {
      course: 'Computer Networks (CS-306)',
      date: 'In 3 Days',
      timeSlot: '10:00 AM - 11:30 AM',
      mode: 'Online CBT Portal',
      invigilator: 'Dr. S. Nair',
      status: 'Scheduled',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-slate-900">
          Institutional Examination Timetable
        </h3>
        <p className="text-xs text-slate-500">
          Mid-term and internal assessment schedule for undergraduate engineering
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Course & Code</th>
                <th className="px-6 py-3.5">Date & Time Slot</th>
                <th className="px-6 py-3.5">Venue / Mode</th>
                <th className="px-6 py-3.5">Invigilator</th>
                <th className="px-6 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {scheduleData.map((s, i) => (
                <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900">
                    {s.course}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-700">
                    <div className="font-semibold">{s.date}</div>
                    <div className="text-slate-500 font-mono">{s.timeSlot}</div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600">
                    {s.mode}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-700">
                    {s.invigilator}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        s.status === 'Live'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Results & Moderation View
const ExamDeptResults = () => {
  const { submissions } = usePapers();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Student Assessment Scorecards & Moderation
          </h3>
          <p className="text-xs text-slate-500">
            Real-time evaluated scores, passing percentages, and verification records
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Candidate</th>
                <th className="px-6 py-3.5">Examination & Set</th>
                <th className="px-6 py-3.5">Score / Max</th>
                <th className="px-6 py-3.5">Percentage</th>
                <th className="px-6 py-3.5">Submitted At</th>
                <th className="px-6 py-3.5 text-right">Result Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {submissions.map((sub) => {
                const isPass = sub.percentage >= 40;
                return (
                  <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{sub.studentName}</div>
                      <div className="text-xs text-slate-500 font-mono">User: {sub.studentUsername}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{sub.examName}</div>
                      <div className="text-xs text-slate-500 font-mono">{sub.paperSet} &middot; {sub.subject}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">
                      {sub.score} / {sub.totalMarks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-xs">{sub.percentage}%</span>
                        <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${isPass ? 'bg-emerald-500' : 'bg-red-500'}`}
                            style={{ width: `${sub.percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                      {new Date(sub.submittedAt).toLocaleDateString()} &middot; {sub.timeSpent || 'Complete'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                          isPass
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {isPass ? 'PASSED (A)' : 'NEEDS RE-EVAL'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Exam Department Officer Profile
const ExamDeptProfile = () => {
  const { user } = useAuth();
  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-6 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center text-2xl font-bold shadow-md">
            {user?.name?.charAt(0) || 'E'}
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">{user?.name}</h3>
            <p className="text-xs text-indigo-600 font-semibold">Controller of Examinations (COE) Officer</p>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Cell ID: EXAM-DEPT-OFFICE-01</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 font-medium">Administrative Office</span>
            <p className="text-sm font-semibold text-slate-800 mt-1">Central Examination Cell, Administrative Block</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 font-medium">Jurisdiction</span>
            <p className="text-sm font-semibold text-slate-800 mt-1">All University Academic Faculties & Centers</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 font-medium">Authorization Level</span>
            <p className="text-sm font-semibold text-emerald-700 mt-1">Root Clearance: Paper Approval & Results Publication</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 font-medium">Current Term</span>
            <p className="text-sm font-semibold text-slate-800 mt-1">Academic Session 2026-27</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ExamDeptDashboard = () => {
  return (
    <DashboardLayout title="Examination Department Portal" navItems={navItems}>
      <Routes>
        <Route path="/" element={<ExamDeptHome />} />
        <Route path="paper-sets" element={<ExamDeptPaperSets />} />
        <Route path="examinations" element={<ExamDeptExaminations />} />
        <Route path="schedule" element={<ExamDeptSchedule />} />
        <Route path="results" element={<ExamDeptResults />} />
        <Route path="profile" element={<ExamDeptProfile />} />
      </Routes>
    </DashboardLayout>
  );
};

export default ExamDeptDashboard;