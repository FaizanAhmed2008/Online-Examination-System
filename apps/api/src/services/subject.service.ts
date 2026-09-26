import type { DatabaseClient } from '../db/prisma.js';
import { HttpError } from '../lib/http-error.js';
import type { CreateSubjectRequest, UpdateSubjectRequest } from '@oes/shared';
import { SubjectStatus } from '../generated/prisma/client.js';

export interface SubjectServiceDependencies {
  database: DatabaseClient;
}

export interface SubjectView {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

/**
 * Subjects (PRD FR-18).
 *
 * Read access is open to every signed-in role, because faculty must be able to
 * tag a question with a subject. Writes are admin-only and are enforced by the
 * route guard; this service still refuses to write without an admin identity,
 * so the rule does not depend on the router being mounted correctly.
 */
export async function listSubjects(
  { database }: SubjectServiceDependencies,
  options: { includeInactive: boolean } = { includeInactive: false },
): Promise<SubjectView[]> {
  const rows = await database.subject.findMany({
    where: options.includeInactive ? {} : { status: SubjectStatus.ACTIVE },
    orderBy: { name: 'asc' },
  });

  return rows.map(toView);
}

export async function createSubject(
  input: CreateSubjectRequest,
  { database }: SubjectServiceDependencies,
): Promise<SubjectView> {
  // Upper-cased here as well as in the schema, so the storage invariant holds
  // no matter which caller reaches the service.
  const code = normaliseCode(input.code);
  await assertCodeIsFree(database, code, undefined);

  const created = await database.subject.create({
    data: {
      name: input.name,
      code,
      description: input.description ?? null,
    },
  });

  return toView(created);
}

export async function updateSubject(
  id: string,
  input: UpdateSubjectRequest,
  { database }: SubjectServiceDependencies,
): Promise<SubjectView> {
  const existing = await database.subject.findUnique({ where: { id } });

  // A subject that does not exist and one the caller may not see are reported
  // identically, so ids cannot be probed.
  if (existing === null) {
    throw HttpError.notFound('That subject does not exist.');
  }

  if (input.code !== undefined && normaliseCode(input.code) !== existing.code) {
    await assertCodeIsFree(database, normaliseCode(input.code), id);
  }

  const updated = await database.subject.update({
    where: { id },
    data: {
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.code === undefined ? {} : { code: normaliseCode(input.code) }),
      ...(input.description === undefined ? {} : { description: input.description }),
      ...(input.status === undefined ? {} : { status: input.status }),
    },
  });

  return toView(updated);
}

/**
 * Retires a subject instead of deleting it. Questions reference subjects, so a
 * hard delete would either fail or cascade away authored content; archiving
 * keeps the history intact (PRD §21).
 */
export async function archiveSubject(
  id: string,
  { database }: SubjectServiceDependencies,
): Promise<SubjectView> {
  const existing = await database.subject.findUnique({ where: { id } });

  if (existing === null) {
    throw HttpError.notFound('That subject does not exist.');
  }

  const updated = await database.subject.update({
    where: { id },
    data: { status: SubjectStatus.INACTIVE },
  });

  return toView(updated);
}

function normaliseCode(code: string): string {
  return code.trim().toUpperCase();
}

async function assertCodeIsFree(
  database: DatabaseClient,
  code: string,
  ignoreId: string | undefined,
): Promise<void> {
  const existing = await database.subject.findUnique({ where: { code } });

  if (existing !== null && existing.id !== ignoreId) {
    throw HttpError.conflict(`The subject code ${code} is already in use.`);
  }
}

function toView(row: {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}): SubjectView {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    status: row.status,
  };
}
