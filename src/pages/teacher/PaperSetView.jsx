import { useNavigate, useParams } from 'react-router-dom';
import { usePapers } from '../../context/PaperContext';

const getStatusBadge = (status) => {
  const statusStyles = {
    Draft: 'bg-gray-100 text-gray-800 border-gray-200',
    Submitted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Approved: 'bg-green-100 text-green-800 border-green-200',
    Published: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  return statusStyles[status] || statusStyles.Draft;
};

const PaperSetView = () => {
  const { setId } = useParams();
  const navigate = useNavigate();
  const { paperSets } = usePapers();
  const paper = paperSets[setId];

  if (!paper) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-red-600">Paper set not found</p>
      </div>
    );
  }

  const totalMarks = paper.questions.reduce((sum, q) => sum + (q.marks || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            View Paper Set - {paper.paperSet}
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
            onClick={() => navigate(`/teacher/question-papers/${setId}/manage`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Manage Questions
          </button>
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
          <h4 className="text-md font-semibold text-gray-900">Questions</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Q.No
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaperSetView;