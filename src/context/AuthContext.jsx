import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

const DEMO_USERS = {
  teacher: {
    username: 'teacher',
    password: 'teacher123',
    role: 'teacher',
    name: 'Dr. Priya Patil',
  },
  examdept: {
    username: 'examdept',
    password: 'exam123',
    role: 'examdept',
    name: 'Dr. Sneha Joshi',
  },
  student: {
    username: 'student',
    password: 'student123',
    role: 'student',
    name: 'Aarav Sharma',
  },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('oes_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        // Automatically migrate legacy demo names to authentic Indian names
        if (parsed.username && DEMO_USERS[parsed.username]) {
          parsed.name = DEMO_USERS[parsed.username].name;
          localStorage.setItem('oes_user', JSON.stringify(parsed));
        }
        setUser(parsed);
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('oes_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (username, password) => {
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedPassword = password.trim();

    const userKey = Object.keys(DEMO_USERS).find(
      (key) =>
        DEMO_USERS[key].username === normalizedUsername &&
        DEMO_USERS[key].password === normalizedPassword
    );

    if (userKey) {
      const loggedInUser = {
        username: DEMO_USERS[userKey].username,
        role: DEMO_USERS[userKey].role,
        name: DEMO_USERS[userKey].name,
      };
      setUser(loggedInUser);
      setIsAuthenticated(true);
      localStorage.setItem('oes_user', JSON.stringify(loggedInUser));
      return { success: true, role: loggedInUser.role };
    }

    return { success: false, error: 'Invalid credentials' };
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('oes_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};