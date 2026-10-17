import { createContext, useContext, useEffect, useState } from 'react';
import { dummyQuestions } from '../data/dummyQuestions';

const PaperContext = createContext(null);

const STORAGE_KEYS = {
  papers: 'oes_papers',
  submissions: 'oes_submissions',
  paperSubmissions: 'oes_paper_submissions',
  scheduledExams: 'oes_scheduled_exams',
  auditLog: 'oes_audit_log',
  session: 'oes_dev_session',
};

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

const createExamId = () => `exam_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

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

const readStoredObject = (key, fallback) => {
  const stored = localStorage.getItem(key);
  if (!stored) return fallback;
  try {
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

// Every `npm run dev` run injects its own session id into index.html. When the
// id changes (dev server restarted) the previous run's data is dropped and the
// whole teacher -> exam dept -> student simulation starts from scratch.
const restartIfNewDevSession = () => {
  const session = window.__OES_DEV_SESSION__;
  if (!session) return;
  if (localStorage.getItem(STORAGE_KEYS.session) === session) return;
  Object.values(STORAGE_KEYS).forEach((key) => {
    if (key !== STORAGE_KEYS.session) localStorage.removeItem(key);
  });
  localStorage.setItem(STORAGE_KEYS.session, session);
};

const loadPersistedState = () => {
  const paperSets = {
    ...initialPaperSets,
    ...readStoredObject(STORAGE_KEYS.papers, {}),
  };
  const paperSubmissions = readStoredArray(STORAGE_KEYS.paperSubmissions, []).filter(
    (submission) => submission && submission.setId && paperSets[submission.setId]
  );

  // The submission registry is the source of truth for every paper that has
  // left the draft stage; reconcile the paper cards with it.
  const reconciledPapers = { ...paperSets };
  Object.entries(reconciledPapers).forEach(([setId, paper]) => {
    const submission = paperSubmissions.find((item) => item.setId === setId);
    if (submission) {
      reconciledPapers[setId] = { ...paper, status: submission.status, locked: true };
    } else {
      reconciledPapers[setId] = { ...paper, locked: paper.status !== 'Draft' };
    }
  });

  return {
    paperSets: reconciledPapers,
    submissions: readStoredArray(STORAGE_KEYS.submissions, initialSubmissions),
    paperSubmissions,
    scheduledExams: readStoredArray(STORAGE_KEYS.scheduledExams, []),
    auditLog: readStoredArray(STORAGE_KEYS.auditLog, []),
  };
};

export const PaperProvider = ({ children }) => {
  const [paperSets, setPaperSets] = useState(initialPaperSets);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [paperSubmissions, setPaperSubmissions] = useState([]);
  const [scheduledExams, setScheduledExams] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    restartIfNewDevSession();
    const state = loadPersistedState();
    setPaperSets(state.paperSets);
    setSubmissions(state.submissions);
    setPaperSubmissions(state.paperSubmissions);
    setScheduledExams(state.scheduledExams);
    setAuditLog(state.auditLog);
    setIsLoaded(true);
  }, []);

  // Keeps other open tabs (for example the exam dept tab while the faculty tab
  // submits its paper sets) in sync with the same simulation.
  useEffect(() => {
    const handleStorage = (event) => {
      if (!event.key || !event.key.startsWith('oes_') || event.key === STORAGE_KEYS.session) return;
      const state = loadPersistedState();
      setPaperSets(state.paperSets);
      setSubmissions(state.submissions);
      setPaperSubmissions(state.paperSubmissions);
      setScheduledExams(state.scheduledExams);
      setAuditLog(state.auditLog);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEYS.papers, JSON.stringify(paperSets));
    localStorage.setItem(STORAGE_KEYS.submissions, JSON.stringify(submissions));
    localStorage.setItem(STORAGE_KEYS.paperSubmissions, JSON.stringify(paperSubmissions));
    localStorage.setItem(STORAGE_KEYS.scheduledExams, JSON.stringify(scheduledExams));
    localStorage.setItem(STORAGE_KEYS.auditLog, JSON.stringify(auditLog));
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
    addAuditEvent({ type: 'paper-submitted', paperId: paperSubmission.paperId, setId: setKey, status: paperSubmission.status });
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
      setId: submission.setId,
      status: submission.status,
    }));
    return true;
  };

  // The exam department clears exactly one of the submitted sets. Approving it
  // schedules the exam for "right now" and publishes it to the student portal.
  const approvePaperSet = (paperId) => {
    const submission = paperSubmissions.find((item) => item.paperId === paperId);
    if (!submission || submission.status !== 'Submitted') return null;
    if (paperSubmissions.some((item) => item.status === 'Approved')) return null;
    if (!paperSets[submission.setId]) return null;

    const approvedAt = new Date().toISOString();
    const exam = {
      id: createExamId(),
      paperId,
      setId: submission.setId,
      scheduledAt: approvedAt,
      status: 'Published',
      publishedAt: approvedAt,
    };

    setPaperSubmissions((previous) => previous.map((item) => (
      item.paperId === paperId ? { ...item, status: 'Approved', approvedAt } : item
    )));
    setPaperSets((previous) => ({
      ...previous,
      [submission.setId]: { ...previous[submission.setId], status: 'Approved', locked: true },
    }));
    setScheduledExams((previous) => [...previous.filter((item) => item.paperId !== paperId), exam]);
    addAuditEvent({ type: 'paper-approved', paperId, setId: submission.setId, status: 'Approved' });
    addAuditEvent({ type: 'exam-published', paperId, examId: exam.id, status: 'Published' });
    return exam;
  };

  const scheduleExam = (paperId, scheduledAt) => {
    const paperSubmission = paperSubmissions.find((submission) => submission.paperId === paperId);
    if (!paperSubmission || !Number.isFinite(Date.parse(scheduledAt)) || paperSubmission.status === 'Published') return null;
    const existingExam = scheduledExams.find((exam) => exam.paperId === paperId);
    const exam = {
      id: existingExam?.id || createExamId(),
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
        approvePaperSet,
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
