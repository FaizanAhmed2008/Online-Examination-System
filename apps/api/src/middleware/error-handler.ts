import { ZodError } from 'zod';

import type { Logger } from '../config/logger.js';
import { HttpError } from '../lib/http-error.js';

import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Terminal handler for unmatched routes. Keeps 404s in the standard envelope. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(HttpError.notFound(`No route matches ${req.method} ${req.path}.`));
};

export interface ErrorHandlerOptions {
  logger: Logger;
}

/**
 * Centralised error handling. Every failure leaves the API in the shape
 * `{ error: { code, message, details? } }`; internal details stay server-side.
 */
export function createErrorHandler({ logger }: ErrorHandlerOptions) {
  return (error: unknown, req: Request, res: Response, next: NextFunction): void => {
    if (res.headersSent) {
      next(error);
      return;
    }

    const httpError = toHttpError(error);
    const context = {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      status: httpError.status,
      code: httpError.code,
    };

    if (httpError.status >= 500) {
      logger.error(
        { ...context, cause: error instanceof Error ? error.message : String(error) },
        error instanceof Error ? error.stack : 'unhandled error',
      );
    } else {
      logger.warn(context, httpError.message);
    }

    res.status(httpError.status).json({
      error: {
        code: httpError.code,
        message: httpError.message,
        ...(httpError.details ? { details: httpError.details } : {}),
      },
    });
  };
}

/** Body-parser failures, mapped to client-safe errors. */
const BODY_PARSER_ERRORS: Record<string, HttpError> = {
  'entity.parse.failed': new HttpError(400, 'VALIDATION_ERROR', 'Request body is not valid JSON.'),
  'entity.too.large': new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.'),
};

/** Maps known failures to client-safe HTTP errors. */
function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  if (error instanceof ZodError) {
    return HttpError.badRequest(
      'Request validation failed.',
      error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }

  if (typeof error === 'object' && error !== null && 'type' in error) {
    const bodyError = BODY_PARSER_ERRORS[String(error.type)];
    if (bodyError) {
      return bodyError;
    }
  }

  return new HttpError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
}
