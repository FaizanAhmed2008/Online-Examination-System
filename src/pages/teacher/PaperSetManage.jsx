import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePapers } from '../../context/PaperContext';
import Modal from '../../components/Paper/Modal';
import QuestionForm from '../../components/Paper/QuestionForm';
import Toast from '../../components/Paper/Toast';

const getStatusBadge = (status) => {
  const statusStyles = {
    Draft: 'bg-gray-100 text-gray-800 border-gray-200',
    Submitted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Approved: 'bg-green-100 text-green-800 border-green-200',
    Published: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  return statusStyles[status] || statusStyles.Draft;
};

const PaperSetManage = () => {
  const { setId } = useParams();
  const navigate = useNavigate();
  const { paperSets, updateQuestions, submitPaperSet } = usePapers();
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [showConfirm, setShowConfirm] = useState(false);

  const paper = paperSets[setId];

  if (!paper) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-red-600">Paper set not found</p>
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
    setToast({ show: true, message: 'Question deleted successfully' });
  };

  const handleSaveQuestion = (formData) => {
    let newQuestions = [...paper.questions];
    if (editingQuestion !== null && editingQuestion.index !== undefined) {
      newQuestions[editingQuestion.index] = {
        ...newQuestions[editingQuestion.index],
        ...formData,
      };
      setToast({ show: true, message: 'Question updated successfully' });
    } else {
      const maxId = Math.max(0, ...newQuestions.map((q) => q.id || 0));
      newQuestions.push({ id: maxId + 1, ...formData });
      setToast({ show: true, message: 'Question added successfully' });
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
    });
  };

  return (
    <div className="space-y-6">
      {toast.show && (
        <Toast
          message={toast.message}
          onClose={() => setToast({ show: false, message: '' })}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Manage Questions - {paper.paperSet}
          </h3>
          <p className="text-gray-600">{paper.examName}</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/teacher/question-papers')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleAddQuestion}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Add Question
          </button>
          {paper.status === 'Draft' && (
            <button
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Submit to Exam Department
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Total Questions</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {paper.questions.length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Total Marks</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {totalMarks || paper.totalMarks}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Duration</p>
          <p className="text-lg font-semibold text-gray-900 mt-2">
            {paper.duration}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Status</p>
          <p className="mt-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(
                paper.status
              )}`}
            >
              {paper.status}
            </span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-md font-semibold text-gray-900">Question List</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Question No.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Question
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Options
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Correct Answer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paper.questions.map((q, idx) => (
                <tr key={q.id || idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Q{idx + 1}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                    {q.questionText}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div>A. {q.optionA}</div>
                    <div>B. {q.optionB}</div>
                    <div>C. {q.optionC}</div>
                    <div>D. {q.optionD}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Correct: {q.correctAnswer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {q.marks}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEditQuestion(q, idx)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(idx)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingQuestion ? 'Edit Question' : 'Add Question'}
      >
        <QuestionForm
          question={editingQuestion}
          onSave={handleSaveQuestion}
          onCancel={() => setShowModal(false)}
        />
      </Modal>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Submission
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to submit this paper set to the Exam Department?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitToDept}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaperSetManage;