import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DashboardLayout = ({ title, navItems, children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '.' || path === '') {
      return location.pathname === basePath;
    }
    return location.pathname.startsWith(`${basePath}/${path}`);
  };

  const basePath = location.pathname.split('/').slice(0, 2).join('/');

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-blue-900 text-white flex flex-col shadow-lg">
        <div className="p-6 border-b border-blue-800">
          <h1 className="text-xl font-bold">Online Examination System</h1>
          <p className="text-sm text-blue-200 mt-1">{title}</p>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center px-4 py-3 rounded-lg transition-colors duration-200 ${
                isActive(item.path)
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'text-blue-100 hover:bg-blue-800 hover:text-white'
              }`}
            >
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-blue-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-200 font-medium"
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Welcome, {user?.name}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                DEMO MODE
              </span>
              <span className="text-sm text-gray-600 capitalize">
                Role: {user?.role === 'examdept' ? 'Exam Department' : user?.role}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;