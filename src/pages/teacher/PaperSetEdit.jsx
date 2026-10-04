import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
    setToast({ show: true, message: 'Paper set saved successfully' });
    setTimeout(() => {
      navigate('/teacher/question-papers');
    }, 1000);
  };

  if (!paper) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-red-600">Paper set not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast.show && (
        <Toast
          message={toast.message}
          onClose={() => setToast({ show: false, message: '' })}
        />
      )}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Edit Paper Set - {paper.paperSet}
        </h3>
        <p className="text-gray-600">Update paper set details</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exam Name
            </label>
            <input
              type="text"
              name="examName"
              value={formData.examName}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paper Set
            </label>
            <input
              type="text"
              name="paperSet"
              value={formData.paperSet}
              onChange={handleChange}
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration
            </label>
            <input
              type="text"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              required
              placeholder="e.g., 30 Minutes"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Marks
            </label>
            <input
              type="number"
              name="totalMarks"
              value={formData.totalMarks}
              onChange={handleChange}
              min="1"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/teacher/question-papers')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Paper Set
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaperSetEdit;