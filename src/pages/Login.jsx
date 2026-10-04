import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'teacher') navigate('/teacher');
      else if (user.role === 'examdept') navigate('/examdept');
      else if (user.role === 'student') navigate('/student');
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = login(username, password);

    if (result.success) {
      if (result.role === 'teacher') navigate('/teacher');
      else if (result.role === 'examdept') navigate('/examdept');
      else if (result.role === 'student') navigate('/student');
    } else {
      setError(result.error || 'Invalid credentials');
    }
    setIsLoading(false);
  };

  const fillDemoCredentials = (role) => {
    if (role === 'teacher') {
      setUsername('teacher');
      setPassword('teacher123');
    } else if (role === 'examdept') {
      setUsername('examdept');
      setPassword('exam123');
    } else if (role === 'student') {
      setUsername('student');
      setPassword('student123');
    }
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="text-center lg:text-left">
          <h1 className="text-4xl lg:text-5xl font-bold text-blue-900 mb-4">
            Online Examination System
          </h1>
          <p className="text-xl text-blue-700 mb-6">
            College Examination Management Portal
          </p>
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 border border-orange-200">
            DEMO MODE
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8 border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            Login
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="Enter password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4 text-center">
              Demo Login Options
            </h3>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => fillDemoCredentials('teacher')}
                className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="text-left">
                  <p className="font-medium text-gray-900">Teacher</p>
                  <p className="text-xs text-gray-500">teacher / teacher123</p>
                </div>
                <span className="text-blue-600 text-sm">Use</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemoCredentials('examdept')}
                className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="text-left">
                  <p className="font-medium text-gray-900">Exam Department</p>
                  <p className="text-xs text-gray-500">examdept / exam123</p>
                </div>
                <span className="text-blue-600 text-sm">Use</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemoCredentials('student')}
                className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="text-left">
                  <p className="font-medium text-gray-900">Student</p>
                  <p className="text-xs text-gray-500">student / student123</p>
                </div>
                <span className="text-blue-600 text-sm">Use</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;