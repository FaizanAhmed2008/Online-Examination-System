import type { Request, RequestHandler } from 'express';
import {
  createQuestionRequestSchema,
  questionListQuerySchema,
  updateQuestionRequestSchema,
} from '@oes/shared';
import type { z } from 'zod';

import type { DatabaseClient } from '../db/prisma.js';
import { HttpError } from '../lib/http-error.js';
import * as questionService from '../services/question.service.js';
import type { AuthenticatedUser } from '../services/auth.service.js';

export interface QuestionControllerDependencies {
  database: DatabaseClient;
}

/**
 * Question bank endpoints (PRD FR-13).
 *
 *   GET    /questions         faculty only, own questions, searchable
 *   GET    /questions/:id     faculty only, own question
 *   POST   /questions         faculty only
 *   PATCH  /questions/:id     faculty only, own question
 *   DELETE /questions/:id     faculty only, own question (archives)
 *
 * Reads and writes are restricted to faculty by the router. Ownership inside
 * the service is what stops one lecturer editing another's questions.
 */
export function createQuestionController({ database }: QuestionControllerDependencies): {
  list: RequestHandler;
  get: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  archive: RequestHandler;
} {
  const dependencies = { database };

  const list: RequestHandler = async (req, res) => {
    const parsed = questionListQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      throw HttpError.badRequest('That question filter is not valid.', toDetails(parsed.error));
    }

    const page = await questionService.listQuestions(parsed.data, requireActor(req), dependencies);
    res.status(200).json(page);
  };

  const get: RequestHandler = async (req, res) => {
    const question = await questionService.getQuestion(
      readQuestionId(req),
      requireActor(req),
      dependencies,
    );
    res.status(200).json(question);
  };

  const create: RequestHandler = async (req, res) => {
    const input = createQuestionRequestSchema.safeParse(req.body);

    if (!input.success) {
      throw HttpError.badRequest('The question is not valid.', toDetails(input.error));
    }

    const created = await questionService.createQuestion(
      input.data,
      requireActor(req),
      dependencies,
    );
    res.status(201).json(created);
  };

  const update: RequestHandler = async (req, res) => {
    const input = updateQuestionRequestSchema.safeParse(req.body);

    if (!input.success) {
      throw HttpError.badRequest('The question is not valid.', toDetails(input.error));
    }

    const updated = await questionService.updateQuestion(
      readQuestionId(req),
      input.data,
      requireActor(req),
      dependencies,
    );

    res.status(200).json(updated);
  };

  const archive: RequestHandler = async (req, res) => {
    const archived = await questionService.archiveQuestion(
      readQuestionId(req),
      requireActor(req),
      dependencies,
    );
    res.status(200).json(archived);
  };

  return { list, get, create, update, archive };
}

/** Every route here sits behind `requireAuth`, so a missing identity is a wiring bug. */
function requireActor(req: Request): AuthenticatedUser {
  if (req.auth === undefined) {
    throw HttpError.unauthenticated();
  }

  return req.auth;
}

function readQuestionId(req: Request): string {
  const value: unknown = req.params['id'];

  if (typeof value !== 'string' || value.length === 0) {
    throw HttpError.badRequest('A question id is required.');
  }

  return value;
}

function toDetails(error: z.ZodError): { path: string; message: string }[] {
  return error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
}
