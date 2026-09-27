import { z } from 'zod';

import { questionSchema } from './question.js';
import { subjectSchema } from './subject.js';

/**
 * Exam contract (PRD §14, §15, FR-14, FR-15).
 *
 * Faculty create an exam as a draft, choose questions from their own bank, then
 * publish it. Questions are addressed by id and sent in display order, which
 * keeps the client from having to invent positions.
 *
 * Like the question bank, these shapes include the answer key: they are only
 * ever returned to the owning lecturer. The student-facing shape belongs to the
 * attempt feature (PRD §21) and is deliberately not defined yet.
 */

export const examStatusSchema = z.enum(['DRAFT', 'PUBLISHED']);

export type ExamStatus = z.infer<typeof examStatusSchema>;

const MIN_DURATION_MINUTES = 5;
const MAX_DURATION_MINUTES = 300;
const MAX_QUESTIONS = 100;

/**
 * Ordered, duplicate-free question ids.
 *
 * An empty list is allowed: a draft can be a shell that the lecturer fills in
 * over several visits. Publishing is what requires a non-empty paper, so the
 * "add a question" rule is enforced once, at the point it actually matters.
 */
const questionIdsSchema = z
  .array(z.string().trim().min(1))
  .max(MAX_QUESTIONS, `An exam can hold at most ${MAX_QUESTIONS} questions.`)
  .refine((ids) => new Set(ids).size === ids.length, 'A question can only appear once in an exam.');

const examFields = {
  subjectId: z.string().trim().min(1, 'Choose a subject.'),
  title: z.string().trim().min(1, 'Enter an exam title.').max(200),
  instructions: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((value) => value ?? null),
  durationMinutes: z
    .number()
    .int('Duration must be a whole number of minutes.')
    .min(MIN_DURATION_MINUTES, `Allow at least ${MIN_DURATION_MINUTES} minutes.`)
    .max(MAX_DURATION_MINUTES, `Keep the exam under ${MAX_DURATION_MINUTES} minutes.`),
};

/** A question as it sits inside an exam: its order, its marks, and its content. */
export const examQuestionSchema = z.object({
  questionId: z.string(),
  position: z.number().int(),
  marks: z.number().int(),
  question: questionSchema,
});

export type ExamQuestion = z.infer<typeof examQuestionSchema>;

/** List shape: enough to render a row, without inlining every question. */
export const examSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  instructions: z.string().nullable(),
  durationMinutes: z.number().int(),
  totalMarks: z.number().int(),
  status: examStatusSchema,
  subject: subjectSchema,
  questionCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ExamSummary = z.infer<typeof examSummarySchema>;

export const examSchema = examSummarySchema.extend({
  questions: z.array(examQuestionSchema),
});

export type Exam = z.infer<typeof examSchema>;

export const createExamRequestSchema = z.object({
  ...examFields,
  questionIds: questionIdsSchema,
});

export type CreateExamRequest = z.infer<typeof createExamRequestSchema>;

export const updateExamRequestSchema = z
  .object({
    subjectId: examFields.subjectId.optional(),
    title: examFields.title.optional(),
    // `.optional()` is applied after the transform so an absent field stays
    // absent, which is what the "at least one field" check below relies on.
    instructions: examFields.instructions.optional(),
    durationMinutes: examFields.durationMinutes.optional(),
    questionIds: questionIdsSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update.');

export type UpdateExamRequest = z.infer<typeof updateExamRequestSchema>;

export const examListQuerySchema = z.object({
  status: examStatusSchema.optional(),
  subjectId: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type ExamListQuery = z.infer<typeof examListQuerySchema>;

export const examListResponseSchema = z.object({
  items: z.array(examSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

export type ExamListResponse = z.infer<typeof examListResponseSchema>;
