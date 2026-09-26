import type { Request, RequestHandler, Response } from 'express';
import { createSubjectRequestSchema, updateSubjectRequestSchema } from '@oes/shared';
import { z } from 'zod';

import type { DatabaseClient } from '../db/prisma.js';
import { HttpError } from '../lib/http-error.js';
import * as subjectService from '../services/subject.service.js';

export interface SubjectControllerDependencies {
  database: DatabaseClient;
}

/** Admins see archived subjects in the list; other roles only see active ones. */
const subjectListQuerySchema = z.object({
  includeInactive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .default(false),
});

/**
 * Subject endpoints (PRD FR-18).
 *
 *   GET    /subjects          every signed-in role
 *   POST   /subjects          admin only
 *   PATCH  /subjects/:id      admin only
 *   DELETE /subjects/:id      admin only (archives)
 *
 * The admin guard is applied in the router; this controller reports 403 for a
 * non-admin too, so the rule survives a change in how the routes are mounted.
 */
export function createSubjectController({ database }: SubjectControllerDependencies): {
  list: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  archive: RequestHandler;
} {
  const dependencies = { database };

  const list: RequestHandler = async (req: Request, res: Response) => {
    const parsed = subjectListQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      throw HttpError.badRequest('That subject filter is not valid.');
    }

    const items = await subjectService.listSubjects(dependencies, {
      includeInactive: parsed.data.includeInactive,
    });

    res.status(200).json({ items });
  };

  const create: RequestHandler = async (req, res) => {
    const input = createSubjectRequestSchema.safeParse(req.body);

    if (!input.success) {
      throw HttpError.badRequest('The subject is not valid.', toDetails(input.error));
    }

    const created = await subjectService.createSubject(input.data, dependencies);
    res.status(201).json(created);
  };

  const update: RequestHandler = async (req, res) => {
    const input = updateSubjectRequestSchema.safeParse(req.body);

    if (!input.success) {
      throw HttpError.badRequest('The subject is not valid.', toDetails(input.error));
    }

    const updated = await subjectService.updateSubject(
      readSubjectId(req),
      input.data,
      dependencies,
    );

    res.status(200).json(updated);
  };

  const archive: RequestHandler = async (req, res) => {
    const archived = await subjectService.archiveSubject(readSubjectId(req), dependencies);
    res.status(200).json(archived);
  };

  return { list, create, update, archive };
}

function readSubjectId(req: Request): string {
  const value: unknown = req.params['id'];

  if (typeof value !== 'string' || value.length === 0) {
    throw HttpError.badRequest('A subject id is required.');
  }

  return value;
}

function toDetails(error: z.ZodError): { path: string; message: string }[] {
  return error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
}
