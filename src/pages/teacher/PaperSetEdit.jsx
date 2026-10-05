import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  BookOpen,
  FileText,
  Clock,
  Award,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { usePapers } from '../../context/PaperContext';
import Toast from '../../components/Paper/Toast';

const PaperSetEdit = () => {
  const { setId } = useParams();
  const navigate = useNavigate();
  const { paperSets, updatePaperSet } = usePapers();
  const [toast, setToast] = useState({ show: false, message: '' });

  const paper = paperSets[setId];

  const [formData, setFormData] = useState({
    examName: paper?.examName || '',
    subject: paper?.subject || '',
    paperSet: paper?.paperSet || '',
    duration: paper?.duration || '',
    totalMarks: paper?.totalMarks || 20,
  });

  useEffect(() => {
    if (paper) {
      setFormData({
        examName: paper.examName,
        subject: paper.subject,
        paperSet: paper.paperSet,
        duration: paper.duration,
        totalMarks: paper.totalMarks,
      });
    }
  }, [paper]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'totalMarks' ? Number(value) : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updatePaperSet(setId, formData);
    setToast({ show: true, message: `Paper Set ${formData.paperSet} metadata updated successfully.` });
    setTimeout(() => {
      navigate('/teacher/question-papers');
    }, 1000);
  };

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

  return (
    <div className="max-w-3xl space-y-6 sm:space-y-8 animate-fade-in">
      {toast.show && (
        <Toast
          message={toast.message}
          onClose={() => setToast({ show: false, message: '' })}
        />
      )}

      {/* Header */}
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
          <span className="font-semibold text-slate-700">Edit Configuration</span>
        </div>
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">
          Edit Paper Set Specifications — {paper.paperSet}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure exam nomenclature, timing constraints, and maximum marks weightage
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Examination Title</span>
            </label>
            <input
              type="text"
              name="examName"
              value={formData.examName}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-sm text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>Subject & Course</span>
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Paper Set Code</span>
              </label>
              <input
                type="text"
                name="paperSet"
                value={formData.paperSet}
                onChange={handleChange}
                disabled
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 font-mono text-sm cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Allotted Duration</span>
              </label>
              <input
                type="text"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                required
                placeholder="e.g., 30 Minutes"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-blue-600" />
                <span>Total Maximum Marks</span>
              </label>
              <input
                type="number"
                name="totalMarks"
                value={formData.totalMarks}
                onChange={handleChange}
                min="1"
                required
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-sm text-slate-900 font-semibold"
              />
            </div>
          </div>

          <div className="flex justify-end items-center gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/teacher/question-papers')}
              className="px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-100 transition-colors text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-600/20 transition-all text-xs flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaperSetEdit;