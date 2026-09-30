/**
 * The system's data model and the state every account starts from.
 *
 * Everything lives in the browser (see `store.ts`), so this file is the single
 * place that describes what the system holds: the people who can sign in, the
 * question bank they draw papers from, the papers themselves, and the attempts
 * students make.
 */

export type Role = 'STUDENT' | 'FACULTY';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  createdAt: string;
}

export interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  subject: string;
  text: string;
  marks: number;
  explanation: string;
  options: Option[];
}

export type ExamStatus = 'DRAFT' | 'PUBLISHED';

export interface Exam {
  id: string;
  title: string;
  subject: string;
  instructions: string;
  durationMinutes: number;
  status: ExamStatus;
  /** The lecturer who owns this paper. */
  createdById: string;
  /** Question ids, in paper order. */
  questionIds: string[];
  createdAt: string;
}

export interface Attempt {
  id: string;
  examId: string;
  studentId: string;
  startedAt: number;
  expiresAt: number;
  /** questionId -> chosen option id, or null when the student cleared it. */
  answers: Record<string, string | null>;
  submittedAt: number | null;
  score: number | null;
}

export interface State {
  users: User[];
  questions: Question[];
  exams: Exam[];
  attempts: Attempt[];
  /** Who is signed in, or null. */
  sessionUserId: string | null;
}

export const SUBJECTS = [
  { code: 'CS204', name: 'Operating Systems' },
  { code: 'CS210', name: 'Database Systems' },
  { code: 'CS305', name: 'Computer Networks' },
] as const;

const SUBJECT_NAMES = new Map<string, string>(SUBJECTS.map((s) => [s.code, s.name]));

/** "Operating Systems (CS204)", or just the code when the subject is unknown. */
export function subjectLabel(code: string): string {
  const name = SUBJECT_NAMES.get(code);
  return name === undefined ? code : `${name} (${code})`;
}

/* -------------------------------------------------------------------------- */
/* Marks                                                                      */
/* -------------------------------------------------------------------------- */

/** The marks on offer across a paper. */
export function totalMarks(exam: Exam, questions: Question[]): number {
  return exam.questionIds.reduce((total, id) => {
    const question = questions.find((candidate) => candidate.id === id);
    return total + (question?.marks ?? 0);
  }, 0);
}

/**
 * Marks earned. Grading is a pure function of the stored answers, so a result
 * can always be recomputed and never depends on what the screen did.
 */
export function gradeAttempt(
  exam: Exam,
  questions: Question[],
  answers: Attempt['answers'],
): number {
  return exam.questionIds.reduce((total, id) => {
    const question = questions.find((candidate) => candidate.id === id);
    const correct = question?.options.find((option) => option.isCorrect);

    if (question === undefined || correct === undefined) {
      return total;
    }

    return answers[id] === correct.id ? total + question.marks : total;
  }, 0);
}

/* -------------------------------------------------------------------------- */
/* Starting state                                                             */
/* -------------------------------------------------------------------------- */

function user(id: string, name: string, email: string, password: string, role: Role): User {
  return { id, name, email, password, role, createdAt: '2026-09-01T08:00:00.000Z' };
}

function question(
  id: string,
  subject: string,
  text: string,
  correct: string,
  wrong: [string, string],
  explanation: string,
  marks = 2,
): Question {
  return {
    id,
    subject,
    text,
    marks,
    explanation,
    options: [
      { id: `${id}-a`, text: correct, isCorrect: true },
      { id: `${id}-b`, text: wrong[0], isCorrect: false },
      { id: `${id}-c`, text: wrong[1], isCorrect: false },
    ],
  };
}

export const QUESTIONS: Question[] = [
  question(
    'q1',
    'CS204',
    'Which CPU scheduling algorithm can starve a process indefinitely?',
    'Priority scheduling',
    ['Round robin', 'First come, first served'],
    'Round robin bounds every wait, but priority scheduling keeps a low-priority process waiting as long as higher-priority work keeps arriving.',
    4,
  ),
  question(
    'q2',
    'CS204',
    'What is a deadlock?',
    'A set of processes that each hold a resource the others need',
    [
      'A process using more than its fair share of CPU time',
      'Two processes writing to the same file at once',
    ],
    'Every process in the set is blocked and none can proceed without a resource held by another member of the set.',
    4,
  ),
  question(
    'q3',
    'CS204',
    'Page faults increase sharply as an approach approaches which limit?',
    'Very little main memory',
    ['A very fast CPU', 'A high clock frequency'],
    'With too little main memory a process cannot be held in it at all, so every reference to its pages becomes a fault.',
  ),
  question(
    'q4',
    'CS204',
    'Which memory allocation strategy never needs the process to be moved in memory?',
    'Fixed partitioning',
    ['Paging', 'Segmentation'],
    'Paging and segmentation can move a process to relieve external fragmentation; fixed partitioning only needs the process to fit.',
  ),
  question(
    'q5',
    'CS210',
    'Which normal form removes every partial dependency on a non-prime key attribute?',
    'Second normal form (2NF)',
    ['First normal form (1NF)', 'Third normal form (3NF)'],
    '1NF removes repeating groups and 2NF then removes partial dependencies; 3NF is the one that removes transitive ones.',
    4,
  ),
  question(
    'q6',
    'CS210',
    'An index on a low-selectivity column is usually a poor choice mainly because it is:',
    'Unlikely to reduce the number of rows read',
    ['Impossible to update on insert', 'Too large to store on disk'],
    'If the column matches most rows the planner must still read almost every row, and the index only adds write and storage cost.',
  ),
  question(
    'q7',
    'CS210',
    'Which isolation level still permits a transaction to read rows another uncommitted transaction has written?',
    'Read uncommitted',
    ['Read committed', 'Repeatable read'],
    'Dirty reads are the defining feature of read uncommitted; every other standard level blocks uncommitted data.',
  ),
  question(
    'q8',
    'CS305',
    'Which address identifies a single host on an IPv4 network?',
    'The host address',
    ['The network address', 'The broadcast address'],
    'The network address names the subnet itself, and the broadcast address names every host on it.',
  ),
  question(
    'q9',
    'CS305',
    'In TCP, the sliding window limits which of the following?',
    'How much unacknowledged data may be in flight',
    ['The maximum segment size', 'The number of connections per host'],
    'TCP allows only a window of bytes to be outstanding before it must wait for acknowledgements, which is what keeps fast senders from overwhelming slow receivers.',
    4,
  ),
  question(
    'q10',
    'CS305',
    'DNS maps a hostname to which of the following?',
    'An IP address',
    ['A MAC address', 'A port number'],
    'DNS resolves names to addresses; ports come from the service name in the URL or header, and MAC addresses are found on the local link.',
  ),
  question(
    'q11',
    'CS305',
    'Which protocol resolves a name to a mail server?',
    'MX',
    ['CNAME', 'A'],
    'MX records list the mail servers for a domain; A records give host addresses and CNAME records alias one name onto another.',
  ),
];

export const USERS: User[] = [
  user('faculty-osei', 'Dr. Samuel Osei', 's.osei@oes.edu', 'faculty123', 'FACULTY'),
  user('faculty-mensah', 'Dr. Rita Mensah', 'r.mensah@oes.edu', 'faculty123', 'FACULTY'),
  user('student-khan', 'Aisha Khan', 'a.khan@oes.edu', 'student123', 'STUDENT'),
  user('student-osei', 'Kwame Osei', 'k.osei@oes.edu', 'student123', 'STUDENT'),
  user('student-boateng', 'Efua Boateng', 'e.boateng@oes.edu', 'student123', 'STUDENT'),
];

export const EXAMS: Exam[] = [
  {
    id: 'exam-os',
    title: 'Operating Systems Mid-term',
    subject: 'CS204',
    instructions:
      'Answer every question. The paper is 15 minutes and the timer starts the moment you press Start. You may move between questions and change an answer until you submit.',
    durationMinutes: 15,
    status: 'PUBLISHED',
    createdById: 'faculty-osei',
    questionIds: ['q1', 'q2', 'q3', 'q4'],
    createdAt: '2026-09-20T09:00:00.000Z',
  },
  {
    id: 'exam-db',
    title: 'Database Systems Mid-term',
    subject: 'CS210',
    instructions:
      'Covers normalisation and isolation levels. Answer every question; your answer saves as soon as you choose it.',
    durationMinutes: 20,
    status: 'DRAFT',
    createdById: 'faculty-osei',
    questionIds: ['q5', 'q6', 'q7'],
    createdAt: '2026-09-24T09:00:00.000Z',
  },
  {
    id: 'exam-net',
    title: 'Computer Networks Quiz',
    subject: 'CS305',
    instructions:
      'A short quiz on addressing and transport. Your answer saves as soon as you choose it, so a closed tab costs you nothing.',
    durationMinutes: 10,
    status: 'PUBLISHED',
    createdById: 'faculty-mensah',
    questionIds: ['q8', 'q9', 'q10'],
    createdAt: '2026-09-22T09:00:00.000Z',
  },
];

const NETWORK_EXAM = EXAMS.find((exam) => exam.id === 'exam-net') as Exam;

/** A completed attempt, so Results has a recorded result to show from the start. */
const RECORDED_ATTEMPT: Attempt = {
  id: 'attempt-seeded',
  examId: 'exam-net',
  studentId: 'student-khan',
  startedAt: Date.parse('2026-09-25T10:00:00.000Z'),
  expiresAt: Date.parse('2026-09-25T10:10:00.000Z'),
  answers: { q8: 'q8-a', q9: 'q9-b', q10: 'q10-a' },
  submittedAt: Date.parse('2026-09-25T10:06:00.000Z'),
  score: null,
};

RECORDED_ATTEMPT.score = gradeAttempt(NETWORK_EXAM, QUESTIONS, RECORDED_ATTEMPT.answers);

export function initialState(): State {
  return {
    users: USERS,
    questions: QUESTIONS,
    exams: EXAMS,
    attempts: [RECORDED_ATTEMPT],
    sessionUserId: null,
  };
}
