import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  Award,
  HelpCircle,
  Eye,
  Edit3,
  Layers,
  CheckCircle2,
  Filter,
  Search,
} from 'lucide-react';
import { usePapers } from '../../context/PaperContext';

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

const QuestionPapers = () => {
  const { paperSets } = usePapers();
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSets = Object.entries(paperSets).filter(([key, paper]) => {
    const matchesFilter = filterStatus === 'ALL' || paper.status === filterStatus;
    const matchesSearch =
      searchTerm === '' ||
      paper.paperSet.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paper.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paper.examName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header and Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            Assigned Question Paper Sets
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Author and configure standardized paper sets for Software Engineering internal assessments
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search paper sets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white w-48"
            />
          </div>

          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {['ALL', 'Draft', 'Submitted', 'Published'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  filterStatus === status
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status === 'ALL' ? 'All' : status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Paper Sets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSets.map(([key, paper]) => {
          const totalMarks =
            paper.questions?.reduce((sum, q) => sum + (q.marks || 0), 0) ||
            paper.totalMarks;

          return (
            <div
              key={key}
              className="group bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-lg hover:border-blue-300 transition-all duration-200 p-6 flex flex-col justify-between overflow-hidden relative"
            >
              {/* Top Accent bar */}
              <div
                className={`absolute top-0 left-0 right-0 h-1.5 ${
                  paper.status === 'Published'
                    ? 'bg-blue-600'
                    : paper.status === 'Submitted'
                    ? 'bg-amber-500'
                    : 'bg-slate-400'
                }`}
              />

              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      Code: {key}
                    </span>
                    <h4 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1.5">
                      {paper.paperSet}
                    </h4>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                      paper.status
                    )}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70"></span>
                    {paper.status}
                  </span>
                </div>

                <p className="text-xs font-medium text-slate-700 mb-1">
                  {paper.examName}
                </p>
                <p className="text-xs text-slate-500 mb-5">
                  Subject: <span className="font-semibold text-slate-700">{paper.subject}</span>
                </p>

                {/* Key Metrics Chips */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-center mb-6">
                  <div>
                    <div className="flex items-center justify-center text-slate-400 mb-1">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      {paper.questions?.length || 0}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                      Questions
                    </p>
                  </div>

                  <div className="border-x border-slate-200">
                    <div className="flex items-center justify-center text-slate-400 mb-1">
                      <Award className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      {totalMarks}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                      Marks
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-center text-slate-400 mb-1">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      {paper.duration?.replace(' Minutes', 'm') || '30m'}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                      Duration
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <Link
                  to={`${key}/manage`}
                  className="w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Manage Questions ({paper.questions?.length || 0})</span>
                </Link>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to={`${key}/view`}
                    className="inline-flex justify-center items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>View Paper</span>
                  </Link>

                  <Link
                    to={`${key}/edit`}
                    className="inline-flex justify-center items-center gap-1.5 px-3 py-2 border border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Edit Info</span>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionPapers;