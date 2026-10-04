import { Route, Routes } from 'react-router-dom';
import DashboardCard from '../components/DashboardCard';
import DashboardLayout from '../layouts/DashboardLayout';
import { PaperProvider, usePapers } from '../context/PaperContext';
import QuestionPapers from './teacher/QuestionPapers';
import PaperSetEdit from './teacher/PaperSetEdit';
import PaperSetView from './teacher/PaperSetView';
import PaperSetManage from './teacher/PaperSetManage';

const navItems = [
  { name: 'Dashboard', path: '' },
  { name: 'Question Papers', path: 'question-papers' },
  { name: 'Questions', path: 'questions' },
  { name: 'Profile', path: 'profile' },
];

const TeacherHome = () => {
  const { paperSets } = usePapers();
  const totalQuestions = Object.values(paperSets).reduce(
    (sum, p) => sum + p.questions.length,
    0
  );
  const submittedCount = Object.values(paperSets).filter(
    (p) => p.status === 'Submitted'
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          title="Total Paper Sets"
          value="3"
          description="Available paper sets"
          color="blue"
        />
        <DashboardCard
          title="Total Questions"
          value={totalQuestions.toString()}
          description="Questions created"
          color="purple"
        />
        <DashboardCard
          title="Published Papers"
          value={submittedCount.toString()}
          description="Submitted to system"
          color="green"
        />
        <DashboardCard
          title="Status"
          value="Demo Mode"
          description="Prototype version"
          color="orange"
        />
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Teacher Dashboard
        </h3>
        <p className="text-gray-600">
          Manage question papers, questions, and your profile from the sidebar.
        </p>
      </div>
    </div>
  );
};

const Placeholder = ({ title }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600">This section will be implemented in later parts.</p>
  </div>
);

const TeacherDashboardContent = () => {
  return (
    <DashboardLayout title="Teacher Dashboard" navItems={navItems}>
      <Routes>
        <Route path="/" element={<TeacherHome />} />
        <Route path="question-papers" element={<QuestionPapers />} />
        <Route path="question-papers/:setId/edit" element={<PaperSetEdit />} />
        <Route path="question-papers/:setId/view" element={<PaperSetView />} />
        <Route path="question-papers/:setId/manage" element={<PaperSetManage />} />
        <Route path="questions" element={<Placeholder title="Questions" />} />
        <Route path="profile" element={<Placeholder title="Profile" />} />
      </Routes>
    </DashboardLayout>
  );
};

const TeacherDashboard = () => {
  return (
    <PaperProvider>
      <TeacherDashboardContent />
    </PaperProvider>
  );
};

export default TeacherDashboard;