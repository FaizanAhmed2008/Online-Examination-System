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
    status: 'Draft',
    questions: dummyQuestions.SET_A.map((q) => ({ ...q })),
  },
  SET_B: {
    examName: 'Software Engineering Internal Examination',
    subject: 'Software Engineering',
    paperSet: 'Set B',
    duration: '30 Minutes',
    totalMarks: 20,
    status: 'Draft',
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

export const PaperProvider = ({ children }) => {
  const [paperSets, setPaperSets] = useState(initialPaperSets);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('oes_papers');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPaperSets({ ...initialPaperSets, ...parsed });
      } catch (error) {
        setPaperSets(initialPaperSets);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('oes_papers', JSON.stringify(paperSets));
    }
  }, [paperSets, isLoaded]);

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

  return (
    <PaperContext.Provider
      value={{ paperSets, updatePaperSet, updateQuestions, submitPaperSet }}
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