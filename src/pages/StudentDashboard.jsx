import { Route, Routes, Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  Award,
  Activity,
  ArrowRight,
  Clock,
  HelpCircle,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Sparkles,
  FileText,
  User,
  ExternalLink,
} from 'lucide-react';
import DashboardCard from '../components/DashboardCard';
import DashboardLayout from '../layouts/DashboardLayout';
import { usePapers } from '../context/PaperContext';
import { useAuth } from '../context/AuthContext';
import StudentExam from './student/StudentExam';

const navItems = [
  { name: 'Dashboard', path: '' },
  { name: 'Available Exams', path: 'available-exams' },
  { name: 'My Exams', path: 'my-exams' },
  { name: 'Results & Grades', path: 'results' },
  { name: 'Student Profile', path: 'profile' },
];

const StudentHome = () => {
  const { paperSets, submissions } = usePapers();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Find published exams
  const publishedExams = Object.entries(paperSets).filter(
    ([_, p]) => p.status === 'Published'
  );

  // Student's own submissions
  const studentSubs = submissions.filter(
    (s) => s.studentUsername === user?.username || s.studentUsername === 'student'
  );

  const completedCount = studentSubs.length;
  const latestSub = studentSubs[0];
  const latestResultStr = latestSub
    ? `${latestSub.percentage}% (${latestSub.score}/${latestSub.totalMarks})`
    : 'Not Available';

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-semibold backdrop-blur-xs mb-3 border border-white/15">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span>Undergraduate Candidate Portal</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Welcome, {user?.name || 'Student Candidate'}
          </h2>
          <p className="text-sm text-blue-100/90 leading-relaxed mb-6">
            You have active scheduled college examinations available. Prepare your workstation and enter the proctored test environment when ready.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="available-exams"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm transition-all shadow-md shadow-blue-500/25"
            >
              <BookOpen className="w-4 h-4" />
              <span>Browse Available Exams ({publishedExams.length})</span>
            </Link>
            <Link
              to="results"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-all border border-white/20"
            >
              <Award className="w-4 h-4" />
              <span>View Past Results</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <DashboardCard
          title="Available Exams"
          value={publishedExams.length.toString()}
          description="Ready for testing"
          color="blue"
        />
        <DashboardCard
          title="Completed Exams"
          value={completedCount.toString()}
          description="Submissions evaluated"
          color="green"
        />
        <DashboardCard
          title="Latest Result"
          value={latestResultStr}
          description="Most recent grade"
          color="purple"
        />
        <DashboardCard
          title="Status"
          value="Eligible"
          description="Admit card cleared"
          color="orange"
        />
      </div>

      {/* Featured Active Exam Ready to Take */}
      {publishedExams.length > 0 && (
        <div className="bg-white rounded-2xl border border-blue-200/90 p-6 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Ready to Take Now
                </span>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono text-[11px] font-bold border border-blue-200">
                  {publishedExams[0][1].paperSet}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                {publishedExams[0][1].examName}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Subject: <span className="font-semibold text-slate-700">{publishedExams[0][1].subject}</span> &middot; {publishedExams[0][1].questions.length} Questions &middot; {publishedExams[0][1].duration}
              </p>
            </div>

            <button
              onClick={() => navigate(`exam/${publishedExams[0][0]}`)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/25 transition-all self-start md:self-center"
            >
              <span>Launch Examination</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Recent Activity & Student Exam Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Online CBT Guidelines
              </h4>
              <p className="text-xs text-slate-500">Essential rules before starting</p>
            </div>
          </div>

          <ul className="space-y-2.5 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
              <span>Timer starts immediately upon entering the examination interface.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
              <span>Use the <strong>Question Palette</strong> to navigate directly between questions.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
              <span>Mark questions for review if you wish to revisit them prior to final submission.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
              <span>Unsubmitted tests will automatically submit when the allotted timer expires.</span>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Recent Submissions
              </h4>
              <p className="text-xs text-slate-500">Your test history</p>
            </div>
          </div>

          {studentSubs.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No exams completed yet.</p>
          ) : (
            <div className="space-y-3">
              {studentSubs.slice(0, 3).map((sub) => (
                <div
                  key={sub.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900">{sub.examName}</p>
                    <p className="text-slate-500 text-[11px]">{sub.paperSet} &middot; {new Date(sub.submittedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-700 block">
                      {sub.score} / {sub.totalMarks} ({sub.percentage}%)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {sub.timeSpent || 'Complete'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Available Exams View
const AvailableExams = () => {
  const { paperSets } = usePapers();
  const navigate = useNavigate();

  const publishedExams = Object.entries(paperSets).filter(
    ([_, p]) => p.status === 'Published'
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-slate-900">
          Available Scheduled Examinations
        </h3>
        <p className="text-xs text-slate-500">
          The following examinations are officially published by the Exam Cell and ready for taking
        </p>
      </div>

      {publishedExams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="font-semibold text-slate-700">No examinations published right now</p>
          <p className="text-xs text-slate-400 mt-1">
            Check back shortly or contact the Examination Department.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {publishedExams.map(([key, paper]) => (
            <div
              key={key}
              className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                      {paper.paperSet}
                    </span>
                    <h4 className="text-base font-bold text-slate-900 mt-2">
                      {paper.examName}
                    </h4>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live
                  </span>
                </div>

                <p className="text-xs text-slate-600 mb-5">
                  Subject: <span className="font-semibold text-slate-800">{paper.subject}</span>
                </p>

                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center text-xs mb-6">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Questions</span>
                    <span className="font-bold text-slate-800">{paper.questions?.length || 10}</span>
                  </div>
                  <div className="border-x border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase">Duration</span>
                    <span className="font-bold text-slate-800">{paper.duration}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Marks</span>
                    <span className="font-bold text-slate-800">{paper.totalMarks}M</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate(`/student/exam/${key}`)}
                className="w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <span>Start Examination</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// My Exams View
const MyExams = () => {
  const { submissions } = usePapers();
  const { user } = useAuth();

  const studentSubs = submissions.filter(
    (s) => s.studentUsername === user?.username || s.studentUsername === 'student'
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-slate-900">
          My Completed Examinations
        </h3>
        <p className="text-xs text-slate-500">
          History of all attempted assessment sessions and evaluation transcripts
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Examination & Subject</th>
                <th className="px-6 py-3.5">Set</th>
                <th className="px-6 py-3.5">Score</th>
                <th className="px-6 py-3.5">Percentage</th>
                <th className="px-6 py-3.5">Time Spent</th>
                <th className="px-6 py-3.5 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {studentSubs.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{sub.examName}</div>
                    <div className="text-xs text-slate-500">{sub.subject}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-semibold text-slate-700">
                    {sub.paperSet}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">
                    {sub.score} / {sub.totalMarks}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-800">
                    {sub.percentage}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                    {sub.timeSpent || '15 mins'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      PASSED
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

// Results View
const StudentResults = () => {
  const { submissions } = usePapers();
  const { user } = useAuth();

  const studentSubs = submissions.filter(
    (s) => s.studentUsername === user?.username || s.studentUsername === 'student'
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h3 className="text-lg font-bold text-slate-900">
          Official Academic Transcripts & Scorecards
        </h3>
        <p className="text-xs text-slate-500">
          Detailed performance breakdown by examination unit
        </p>
      </div>

      {studentSubs.map((sub) => {
        const isPass = sub.percentage >= 40;
        return (
          <div
            key={sub.id}
            className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
              <div>
                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  {sub.paperSet} &middot; {sub.subject}
                </span>
                <h4 className="text-xl font-bold text-slate-900 mt-2">
                  {sub.examName}
                </h4>
                <p className="text-xs text-slate-500">
                  Candidate: {sub.studentName} ({sub.studentUsername})
                </p>
              </div>

              <div className="text-right">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black border ${
                    isPass
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  {isPass ? 'PASSED (GRADE A)' : 'FAILED'}
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  Submitted: {new Date(sub.submittedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center text-xs mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Score</span>
                <span className="text-lg font-black text-blue-700">{sub.score} / {sub.totalMarks}</span>
              </div>
              <div className="border-x border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Percentage</span>
                <span className="text-lg font-black text-slate-900">{sub.percentage}%</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Questions</span>
                <span className="text-lg font-black text-slate-800">{sub.totalQuestions}</span>
              </div>
              <div className="border-l border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Time Taken</span>
                <span className="text-lg font-black text-slate-800">{sub.timeSpent || '18m 42s'}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Student Profile View
const StudentProfile = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-6 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center text-2xl font-bold shadow-md">
            {user?.name?.charAt(0) || 'S'}
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">{user?.name}</h3>
            <p className="text-xs text-emerald-600 font-semibold">Undergraduate Engineering Candidate</p>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Roll No: 2026-CS-401 &middot; Enrollment: EN-992014</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 font-medium">Program of Study</span>
            <p className="text-sm font-semibold text-slate-800 mt-1">Bachelor of Technology (B.Tech - CSE)</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 font-medium">Current Semester</span>
            <p className="text-sm font-semibold text-slate-800 mt-1">Semester VI (Academic Session 2026-27)</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 font-medium">Exam Clearance</span>
            <p className="text-sm font-semibold text-emerald-700 mt-1">Admit Card Active & Verified</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 font-medium">Institution</span>
            <p className="text-sm font-semibold text-slate-800 mt-1">Apex University School of Engineering</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StudentDashboard = () => {
  return (
    <Routes>
      {/* Distraction-free Exam View */}
      <Route path="exam/:setId" element={<StudentExam />} />

      {/* Main Layout Views */}
      <Route
        path="*"
        element={
          <DashboardLayout title="Student Examination Portal" navItems={navItems}>
            <Routes>
              <Route path="/" element={<StudentHome />} />
              <Route path="available-exams" element={<AvailableExams />} />
              <Route path="my-exams" element={<MyExams />} />
              <Route path="results" element={<StudentResults />} />
              <Route path="profile" element={<StudentProfile />} />
            </Routes>
          </DashboardLayout>
        }
      />
    </Routes>
  );
};

export default StudentDashboard;