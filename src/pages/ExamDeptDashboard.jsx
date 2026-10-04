import { Route, Routes } from 'react-router-dom';
import DashboardCard from '../components/DashboardCard';
import DashboardLayout from '../layouts/DashboardLayout';

const navItems = [
  { name: 'Dashboard', path: '' },
  { name: 'Paper Sets', path: 'paper-sets' },
  { name: 'Examinations', path: 'examinations' },
  { name: 'Schedule', path: 'schedule' },
  { name: 'Results', path: 'results' },
  { name: 'Profile', path: 'profile' },
];

const ExamDeptHome = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          title="Available Paper Sets"
          value="0"
          description="Paper sets in system"
          color="blue"
        />
        <DashboardCard
          title="Published Exams"
          value="0"
          description="Active examinations"
          color="green"
        />
        <DashboardCard
          title="Students"
          value="1"
          description="Registered students"
          color="purple"
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
          Exam Department Dashboard
        </h3>
        <p className="text-gray-600">
          Manage paper sets, examinations, schedule, results and profile from the sidebar.
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

const ExamDeptDashboard = () => {
  return (
    <DashboardLayout title="Exam Department Dashboard" navItems={navItems}>
      <Routes>
        <Route path="/" element={<ExamDeptHome />} />
        <Route path="paper-sets" element={<Placeholder title="Paper Sets" />} />
        <Route path="examinations" element={<Placeholder title="Examinations" />} />
        <Route path="schedule" element={<Placeholder title="Schedule" />} />
        <Route path="results" element={<Placeholder title="Results" />} />
        <Route path="profile" element={<Placeholder title="Profile" />} />
      </Routes>
    </DashboardLayout>
  );
};

export default ExamDeptDashboard;