import { Route, Routes } from 'react-router-dom';
import DashboardCard from '../components/DashboardCard';
import DashboardLayout from '../layouts/DashboardLayout';

const navItems = [
  { name: 'Dashboard', path: '' },
  { name: 'Available Exams', path: 'available-exams' },
  { name: 'My Exams', path: 'my-exams' },
  { name: 'Results', path: 'results' },
  { name: 'Profile', path: 'profile' },
];

const StudentHome = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          title="Available Exams"
          value="0"
          description="Exams you can take"
          color="blue"
        />
        <DashboardCard
          title="Completed Exams"
          value="0"
          description="Exams completed"
          color="green"
        />
        <DashboardCard
          title="Latest Result"
          value="Not Available"
          description="Recent result"
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
          Student Dashboard
        </h3>
        <p className="text-gray-600">
          View available exams, your exams, results, and profile from the sidebar.
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

const StudentDashboard = () => {
  return (
    <DashboardLayout title="Student Dashboard" navItems={navItems}>
      <Routes>
        <Route path="/" element={<StudentHome />} />
        <Route path="available-exams" element={<Placeholder title="Available Exams" />} />
        <Route path="my-exams" element={<Placeholder title="My Exams" />} />
        <Route path="results" element={<Placeholder title="Results" />} />
        <Route path="profile" element={<Placeholder title="Profile" />} />
      </Routes>
    </DashboardLayout>
  );
};

export default StudentDashboard;