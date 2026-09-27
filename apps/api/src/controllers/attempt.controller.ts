import type { Request, RequestHandler } from 'express';
import {
  saveAnswersRequestSchema,
  startAttemptRequestSchema,
  submitAttemptRequestSchema,
} from '@oes/shared';
import type { z } from 'zod';

import type { DatabaseClient } from '../db/prisma.js';
import { HttpError } from '../lib/http-error.js';
import * as attemptService from '../services/attempt.service.js';
import type { AuthenticatedUser } from '../services/auth.service.js';

export interface AttemptControllerDependencies {
  database: DatabaseClient;
}

/**
 * Student attempt endpoints (PRD FR-16).
 *
 *   GET  /attempts/exams   student only, published exams to sit or resume
 *   POST /attempts         student only, starts or resumes an attempt
 *   GET  /attempts/:id     student only, own attempt with its paper
 *   PUT  /attempts/:id/answers student only, autosave
 *   POST /attempts/:id/submit  student only, marks the attempt
 *
 * The router already restricts every route to students. Ownership inside the
 * service is what stops one student reading or submitting another's attempt.
 */
export function createAttemptController({ database }: AttemptControllerDependencies): {
  list: RequestHandler;
  start: RequestHandler;
  get: RequestHandler;
  saveAnswers: RequestHandler;
  submit: RequestHandler;
} {
  const dependencies = { database };

  const list: RequestHandler = async (_req, res) => {
    res.status(200).json(await attemptService.listAvailableExams(requireActor(_req), dependencies));
  };

  const start: RequestHandler = async (req, res) => {
    const input = startAttemptRequestSchema.safeParse(req.body);

    if (!input.success) {
      throw HttpError.badRequest('That exam is not valid.', toDetails(input.error));
    }

    const attempt = await attemptService.startAttempt(input.data, requireActor(req), dependencies);
    res.status(201).json(attempt);
  };

  const get: RequestHandler = async (req, res) => {
    const attempt = await attemptService.getAttempt(
      readAttemptId(req),
      requireActor(req),
      dependencies,
    );

    res.status(200).json(attempt);
  };

  const saveAnswers: RequestHandler = async (req, res) => {
    const input = saveAnswersRequestSchema.safeParse(req.body);

    if (!input.success) {
      throw HttpError.badRequest('Those answers are not valid.', toDetails(input.error));
    }

    const saved = await attemptService.saveAnswers(
      readAttemptId(req),
      input.data.answers,
      requireActor(req),
      dependencies,
    );

    res.status(200).json(saved);
  };

  const submit: RequestHandler = async (req, res) => {
    const input = submitAttemptRequestSchema.safeParse(req.body);

    if (!input.success) {
      throw HttpError.badRequest('Those answers are not valid.', toDetails(input.error));
    }

    const result = await attemptService.submitAttempt(
      readAttemptId(req),
      input.data.answers,
      requireActor(req),
      dependencies,
    );

    res.status(200).json(result);
  };

  return { list, start, get, saveAnswers, submit };
}

/** Every route here sits behind `requireAuth`, so a missing identity is a wiring bug. */
function requireActor(req: Request): AuthenticatedUser {
  if (req.auth === undefined) {
    throw HttpError.unauthenticated();
  }

  return req.auth;
}

function readAttemptId(req: Request): string {
  const value: unknown = req.params['id'];

  if (typeof value !== 'string' || value.length === 0) {
    throw HttpError.badRequest('An attempt id is required.');
  }

  return value;
}

function toDetails(error: z.ZodError): { path: string; message: string }[] {
  return error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
}
