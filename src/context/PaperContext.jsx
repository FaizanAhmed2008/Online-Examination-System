import { createContext, useContext, useEffect, useState } from 'react';
import { dummyQuestions } from '../data/dummyQuestions';

const PaperContext = createContext(null);

const initialPaperSets = {
  SET_A: {
    examName: 'Software Engineering Internal Examination',
    subject: 'Software Engineering',
    paperSet: 'Set A',
    duration: '30 Minutes',
    totalMarks: 20,
    status: 'Published',
    questions: dummyQuestions.SET_A.map((q) => ({ ...q })),
  },
  SET_B: {
    examName: 'Software Engineering Internal Examination',
    subject: 'Software Engineering',
    paperSet: 'Set B',
    duration: '30 Minutes',
    totalMarks: 20,
    status: 'Submitted',
    questions: dummyQuestions.SET_B.map((q) => ({ ...q })),
  },
  SET_C: {
    examName: 'Software Engineering Internal Examination',
    subject: 'Software Engineering',
    paperSet: 'Set C',
    duration: '30 Minutes',
    totalMarks: 20,
    status: 'Draft',
    questions: dummyQuestions.SET_C.map((q) => ({ ...q })),
  },
};

const initialSubmissions = [
  {
    id: 'sub_demo_1',
    studentUsername: 'student',
    studentName: 'Student Demo',
    setId: 'SET_A',
    examName: 'Software Engineering Internal Examination (Demo Trial)',
    subject: 'Software Engineering',
    paperSet: 'Set A',
    totalQuestions: 10,
    answeredCount: 10,
    correctCount: 8,
    score: 16,
    totalMarks: 20,
    percentage: 80,
    status: 'Completed',
    submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    timeSpent: '18m 42s',
  },
];

export const PaperProvider = ({ children }) => {
  const [paperSets, setPaperSets] = useState(initialPaperSets);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('oes_papers');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPaperSets({ ...initialPaperSets, ...parsed });
      } catch {
        setPaperSets(initialPaperSets);
      }
    }

    const storedSubmissions = localStorage.getItem('oes_submissions');
    if (storedSubmissions) {
      try {
        const parsedSubs = JSON.parse(storedSubmissions);
        if (Array.isArray(parsedSubs) && parsedSubs.length > 0) {
          setSubmissions(parsedSubs);
        }
      } catch {
        setSubmissions(initialSubmissions);
      }
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('oes_papers', JSON.stringify(paperSets));
    }
  }, [paperSets, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('oes_submissions', JSON.stringify(submissions));
    }
  }, [submissions, isLoaded]);

  const updatePaperSet = (setKey, data) => {
    setPaperSets((prev) => ({
      ...prev,
      [setKey]: {
        ...prev[setKey],
        ...data,
      },
    }));
  };

  const updateQuestions = (setKey, questions) => {
    setPaperSets((prev) => ({
      ...prev,
      [setKey]: {
        ...prev[setKey],
        questions: questions.map((q, idx) => ({
          ...q,
          id: q.id || idx + 1,
        })),
      },
    }));
  };

  const submitPaperSet = (setKey) => {
    setPaperSets((prev) => ({
      ...prev,
      [setKey]: {
        ...prev[setKey],
        status: 'Submitted',
      },
    }));
  };

  const approvePaperSet = (setKey) => {
    setPaperSets((prev) => ({
      ...prev,
      [setKey]: {
        ...prev[setKey],
        status: 'Approved',
      },
    }));
  };

  const publishPaperSet = (setKey) => {
    setPaperSets((prev) => ({
      ...prev,
      [setKey]: {
        ...prev[setKey],
        status: 'Published',
      },
    }));
  };

  const submitStudentExam = (record) => {
    const newSubmission = {
      id: `sub_${Date.now()}`,
      submittedAt: new Date().toISOString(),
      ...record,
    };
    setSubmissions((prev) => [newSubmission, ...prev]);
    return newSubmission;
  };

  return (
    <PaperContext.Provider
      value={{
        paperSets,
        submissions,
        updatePaperSet,
        updateQuestions,
        submitPaperSet,
        approvePaperSet,
        publishPaperSet,
        submitStudentExam,
      }}
    >
      {children}
    </PaperContext.Provider>
  );
};

export const usePapers = () => {
  const context = useContext(PaperContext);
  if (!context) {
    throw new Error('usePapers must be used within a PaperProvider');
  }
  return context;
};