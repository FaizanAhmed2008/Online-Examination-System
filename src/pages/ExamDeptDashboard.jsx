import { useState } from 'react';
import { Route, Routes, Link, Navigate } from 'react-router-dom';
import {
  FileText,
  Calendar,
  Award,
  CheckCircle2,
  ShieldCheck,
  Send,
  ChevronRight,
} from 'lucide-react';
import DashboardCard from '../components/DashboardCard';
import DashboardLayout from '../layouts/DashboardLayout';
import { usePapers } from '../context/PaperContext';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Paper/Toast';

const navItems = [
  { name: 'Dashboard', path: '/examdept' },
  { name: 'Paper Sets', path: '/examdept/paper-sets' },
  { name: 'Examinations', path: '/examdept/examinations' },
  { name: 'Exam Schedule', path: '/examdept/schedule' },
  { name: 'Results & Moderation', path: '/examdept/results' },
  { name: 'Officer Profile', path: '/examdept/profile' },
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
  const { paperSubmissions, scheduledExams, submissions } = usePapers();

  const totalSets = paperSubmissions.length;
  const publishedCount = scheduledExams.filter((exam) => exam.status === 'Published').length;
  const pendingReview = paperSubmissions.filter((paper) => paper.status === 'Submitted');

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
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
            Schedule anonymized submitted paper references, publish exams, and monitor institutional candidate scorecards.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/examdept/paper-sets"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-md shadow-blue-600/25"
            >
              <FileText className="w-4 h-4" />
              <span>Review Paper Sets</span>
            </Link>
            <Link
              to="/examdept/results"
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
            to="/examdept/paper-sets"
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
            {pendingReview.map((paper) => (
              <div
                key={paper.paperId}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {paper.paperId}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      {paper.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {paper.totalQuestions} Questions &middot; {paper.totalMarks} Marks
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <Link to="/examdept/schedule" className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors">
                    <Calendar className="w-3.5 h-3.5" /><span>Schedule</span>
                  </Link>
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
            to="/examdept/schedule"
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
            to="/examdept/results"
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
  const { paperSubmissions } = usePapers();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Anonymized Paper Reference Registry
          </h3>
          <p className="text-xs text-slate-500">
            Only paper reference, question count, total marks, and status are available to this role.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Paper Reference</th>
                <th className="px-6 py-3.5">Question Count</th>
                <th className="px-6 py-3.5">Total Marks</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paperSubmissions.map((paper) => (
                <tr key={paper.paperId} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">
                    <span className="font-mono">{paper.paperId}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-700 font-medium">
                    {paper.totalQuestions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-700 font-medium">{paper.totalMarks}</td>
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
  const { paperSubmissions, scheduledExams } = usePapers();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-slate-900">
          Scheduled Institutional Examinations
        </h3>
        <p className="text-xs text-slate-500">
          Published examinations with anonymized paper references and permitted metadata
        </p>
      </div>

      {scheduledExams.filter((exam) => exam.status === 'Published').length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No examinations have been published.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {scheduledExams.filter((exam) => exam.status === 'Published').map((exam) => {
            const paper = paperSubmissions.find((submission) => submission.paperId === exam.paperId);
            if (!paper) return null;
            return (
              <div key={exam.id} className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-sm font-bold text-slate-900">{paper.paperId}</span>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {exam.status}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-center text-xs">
                  <div><span className="block text-slate-500">Questions</span><strong>{paper.totalQuestions}</strong></div>
                  <div><span className="block text-slate-500">Total Marks</span><strong>{paper.totalMarks}</strong></div>
                  <div><span className="block text-slate-500">Scheduled</span><strong>{new Date(exam.scheduledAt).toLocaleString()}</strong></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
  );
};

// Exam Timetable Schedule
const ExamDeptSchedule = () => {
  const { paperSubmissions, scheduledExams, scheduleExam, publishExam } = usePapers();
  const [paperId, setPaperId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [message, setMessage] = useState('');
  const availablePapers = paperSubmissions.filter((paper) => paper.status === 'Submitted');

  const handleSchedule = (event) => {
    event.preventDefault();
    const exam = scheduleExam(paperId, scheduledAt);
    setMessage(exam ? 'Exam scheduled.' : 'Unable to schedule this paper. Choose an available reference and a valid date and time.');
    if (exam) {
      setPaperId('');
      setScheduledAt('');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-slate-900">
          Institutional Examination Schedule
        </h3>
        <p className="text-xs text-slate-500">
          Select an anonymized paper reference and schedule its examination.
        </p>
      </div>

      <form onSubmit={handleSchedule} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-end">
        <label className="flex-1 text-xs font-semibold text-slate-700">
          Paper Reference
          <select required value={paperId} onChange={(event) => setPaperId(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="">Select a submitted paper</option>
            {availablePapers.map((paper) => <option key={paper.paperId} value={paper.paperId}>{paper.paperId}</option>)}
          </select>
        </label>
        <label className="flex-1 text-xs font-semibold text-slate-700">
          Exam Start
          <input required type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <button type="submit" disabled={!availablePapers.length} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
          Schedule Exam
        </button>
        {message && <p role="status" className="text-xs text-slate-600">{message}</p>}
      </form>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Paper Reference</th>
                <th className="px-6 py-3.5">Questions</th>
                <th className="px-6 py-3.5">Total Marks</th>
                <th className="px-6 py-3.5">Date & Time</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {scheduledExams.map((exam) => {
                const paper = paperSubmissions.find((submission) => submission.paperId === exam.paperId);
                if (!paper) return null;
                return (
                  <tr key={exam.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{paper.paperId}</td>
                    <td className="px-6 py-4">{paper.totalQuestions}</td>
                    <td className="px-6 py-4">{paper.totalMarks}</td>
                    <td className="px-6 py-4 text-xs">{new Date(exam.scheduledAt).toLocaleString()}</td>
                    <td className="px-6 py-4">{exam.status}</td>
                    <td className="px-6 py-4 text-right">
                      {exam.status === 'Scheduled' && (
                        <button type="button" onClick={() => {
                          const published = publishExam(exam.id);
                          setMessage(published ? 'Exam published to students.' : 'Unable to publish this exam.');
                        }} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                          <Send className="h-3 w-3" /> Publish
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {scheduledExams.length === 0 && (
                <tr><td colSpan="6" className="px-6 py-8 text-center text-sm text-slate-500">No exams have been scheduled.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Results & Moderation View
const ExamDeptResults = () => {
  const { submissions, paperSubmissions, scheduledExams } = usePapers();

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
                <th className="px-6 py-3.5">Paper Reference</th>
                <th className="px-6 py-3.5">Score / Max</th>
                <th className="px-6 py-3.5">Percentage</th>
                <th className="px-6 py-3.5">Submitted At</th>
                <th className="px-6 py-3.5 text-right">Result Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {submissions.map((sub) => {
                const isPass = sub.percentage >= 40;
                const exam = scheduledExams.find((scheduledExam) => scheduledExam.id === sub.examId);
                const paper = paperSubmissions.find((submission) =>
                  submission.paperId === (exam?.paperId || sub.paperId)
                ) || paperSubmissions.find((submission) => submission.setId === sub.setId);
                return (
                  <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{sub.studentName}</div>
                      <div className="text-xs text-slate-500 font-mono">User: {sub.studentUsername}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-semibold text-slate-800">{paper?.paperId || 'Unmapped'}</div>
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
            {user?.name?.charAt(0) || 'S'}
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">{user?.name || 'Dr. Sneha Joshi'}</h3>
            <p className="text-xs text-indigo-600 font-semibold">Controller of Examinations (COE) Officer</p>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Officer ID: COE-MH-2024-01</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 font-medium">Administrative Office</span>
            <p className="text-sm font-semibold text-slate-800 mt-1">Central Examination Cell, Administrative Block, MGM University</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 font-medium">Jurisdiction</span>
            <p className="text-sm font-semibold text-slate-800 mt-1">All University Academic Faculties & Examination Centers</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 font-medium">Authorization Level</span>
            <p className="text-sm font-semibold text-emerald-700 mt-1">Root Authority: Paper Approval & Official Result Publication</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 font-medium">Current Term</span>
            <p className="text-sm font-semibold text-slate-800 mt-1">Academic Session 2025-26</p>
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
        <Route path="*" element={<Navigate to="/examdept" replace />} />
      </Routes>
    </DashboardLayout>
  );
};

export default ExamDeptDashboard;