import { z } from 'zod';

import { subjectSchema } from './subject.js';

/**
 * Question bank contract (PRD §13, §14).
 *
 * `isCorrect` is present here because this shape is only ever returned to the
 * faculty who owns the question. A student-facing shape that omits the answer
 * key belongs to the attempt feature (PRD §21) and is deliberately not
 * defined yet.
 */

export const questionTypeSchema = z.enum(['SINGLE_CHOICE']);

export type QuestionType = z.infer<typeof questionTypeSchema>;

export const questionStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

export type QuestionStatus = z.infer<typeof questionStatusSchema>;

export const questionOptionInputSchema = z.object({
  text: z.string().trim().min(1, 'Every option needs text.').max(500),
  isCorrect: z.boolean(),
});

export type QuestionOptionInput = z.infer<typeof questionOptionInputSchema>;

export const questionOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  isCorrect: z.boolean(),
});

export type QuestionOption = z.infer<typeof questionOptionSchema>;

const MIN_OPTIONS = 2;

/** Shared rule: a single-correct question needs choices and exactly one key. */
const optionsMustHaveExactlyOneCorrect = z
  .array(questionOptionInputSchema)
  .min(MIN_OPTIONS, `Provide at least ${MIN_OPTIONS} options.`)
  .refine(
    (options) => options.filter((option) => option.isCorrect).length === 1,
    'Mark exactly one option as the correct answer.',
  );

export const questionSchema = z.object({
  id: z.string(),
  text: z.string(),
  type: questionTypeSchema,
  marks: z.number().int(),
  explanation: z.string().nullable(),
  status: questionStatusSchema,
  subject: subjectSchema,
  options: z.array(questionOptionSchema),
  createdAt: z.string(),
});

export type Question = z.infer<typeof questionSchema>;

export const createQuestionRequestSchema = z.object({
  subjectId: z.string().trim().min(1, 'Choose a subject.'),
  text: z.string().trim().min(1, 'Enter the question text.').max(2000),
  type: questionTypeSchema.default('SINGLE_CHOICE'),
  marks: z
    .number()
    .int('Marks must be a whole number.')
    .min(1, 'Marks must be at least 1.')
    .max(100),
  explanation: z
    .string()
    .trim()
    .max(1000)
    .nullish()
    .transform((value) => value ?? null),
  options: optionsMustHaveExactlyOneCorrect,
});

export type CreateQuestionRequest = z.infer<typeof createQuestionRequestSchema>;

export const updateQuestionRequestSchema = z
  .object({
    subjectId: z.string().trim().min(1, 'Choose a subject.').optional(),
    text: z.string().trim().min(1, 'Enter the question text.').max(2000).optional(),
    marks: z.number().int('Marks must be a whole number.').min(1).max(100).optional(),
    explanation: z
      .string()
      .trim()
      .max(1000)
      .nullish()
      .transform((value) => value ?? null),
    options: optionsMustHaveExactlyOneCorrect.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update.');

export type UpdateQuestionRequest = z.infer<typeof updateQuestionRequestSchema>;

/** Query accepted by the question bank list. */
export const questionListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  subjectId: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type QuestionListQuery = z.infer<typeof questionListQuerySchema>;

export const questionListResponseSchema = z.object({
  items: z.array(questionSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

export type QuestionListResponse = z.infer<typeof questionListResponseSchema>;
