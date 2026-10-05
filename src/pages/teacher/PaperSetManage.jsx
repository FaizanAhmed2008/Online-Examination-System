import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  PlusCircle,
  Send,
  HelpCircle,
  Award,
  Clock,
  Activity,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { usePapers } from '../../context/PaperContext';
import Modal from '../../components/Paper/Modal';
import QuestionForm from '../../components/Paper/QuestionForm';
import Toast from '../../components/Paper/Toast';

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

const PaperSetManage = () => {
  const { setId } = useParams();
  const navigate = useNavigate();
  const { paperSets, updateQuestions, submitPaperSet } = usePapers();
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [showConfirm, setShowConfirm] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState(null);

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

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setShowModal(true);
  };

  const handleEditQuestion = (question, idx) => {
    setEditingQuestion({ ...question, index: idx });
    setShowModal(true);
  };

  const handleDeleteQuestion = (idx) => {
    const newQuestions = paper.questions.filter((_, i) => i !== idx);
    updateQuestions(setId, newQuestions);
    setDeletingIndex(null);
    setToast({ show: true, message: `Question ${idx + 1} deleted successfully.`, type: 'success' });
  };

  const handleSaveQuestion = (formData) => {
    let newQuestions = [...paper.questions];
    if (editingQuestion !== null && editingQuestion.index !== undefined) {
      newQuestions[editingQuestion.index] = {
        ...newQuestions[editingQuestion.index],
        ...formData,
      };
      setToast({ show: true, message: 'Question updated successfully.', type: 'success' });
    } else {
      const maxId = Math.max(0, ...newQuestions.map((q) => q.id || 0));
      newQuestions.push({ id: maxId + 1, ...formData });
      setToast({ show: true, message: 'New question added successfully.', type: 'success' });
    }
    updateQuestions(setId, newQuestions);
    setShowModal(false);
    setEditingQuestion(null);
  };

  const handleSubmitToDept = () => {
    submitPaperSet(setId);
    setShowConfirm(false);
    setToast({
      show: true,
      message: `Paper Set ${paper.paperSet.replace('Set ', '')} submitted successfully to Exam Department.`,
      type: 'success',
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: 'success' })}
        />
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            <span className="font-semibold text-slate-700">{paper.paperSet}</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            Author Questions — {paper.paperSet}
          </h3>
          <p className="text-xs text-slate-500">
            {paper.examName} &middot; Subject: <span className="font-semibold text-slate-700">{paper.subject}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => navigate('/teacher/question-papers')}
            className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <button
            onClick={handleAddQuestion}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Question</span>
          </button>

          {paper.status === 'Draft' && (
            <button
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit to Exam Dept</span>
            </button>
          )}

          {paper.status === 'Submitted' && (
            <span className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Submitted for Review</span>
            </span>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Questions</span>
            <HelpCircle className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">
            {paper.questions.length}
          </p>
          <span className="text-[11px] text-slate-500">Configured in this set</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Aggregate Marks</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">
            {totalMarks || paper.totalMarks}
          </p>
          <span className="text-[11px] text-slate-500">Max exam marks: {paper.totalMarks}</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Duration</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">
            {paper.duration}
          </p>
          <span className="text-[11px] text-slate-500">Standard CBT time window</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Status</span>
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                paper.status
              )}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70"></span>
              {paper.status}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {paper.status === 'Draft' ? 'Editable by author' : 'Locked for moderation'}
          </span>
        </div>
      </div>

      {/* Questions Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Exam Questions ({paper.questions.length})
            </h4>
            <p className="text-xs text-slate-500">
              Review multiple-choice options, correct keys, and marks weightage
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-200">
            Total: {totalMarks} Marks
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 w-16">No.</th>
                <th className="px-5 py-3.5 min-w-[260px]">Question Statement</th>
                <th className="px-5 py-3.5 min-w-[280px]">Options</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Correct Key</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Marks</th>
                <th className="px-5 py-3.5 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paper.questions.map((q, idx) => (
                <tr key={q.id || idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-4 whitespace-nowrap font-bold text-slate-900 font-mono text-xs">
                    Q{idx + 1}
                  </td>
                  <td className="px-5 py-4 text-xs font-semibold text-slate-800 leading-relaxed">
                    {q.questionText}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-600 space-y-1">
                    <div className="grid grid-cols-2 gap-1.5">
                      <span className={`px-2 py-0.5 rounded border text-[11px] ${q.correctAnswer === 'A' ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold' : 'bg-slate-50 border-slate-200'}`}>
                        <strong>A:</strong> {q.optionA}
                      </span>
                      <span className={`px-2 py-0.5 rounded border text-[11px] ${q.correctAnswer === 'B' ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold' : 'bg-slate-50 border-slate-200'}`}>
                        <strong>B:</strong> {q.optionB}
                      </span>
                      <span className={`px-2 py-0.5 rounded border text-[11px] ${q.correctAnswer === 'C' ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold' : 'bg-slate-50 border-slate-200'}`}>
                        <strong>C:</strong> {q.optionC}
                      </span>
                      <span className={`px-2 py-0.5 rounded border text-[11px] ${q.correctAnswer === 'D' ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold' : 'bg-slate-50 border-slate-200'}`}>
                        <strong>D:</strong> {q.optionD}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Option {q.correctAnswer}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap font-bold text-slate-900 text-xs">
                    {q.marks} Marks
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-right space-x-1.5">
                    <button
                      onClick={() => handleEditQuestion(q, idx)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                      title="Edit Question"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(idx)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                      title="Delete Question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Add Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingQuestion ? `Edit Question — ${paper.paperSet}` : `Add New Question — ${paper.paperSet}`}
      >
        <QuestionForm
          question={editingQuestion}
          onSave={handleSaveQuestion}
          onCancel={() => setShowModal(false)}
        />
      </Modal>

      {/* Submission Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-md w-full animate-modal-pop">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Submit to Examination Department?
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              You are about to submit <strong>{paper.paperSet}</strong> with <strong>{paper.questions.length} questions</strong> ({totalMarks} marks) to the Exam Cell. Once submitted, the paper set status changes to <em>Submitted</em> and is locked for departmental moderation.
            </p>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 mb-6 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>Ensure all answer keys and marks weightage have been cross-verified.</span>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitToDept}
                className="px-5 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors text-xs font-semibold shadow-xs"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaperSetManage;