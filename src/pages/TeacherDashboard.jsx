import { useState } from 'react';
import { Route, Routes, Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  HelpCircle,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  PlusCircle,
  Eye,
  Edit3,
  BookOpen,
  User,
  ShieldCheck,
  Search,
  Filter,
  Sparkles,
} from 'lucide-react';
import DashboardCard from '../components/DashboardCard';
import DashboardLayout from '../layouts/DashboardLayout';
import { usePapers } from '../context/PaperContext';
import { useAuth } from '../context/AuthContext';
import QuestionPapers from './teacher/QuestionPapers';
import PaperSetEdit from './teacher/PaperSetEdit';
import PaperSetView from './teacher/PaperSetView';
import PaperSetManage from './teacher/PaperSetManage';

const navItems = [
  { name: 'Dashboard', path: '' },
  { name: 'Question Papers', path: 'question-papers' },
  { name: 'Questions Bank', path: 'questions' },
  { name: 'Faculty Profile', path: 'profile' },
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

const TeacherHome = () => {
  const { paperSets } = usePapers();
  const navigate = useNavigate();
  const { user } = useAuth();

  const totalQuestions = Object.values(paperSets).reduce(
    (sum, p) => sum + (p.questions?.length || 0),
    0
  );
  const submittedCount = Object.values(paperSets).filter(
    (p) => p.status === 'Submitted' || p.status === 'Published'
  ).length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-semibold backdrop-blur-xs mb-3 border border-white/15">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span>Academic Faculty Portal</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Welcome back, {user?.name || 'Professor'}
          </h2>
          <p className="text-sm text-blue-100/90 leading-relaxed mb-6">
            Manage your question papers for Software Engineering (SE-302). Create questions, review sets, and submit finalized assessments to the Exam Department.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="question-papers"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm transition-all shadow-md shadow-blue-500/25"
            >
              <FileText className="w-4 h-4" />
              <span>Manage Paper Sets</span>
            </Link>
            <Link
              to="questions"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-all border border-white/20"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Browse Question Bank</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <DashboardCard
          title="Total Paper Sets"
          value={Object.keys(paperSets).length.toString()}
          description="Assigned examination sets"
          color="blue"
        />
        <DashboardCard
          title="Total Questions"
          value={totalQuestions.toString()}
          description="Authored across all sets"
          color="purple"
        />
        <DashboardCard
          title="Published Papers"
          value={submittedCount.toString()}
          description="Active & submitted sets"
          color="green"
        />
        <DashboardCard
          title="Status"
          value="Active Faculty"
          description="Authorized paper setter"
          color="orange"
        />
      </div>

      {/* Paper Sets Overview Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Assigned Paper Sets Overview
            </h3>
            <p className="text-xs text-slate-500">
              Department of Computer Science & Engineering
            </p>
          </div>
          <Link
            to="question-papers"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <span>View All Papers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Set Identifier</th>
                <th className="px-6 py-3.5">Exam Name & Subject</th>
                <th className="px-6 py-3.5">Questions</th>
                <th className="px-6 py-3.5">Duration</th>
                <th className="px-6 py-3.5">Total Marks</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {Object.entries(paperSets).map(([key, paper]) => (
                <tr key={key} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-slate-900">
                      {paper.paperSet}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">
                      {paper.examName}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      {paper.subject}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                      <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                      {paper.questions?.length || 0} Questions
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                    {paper.duration}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">
                    {paper.totalMarks} Marks
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
                    <Link
                      to={`question-papers/${key}/manage`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Manage</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guidelines & Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Paper Setting Guidelines
              </h4>
              <p className="text-xs text-slate-500">
                Academic Regulations 2026-27
              </p>
            </div>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
              <span>Each set must contain balanced difficulty levels (40% Easy, 40% Medium, 20% Hard).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
              <span>Ensure all 4 options are distinct, unambiguous, and plausible.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
              <span>Total aggregate marks should equal precisely the defined total examination marks.</span>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Submission Workflow
              </h4>
              <p className="text-xs text-slate-500">
                Departmental Approval Pipeline
              </p>
            </div>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">1</span>
              <span className="text-slate-700">Author questions in <strong>Draft</strong> status and verify answer keys.</span>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0">2</span>
              <span className="text-slate-700">Submit set to <strong>Exam Department</strong> for formal moderation.</span>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">3</span>
              <span className="text-slate-700">Exam Department approves and <strong>Publishes</strong> to scheduled student portals.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Rich Question Bank Component instead of plain placeholder
const QuestionBankView = () => {
  const { paperSets } = usePapers();
  const [selectedSet, setSelectedSet] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const allQuestions = [];
  Object.entries(paperSets).forEach(([key, paper]) => {
    paper.questions.forEach((q, idx) => {
      allQuestions.push({
        ...q,
        setKey: key,
        setName: paper.paperSet,
        indexInSet: idx + 1,
      });
    });
  });

  const filtered = allQuestions.filter((q) => {
    const matchesSet = selectedSet === 'ALL' || q.setKey === selectedSet;
    const matchesQuery =
      searchQuery === '' ||
      q.questionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.optionA.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.optionB.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSet && matchesQuery;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Institutional Question Bank
          </h3>
          <p className="text-xs text-slate-500">
            Browse and search all verified MCQs across Paper Sets A, B, and C
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none bg-white w-56"
            />
          </div>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {['ALL', 'SET_A', 'SET_B', 'SET_C'].map((k) => (
              <button
                key={k}
                onClick={() => setSelectedSet(k)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedSet === k
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {k === 'ALL' ? 'All Sets' : k.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((q, idx) => (
          <div
            key={`${q.setKey}-${q.id || idx}`}
            className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-blue-300 transition-all"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                  {q.setName} &middot; Q{q.indexInSet}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {q.marks} Marks
                </span>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Key: Option {q.correctAnswer}
              </span>
            </div>

            <p className="text-sm font-semibold text-slate-800 mb-4 leading-relaxed">
              {q.questionText}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { k: 'A', text: q.optionA },
                { k: 'B', text: q.optionB },
                { k: 'C', text: q.optionC },
                { k: 'D', text: q.optionD },
              ].map(({ k, text }) => {
                const isCorrect = q.correctAnswer === k;
                return (
                  <div
                    key={k}
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
                      isCorrect
                        ? 'border-emerald-300 bg-emerald-50/60 text-emerald-900 font-semibold'
                        : 'border-slate-200/70 bg-slate-50/50 text-slate-700'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-md text-xs font-bold flex items-center justify-center shrink-0 ${
                        isCorrect
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {k}
                    </span>
                    <span>{text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Faculty Profile View
const FacultyProfile = () => {
  const { user } = useAuth();
  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-6 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-2xl font-bold shadow-md">
            {user?.name?.charAt(0) || 'F'}
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">{user?.name}</h3>
            <p className="text-xs text-blue-600 font-semibold">Associate Professor & Paper Setter</p>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Faculty ID: EMP-2024-884</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 font-medium">Department</span>
            <p className="text-sm font-semibold text-slate-800 mt-1">Computer Science & Engineering</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 font-medium">Assigned Subject</span>
            <p className="text-sm font-semibold text-slate-800 mt-1">Software Engineering (SE-302)</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 font-medium">Clearance Level</span>
            <p className="text-sm font-semibold text-emerald-700 mt-1">Confidential Examiner Level 2</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 font-medium">Term</span>
            <p className="text-sm font-semibold text-slate-800 mt-1">Academic Session 2026-27</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const TeacherDashboard = () => {
  return (
    <DashboardLayout title="Faculty Examination Portal" navItems={navItems}>
      <Routes>
        <Route path="/" element={<TeacherHome />} />
        <Route path="question-papers" element={<QuestionPapers />} />
        <Route path="question-papers/:setId/edit" element={<PaperSetEdit />} />
        <Route path="question-papers/:setId/view" element={<PaperSetView />} />
        <Route path="question-papers/:setId/manage" element={<PaperSetManage />} />
        <Route path="questions" element={<QuestionBankView />} />
        <Route path="profile" element={<FacultyProfile />} />
      </Routes>
    </DashboardLayout>
  );
};

export default TeacherDashboard;