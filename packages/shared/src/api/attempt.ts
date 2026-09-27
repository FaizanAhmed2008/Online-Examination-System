import { z } from 'zod';

/**
 * Student attempt contract (PRD §16, FR-16).
 *
 * These shapes are the *student* view of an exam and are deliberately narrower
 * than the faculty contract in `exam.ts`: an option here is an id and its text,
 * with no `isCorrect` flag and no `explanation`. Marking happens on the server
 * at submission, so nothing in this file can leak the answer key to a student
 * who is still mid-attempt.
 */

export const attemptStatusSchema = z.enum(['IN_PROGRESS', 'SUBMITTED']);

export type AttemptStatus = z.infer<typeof attemptStatusSchema>;

const MAX_QUESTIONS = 100;

/** A selectable choice, without the answer key. */
export const examOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export type ExamOption = z.infer<typeof examOptionSchema>;

/** One question as a student meets it: text and choices, in the exam's order. */
export const paperQuestionSchema = z.object({
  questionId: z.string(),
  position: z.number().int(),
  marks: z.number().int(),
  text: z.string(),
  options: z.array(examOptionSchema),
});

export type PaperQuestion = z.infer<typeof paperQuestionSchema>;

const subjectSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
});

/**
 * A published exam a student may sit, plus that student's own attempt if one
 * exists. Carrying the attempt here is what lets the list screen show "resume"
 * instead of offering a second start.
 */
export const availableExamSchema = z.object({
  id: z.string(),
  title: z.string(),
  instructions: z.string().nullable(),
  subject: subjectSummarySchema,
  durationMinutes: z.number().int(),
  questionCount: z.number().int(),
  totalMarks: z.number().int(),
  attemptId: z.string().nullable(),
  attemptStatus: attemptStatusSchema.nullable(),
  startedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  submittedAt: z.string().nullable(),
  score: z.number().int().nullable(),
});

export type AvailableExam = z.infer<typeof availableExamSchema>;

export const availableExamsResponseSchema = z.object({
  items: z.array(availableExamSchema),
});

export type AvailableExamsResponse = z.infer<typeof availableExamsResponseSchema>;

/** One answered question, addressed by question id. `null` means "cleared". */
export const attemptAnswerInputSchema = z.object({
  questionId: z.string().trim().min(1),
  selectedOptionId: z.string().trim().min(1).nullable(),
});

export type AttemptAnswerInput = z.infer<typeof attemptAnswerInputSchema>;

const answerListSchema = z
  .array(attemptAnswerInputSchema)
  .max(MAX_QUESTIONS, `An exam can hold at most ${MAX_QUESTIONS} questions.`);

export const startAttemptRequestSchema = z.object({
  examId: z.string().trim().min(1, 'Choose an exam.'),
});

export type StartAttemptRequest = z.infer<typeof startAttemptRequestSchema>;

export const saveAnswersRequestSchema = z.object({ answers: answerListSchema });

export type SaveAnswersRequest = z.infer<typeof saveAnswersRequestSchema>;

export const submitAttemptRequestSchema = z.object({ answers: answerListSchema });

export type SubmitAttemptRequest = z.infer<typeof submitAttemptRequestSchema>;

/** The attempt a student is sitting: the paper plus what they have chosen. */
export const attemptSchema = z.object({
  attemptId: z.string(),
  examId: z.string(),
  title: z.string(),
  subject: subjectSummarySchema,
  status: attemptStatusSchema,
  startedAt: z.string(),
  expiresAt: z.string(),
  submittedAt: z.string().nullable(),
  durationMinutes: z.number().int(),
  totalMarks: z.number().int(),
  questions: z.array(paperQuestionSchema),
  answers: z.array(z.object({ questionId: z.string(), selectedOptionId: z.string().nullable() })),
});

export type Attempt = z.infer<typeof attemptSchema>;

/** Acknowledges a save; the client only needs to know it landed. */
export const saveAnswersResponseSchema = z.object({
  attemptId: z.string(),
  saved: z.number().int(),
});

export type SaveAnswersResponse = z.infer<typeof saveAnswersResponseSchema>;

/**
 * The outcome of a submission. The score is all a student sees here: a
 * per-question breakdown with the correct answers is a separate PRD screen
 * (PRD §21) and is deliberately not part of this flow.
 */
export const attemptResultSchema = z.object({
  attemptId: z.string(),
  examId: z.string(),
  title: z.string(),
  status: z.literal('SUBMITTED'),
  score: z.number().int(),
  totalMarks: z.number().int(),
  questionCount: z.number().int(),
  answeredCount: z.number().int(),
  startedAt: z.string(),
  submittedAt: z.string(),
});

export type AttemptResult = z.infer<typeof attemptResultSchema>;
