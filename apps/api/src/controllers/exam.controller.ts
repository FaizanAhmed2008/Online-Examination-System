import type { Request, RequestHandler } from 'express';
import { createExamRequestSchema, examListQuerySchema, updateExamRequestSchema } from '@oes/shared';
import type { z } from 'zod';

import type { DatabaseClient } from '../db/prisma.js';
import { HttpError } from '../lib/http-error.js';
import * as examService from '../services/exam.service.js';
import type { AuthenticatedUser } from '../services/auth.service.js';

export interface ExamControllerDependencies {
  database: DatabaseClient;
}

/**
 * Exam creation and publishing endpoints (PRD FR-14, FR-15).
 *
 *   GET    /exams             faculty only, own exams, filterable
 *   GET    /exams/:id         faculty only, own exam with its paper
 *   POST   /exams             faculty only, creates a draft
 *   PATCH  /exams/:id         faculty only, own draft
 *   DELETE /exams/:id         faculty only, own draft
 *   POST   /exams/:id/publish   faculty only, draft -> published
 *   POST   /exams/:id/unpublish faculty only, published -> draft
 *
 * Reads and writes are restricted to faculty by the router. Ownership inside
 * the service is what stops one lecturer editing another's exams.
 */
export function createExamController({ database }: ExamControllerDependencies): {
  list: RequestHandler;
  get: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
  publish: RequestHandler;
  unpublish: RequestHandler;
} {
  const dependencies = { database };

  const list: RequestHandler = async (req, res) => {
    const parsed = examListQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      throw HttpError.badRequest('That exam filter is not valid.', toDetails(parsed.error));
    }

    const page = await examService.listExams(parsed.data, requireActor(req), dependencies);
    res.status(200).json(page);
  };

  const get: RequestHandler = async (req, res) => {
    const exam = await examService.getExam(readExamId(req), requireActor(req), dependencies);
    res.status(200).json(exam);
  };

  const create: RequestHandler = async (req, res) => {
    const input = createExamRequestSchema.safeParse(req.body);

    if (!input.success) {
      throw HttpError.badRequest('The exam is not valid.', toDetails(input.error));
    }

    const created = await examService.createExam(input.data, requireActor(req), dependencies);
    res.status(201).json(created);
  };

  const update: RequestHandler = async (req, res) => {
    const input = updateExamRequestSchema.safeParse(req.body);

    if (!input.success) {
      throw HttpError.badRequest('The exam is not valid.', toDetails(input.error));
    }

    const updated = await examService.updateExam(
      readExamId(req),
      input.data,
      requireActor(req),
      dependencies,
    );

    res.status(200).json(updated);
  };

  const remove: RequestHandler = async (req, res) => {
    await examService.deleteExam(readExamId(req), requireActor(req), dependencies);
    res.status(204).send();
  };

  const publish: RequestHandler = async (req, res) => {
    const published = await examService.publishExam(
      readExamId(req),
      requireActor(req),
      dependencies,
    );
    res.status(200).json(published);
  };

  const unpublish: RequestHandler = async (req, res) => {
    const draft = await examService.unpublishExam(readExamId(req), requireActor(req), dependencies);
    res.status(200).json(draft);
  };

  return { list, get, create, update, remove, publish, unpublish };
}

/** Every route here sits behind `requireAuth`, so a missing identity is a wiring bug. */
function requireActor(req: Request): AuthenticatedUser {
  if (req.auth === undefined) {
    throw HttpError.unauthenticated();
  }

  return req.auth;
}

function readExamId(req: Request): string {
  const value: unknown = req.params['id'];

  if (typeof value !== 'string' || value.length === 0) {
    throw HttpError.badRequest('An exam id is required.');
  }

  return value;
}

function toDetails(error: z.ZodError): { path: string; message: string }[] {
  return error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
}
