import type { ApiErrorCode, ApiErrorDetail } from '@oes/shared';

/**
 * Error carrying an HTTP status and a client-safe code. Anything thrown that is
 * not an `HttpError` is treated as an internal error and never leaks details.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: ApiErrorDetail[] | undefined;

  constructor(status: number, code: ApiErrorCode, message: string, details?: ApiErrorDetail[]) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: ApiErrorDetail[]): HttpError {
    return new HttpError(400, 'VALIDATION_ERROR', message, details);
  }

  static unauthenticated(message = 'Authentication is required.'): HttpError {
    return new HttpError(401, 'UNAUTHENTICATED', message);
  }

  static forbidden(message = 'You do not have permission to perform this action.'): HttpError {
    return new HttpError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'The requested resource was not found.'): HttpError {
    return new HttpError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string): HttpError {
    return new HttpError(409, 'CONFLICT', message);
  }
}
