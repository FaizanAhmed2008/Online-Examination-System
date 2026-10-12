import { createContext, useContext, useEffect, useState } from 'react';
import { dummyQuestions } from '../data/dummyQuestions';

const PaperContext = createContext(null);

const initialPaperSets = {
  SET_A: {
    examName: 'Software Engineering Mid-Term Examination',
    subject: 'Software Engineering (CS-302)',
    paperSet: 'Set A',
    duration: '30 Minutes',
    totalMarks: 20,
    status: 'Draft',
    locked: false,
    questions: dummyQuestions.SET_A.map((q) => ({ ...q })),
  },
  SET_B: {
    examName: 'Software Engineering Mid-Term Examination',
    subject: 'Software Engineering (CS-302)',
    paperSet: 'Set B',
    duration: '30 Minutes',
    totalMarks: 20,
    status: 'Draft',
    locked: false,
    questions: dummyQuestions.SET_B.map((q) => ({ ...q })),
  },
  SET_C: {
    examName: 'Software Engineering Mid-Term Examination',
    subject: 'Software Engineering (CS-302)',
    paperSet: 'Set C',
    duration: '30 Minutes',
    totalMarks: 20,
    status: 'Draft',
    locked: false,
    questions: dummyQuestions.SET_C.map((q) => ({ ...q })),
  },
};

const initialSubmissions = [
  {
    id: 'sub_101',
    studentUsername: 'student',
    studentName: 'Aarav Sharma',
    rollNo: '2026-CS-401',
    setId: 'SET_A',
    examName: 'Software Engineering Mid-Term Examination',
    subject: 'Software Engineering (CS-302)',
    paperSet: 'Set A',
    totalQuestions: 10,
    answeredCount: 10,
    correctCount: 9,
    score: 18,
    totalMarks: 20,
    percentage: 90,
    status: 'Completed',
    submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    timeSpent: '18m 42s',
  },
  {
    id: 'sub_102',
    studentUsername: 'aditi.kulkarni',
    studentName: 'Aditi Kulkarni',
    rollNo: '2026-CS-402',
    setId: 'SET_A',
    examName: 'Software Engineering Mid-Term Examination',
    subject: 'Software Engineering (CS-302)',
    paperSet: 'Set A',
    totalQuestions: 10,
    answeredCount: 10,
    correctCount: 8,
    score: 16,
    totalMarks: 20,
    percentage: 80,
    status: 'Completed',
    submittedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    timeSpent: '21m 15s',
  },
  {
    id: 'sub_103',
    studentUsername: 'rahul.verma',
    studentName: 'Rahul Verma',
    rollNo: '2026-CS-403',
    setId: 'SET_A',
    examName: 'Software Engineering Mid-Term Examination',
    subject: 'Software Engineering (CS-302)',
    paperSet: 'Set A',
    totalQuestions: 10,
    answeredCount: 10,
    correctCount: 7,
    score: 14,
    totalMarks: 20,
    percentage: 70,
    status: 'Completed',
    submittedAt: new Date(Date.now() - 86400000 * 3.5).toISOString(),
    timeSpent: '24m 10s',
  },
  {
    id: 'sub_104',
    studentUsername: 'rohan.deshmukh',
    studentName: 'Rohan Deshmukh',
    rollNo: '2026-CS-404',
    setId: 'SET_A',
    examName: 'Software Engineering Mid-Term Examination',
    subject: 'Software Engineering (CS-302)',
    paperSet: 'Set A',
    totalQuestions: 10,
    answeredCount: 10,
    correctCount: 8,
    score: 16,
    totalMarks: 20,
    percentage: 80,
    status: 'Completed',
    submittedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    timeSpent: '19m 50s',
  },
  {
    id: 'sub_105',
    studentUsername: 'ananya.iyer',
    studentName: 'Ananya Iyer',
    rollNo: '2026-CS-405',
    setId: 'SET_A',
    examName: 'Software Engineering Mid-Term Examination',
    subject: 'Software Engineering (CS-302)',
    paperSet: 'Set A',
    totalQuestions: 10,
    answeredCount: 10,
    correctCount: 10,
    score: 20,
    totalMarks: 20,
    percentage: 100,
    status: 'Completed',
    submittedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    timeSpent: '16m 22s',
  },
];

const createPaperReference = () => {
  const token = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `P-${token.replaceAll('-', '').slice(0, 12).toUpperCase()}`;
};

const readStoredArray = (key, fallback) => {
  const stored = localStorage.getItem(key);
  if (!stored) return fallback;
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

export const PaperProvider = ({ children }) => {
  const [paperSets, setPaperSets] = useState(initialPaperSets);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [paperSubmissions, setPaperSubmissions] = useState([]);
  const [scheduledExams, setScheduledExams] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedPapers = localStorage.getItem('oes_papers');
    let loadedPapers = initialPaperSets;
    if (storedPapers) {
      try {
        loadedPapers = { ...initialPaperSets, ...JSON.parse(storedPapers) };
      } catch {
        loadedPapers = initialPaperSets;
      }
    }

    const savedPaperSubmissions = readStoredArray('oes_paper_submissions', []);
    const migratedPaperSubmissions = [...savedPaperSubmissions];
    const migratedPapers = { ...loadedPapers };

    Object.entries(migratedPapers).forEach(([setId, paper]) => {
      const savedSubmission = migratedPaperSubmissions.find((submission) => submission.setId === setId);
      if (savedSubmission) {
        migratedPapers[setId] = { ...paper, status: savedSubmission.status, locked: true };
      } else if (paper.status === 'Submitted' || paper.status === 'Approved' || paper.status === 'Published') {
        migratedPapers[setId] = { ...paper, status: 'Submitted', locked: true };
        migratedPaperSubmissions.push({
          paperId: createPaperReference(),
          setId,
          status: 'Submitted',
          totalQuestions: paper.questions?.length || 0,
          totalMarks: paper.questions?.reduce((sum, question) => sum + (question.marks || 0), 0) || paper.totalMarks || 0,
          submittedAt: new Date().toISOString(),
        });
      } else if (paper.status !== 'Draft') {
        migratedPapers[setId] = { ...paper, locked: true };
      } else {
        migratedPapers[setId] = { ...paper, locked: false };
      }
    });

    setPaperSets(migratedPapers);
    setSubmissions(readStoredArray('oes_submissions', initialSubmissions).map((submission) => {
      if (submission.studentName === 'Student Demo') {
        return {
          ...submission,
          studentName: 'Aarav Sharma',
          examName: submission.examName?.replace('(Demo Trial)', '').trim() || 'Software Engineering Mid-Term Examination',
        };
      }
      return submission;
    }));
    setPaperSubmissions(migratedPaperSubmissions);
    setScheduledExams(readStoredArray('oes_scheduled_exams', []));
    setAuditLog(readStoredArray('oes_audit_log', []));
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('oes_papers', JSON.stringify(paperSets));
    localStorage.setItem('oes_submissions', JSON.stringify(submissions));
    localStorage.setItem('oes_paper_submissions', JSON.stringify(paperSubmissions));
    localStorage.setItem('oes_scheduled_exams', JSON.stringify(scheduledExams));
    localStorage.setItem('oes_audit_log', JSON.stringify(auditLog));
  }, [paperSets, submissions, paperSubmissions, scheduledExams, auditLog, isLoaded]);

  const addAuditEvent = (event) => {
    setAuditLog((previous) => [
      { id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, occurredAt: new Date().toISOString(), ...event },
      ...previous,
    ]);
  };

  const updatePaperSet = (setKey, data) => {
    if (!paperSets[setKey] || paperSets[setKey].locked || paperSets[setKey].status !== 'Draft') return false;
    const editableFields = ['examName', 'subject', 'duration', 'totalMarks'];
    setPaperSets((previous) => ({
      ...previous,
      [setKey]: {
        ...previous[setKey],
        ...Object.fromEntries(editableFields.filter((field) => field in data).map((field) => [field, data[field]])),
      },
    }));
    return true;
  };

  const updateQuestions = (setKey, questions) => {
    if (!paperSets[setKey] || paperSets[setKey].locked || paperSets[setKey].status !== 'Draft') return false;
    setPaperSets((previous) => ({
      ...previous,
      [setKey]: {
        ...previous[setKey],
        questions: questions.map((question, index) => ({ ...question, id: question.id || index + 1 })),
      },
    }));
    return true;
  };

  const submitPaperSet = (setKey) => {
    const paper = paperSets[setKey];
    if (!paper || paper.locked || paper.status !== 'Draft' || paperSubmissions.some((submission) => submission.setId === setKey)) {
      return null;
    }
    const paperSubmission = {
      paperId: createPaperReference(),
      setId: setKey,
      status: 'Submitted',
      totalQuestions: paper.questions.length,
      totalMarks: paper.questions.reduce((sum, question) => sum + (question.marks || 0), 0),
      submittedAt: new Date().toISOString(),
    };
    setPaperSubmissions((previous) => [...previous, paperSubmission]);
    setPaperSets((previous) => ({ ...previous, [setKey]: { ...previous[setKey], status: 'Submitted', locked: true } }));
    addAuditEvent({ type: 'paper-submitted', paperId: paperSubmission.paperId, status: paperSubmission.status });
    return paperSubmission;
  };

  const submitAllPaperSets = () => {
    const setEntries = Object.entries(paperSets);
    if (setEntries.length !== 3 || setEntries.some(([, paper]) => paper.status !== 'Draft' || paper.locked)) return false;
    if (paperSubmissions.some((submission) => setEntries.some(([setId]) => submission.setId === setId))) return false;
    const now = new Date().toISOString();
    const newSubmissions = setEntries.map(([setId, paper]) => ({
      paperId: createPaperReference(),
      setId,
      status: 'Submitted',
      totalQuestions: paper.questions.length,
      totalMarks: paper.questions.reduce((sum, question) => sum + (question.marks || 0), 0),
      submittedAt: now,
    }));
    setPaperSubmissions((previous) => [...previous, ...newSubmissions]);
    setPaperSets((previous) => Object.fromEntries(
      Object.entries(previous).map(([setId, paper]) => [setId, { ...paper, status: 'Submitted', locked: true }])
    ));
    newSubmissions.forEach((submission) => addAuditEvent({
      type: 'paper-submitted',
      paperId: submission.paperId,
      status: submission.status,
    }));
    return true;
  };

  const scheduleExam = (paperId, scheduledAt) => {
    const paperSubmission = paperSubmissions.find((submission) => submission.paperId === paperId);
    if (!paperSubmission || !Number.isFinite(Date.parse(scheduledAt)) || paperSubmission.status === 'Published') return null;
    const existingExam = scheduledExams.find((exam) => exam.paperId === paperId);
    const exam = {
      id: existingExam?.id || `exam_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      paperId,
      setId: paperSubmission.setId,
      scheduledAt: new Date(scheduledAt).toISOString(),
      status: 'Scheduled',
    };
    setScheduledExams((previous) => existingExam
      ? previous.map((item) => item.id === existingExam.id ? exam : item)
      : [...previous, exam]);
    setPaperSubmissions((previous) => previous.map((item) => item.paperId === paperId ? { ...item, status: 'Scheduled' } : item));
    addAuditEvent({ type: 'exam-scheduled', paperId, examId: exam.id, status: exam.status });
    return exam;
  };

  const publishExam = (examId) => {
    const exam = scheduledExams.find((item) => item.id === examId);
    if (!exam || exam.status !== 'Scheduled') return false;
    setScheduledExams((previous) => previous.map((item) => item.id === examId ? { ...item, status: 'Published', publishedAt: new Date().toISOString() } : item));
    setPaperSubmissions((previous) => previous.map((item) => item.paperId === exam.paperId ? { ...item, status: 'Published' } : item));
    addAuditEvent({ type: 'exam-published', paperId: exam.paperId, examId, status: 'Published' });
    return true;
  };

  const submitStudentExam = (record) => {
    if (submissions.some((submission) => submission.examId === record.examId && submission.studentUsername === record.studentUsername)) {
      return null;
    }
    const newSubmission = { id: `sub_${Date.now()}`, submittedAt: new Date().toISOString(), ...record };
    setSubmissions((previous) => [newSubmission, ...previous]);
    return newSubmission;
  };

  const recordViolation = (examId, violationCount, action, username) => {
    addAuditEvent({ type: 'exam-violation', examId, violationCount, action, username });
  };

  return (
    <PaperContext.Provider
      value={{
        paperSets,
        submissions,
        paperSubmissions,
        scheduledExams,
        auditLog,
        updatePaperSet,
        updateQuestions,
        submitPaperSet,
        submitAllPaperSets,
        scheduleExam,
        publishExam,
        submitStudentExam,
        recordViolation,
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
