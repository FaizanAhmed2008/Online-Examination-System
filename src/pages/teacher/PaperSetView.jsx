import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Layers,
  Printer,
  CheckCircle2,
  Clock,
  Award,
  HelpCircle,
  FileText,
  ChevronRight,
  ShieldCheck,
  Eye,
  EyeOff,
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

const PaperSetView = () => {
  const { setId } = useParams();
  const navigate = useNavigate();
  const { paperSets } = usePapers();
  const [showAnswerKeys, setShowAnswerKeys] = useState(true);

  const paper = paperSets[setId];

  if (!paper) {
    return (
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-8 text-center max-w-lg mx-auto">
        <p className="text-red-600 font-semibold mb-3">Paper set not found in registry.</p>
        <button
          onClick={() => navigate('/teacher/question-papers')}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold"
        >
          Return to Question Papers
        </button>
      </div>
    );
  }

  const totalMarks = paper.questions.reduce((sum, q) => sum + (q.marks || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* Top Navigation & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link
              to="/teacher/question-papers"
              className="hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Question Papers</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span className="font-semibold text-slate-700">Formal Paper View</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            Question Paper Review — {paper.paperSet}
          </h3>
          <p className="text-xs text-slate-500">
            Official institutional exam format preview
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowAnswerKeys(!showAnswerKeys)}
            className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            {showAnswerKeys ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                <span>Hide Keys</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>Show Keys</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print View</span>
          </button>

          <Link
            to={`/teacher/question-papers/${setId}/manage`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Manage Questions</span>
          </Link>
        </div>
      </div>

      {/* Official Exam Paper Preview Card */}
      <div className="bg-white rounded-3xl border border-slate-300/80 shadow-md p-8 sm:p-12 relative overflow-hidden">
        {/* University Header Section */}
        <div className="text-center border-b-2 border-slate-900 pb-6 mb-8">
          <div className="inline-flex items-center justify-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-600">
              Apex University Examination Division
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
          </div>

          <h2 className="text-2xl font-black uppercase tracking-tight text-slate-950 mb-1">
            {paper.examName}
          </h2>
          <p className="text-sm font-semibold text-slate-700">
            Department of Computer Science & Engineering
          </p>

          <div className="mt-6 pt-4 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="text-left sm:text-center">
              <span className="text-slate-400 block uppercase tracking-wider text-[10px]">Subject</span>
              <span className="font-bold text-slate-900 text-sm">{paper.subject}</span>
            </div>
            <div className="text-left sm:text-center">
              <span className="text-slate-400 block uppercase tracking-wider text-[10px]">Paper Code</span>
              <span className="font-bold text-slate-900 text-sm font-mono">{paper.paperSet}</span>
            </div>
            <div className="text-left sm:text-center">
              <span className="text-slate-400 block uppercase tracking-wider text-[10px]">Time Allowed</span>
              <span className="font-bold text-slate-900 text-sm">{paper.duration}</span>
            </div>
            <div className="text-left sm:text-center">
              <span className="text-slate-400 block uppercase tracking-wider text-[10px]">Maximum Marks</span>
              <span className="font-bold text-slate-900 text-sm">{totalMarks || paper.totalMarks} Marks</span>
            </div>
          </div>
        </div>

        {/* Instructions Box */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-8 text-xs text-slate-600 space-y-1">
          <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
            General Instructions to Candidates:
          </p>
          <p>1. All questions are compulsory. Carefully read each question before selecting your response.</p>
          <p>2. Each multiple-choice question contains four options with only ONE correct response.</p>
          <p>3. Do not refresh or close the proctored browser tab during online examination sessions.</p>
        </div>

        {/* Questions Listing */}
        <div className="space-y-6">
          {paper.questions.map((q, idx) => (
            <div
              key={q.id || idx}
              className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <p className="text-sm font-semibold text-slate-900 leading-relaxed pt-0.5">
                    {q.questionText}
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md shrink-0">
                  [{q.marks} Marks]
                </span>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4 ml-10 text-xs">
                {[
                  { key: 'A', text: q.optionA },
                  { key: 'B', text: q.optionB },
                  { key: 'C', text: q.optionC },
                  { key: 'D', text: q.optionD },
                ].map(({ key, text }) => {
                  const isCorrect = q.correctAnswer === key && showAnswerKeys;
                  return (
                    <div
                      key={key}
                      className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                        isCorrect
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-950 font-semibold'
                          : 'border-slate-200/90 bg-slate-50/60 text-slate-700'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-md text-xs font-bold flex items-center justify-center shrink-0 ${
                          isCorrect
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {key}
                      </span>
                      <span>{text}</span>
                    </div>
                  );
                })}
              </div>

              {showAnswerKeys && (
                <div className="mt-3 ml-10 flex items-center gap-2 text-[11px] text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Correct Answer: Option {q.correctAnswer}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PaperSetView;