import { z } from 'zod';

/**
 * Subject contract (PRD §14, FR-18).
 *
 * Admin manages subjects; faculty and students get a read-only list so a
 * question or exam can be tagged with one.
 */

export const subjectStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

export type SubjectStatus = z.infer<typeof subjectStatusSchema>;

export const subjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  status: subjectStatusSchema,
});

export type Subject = z.infer<typeof subjectSchema>;

export const createSubjectRequestSchema = z.object({
  name: z.string().trim().min(1, 'Enter a subject name.').max(120),
  code: z
    .string()
    .trim()
    .min(1, 'Enter a subject code.')
    .max(20)
    .transform((value) => value.toUpperCase()),
  description: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((value) => value ?? null),
});

export type CreateSubjectRequest = z.infer<typeof createSubjectRequestSchema>;

export const updateSubjectRequestSchema = createSubjectRequestSchema
  .partial()
  .extend({ status: subjectStatusSchema.optional() })
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update.');

export type UpdateSubjectRequest = z.infer<typeof updateSubjectRequestSchema>;

export const subjectListResponseSchema = z.object({
  items: z.array(subjectSchema),
});

export type SubjectListResponse = z.infer<typeof subjectListResponseSchema>;
