import { useState } from 'react';
import { Link } from 'react-router-dom';
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

const QuestionPapers = () => {
  const { paperSets } = usePapers();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Question Papers
        </h3>
        <p className="text-gray-600">
          Manage paper sets A, B, and C for Software Engineering
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(paperSets).map(([key, paper]) => (
          <div
            key={key}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xl font-semibold text-gray-900">
                {paper.paperSet}
              </h4>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(
                  paper.status
                )}`}
              >
                {paper.status}
              </span>
            </div>
            <div className="space-y-2 mb-6">
              <p className="text-sm text-gray-600">{paper.subject}</p>
              <p className="text-sm text-gray-600">
                {paper.questions.length} Questions
              </p>
            </div>
            <div className="space-y-2">
              <Link
                to={`${key}/view`}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                View
              </Link>
              <Link
                to={`${key}/edit`}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Edit
              </Link>
              <Link
                to={`${key}/manage`}
                className="w-full inline-flex justify-center items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Manage Questions
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuestionPapers;