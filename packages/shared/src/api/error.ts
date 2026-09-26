import { z } from 'zod';

/**
 * Canonical, machine-readable error codes returned by the API.
 * Clients branch on `code`, never on `message`.
 */
export const API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'PAYLOAD_TOO_LARGE',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'INTERNAL_ERROR',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** Field-level validation detail. Never contains payload values, only keys. */
export const apiErrorDetailSchema = z.object({
  path: z.string(),
  message: z.string(),
});

export type ApiErrorDetail = z.infer<typeof apiErrorDetailSchema>;

/** Every failed API response uses this envelope. */
export const apiErrorResponseSchema = z.object({
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    message: z.string(),
    details: z.array(apiErrorDetailSchema).optional(),
  }),
});

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
