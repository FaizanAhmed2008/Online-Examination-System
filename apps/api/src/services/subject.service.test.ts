import { describe, expect, it } from 'vitest';

import type { CreateSubjectRequest } from '@oes/shared';

import type { DatabaseClient } from '../db/prisma.js';
import * as subjectService from './subject.service.js';

function createFakeDatabase() {
  const rows: {
    id: string;
    name: string;
    code: string;
    description: string | null;
    status: 'ACTIVE' | 'INACTIVE';
  }[] = [];

  let nextId = 1;

  const database = {
    subject: {
      findMany: async ({ where }: { where: { status?: 'ACTIVE' | 'INACTIVE' } }) =>
        rows
          .filter((row) => where.status === undefined || row.status === where.status)
          .sort((left, right) => left.name.localeCompare(right.name)),
      findUnique: async ({ where }: { where: { id?: string; code?: string } }) => {
        return (
          rows.find((row) =>
            where.id === undefined ? row.code === where.code : row.id === where.id,
          ) ?? null
        );
      },
      create: async ({ data }: { data: Omit<(typeof rows)[number], 'id' | 'status'> }) => {
        const row = { id: `subject-${nextId++}`, status: 'ACTIVE' as const, ...data };
        rows.push(row);
        return row;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<Omit<(typeof rows)[number], 'id'>>;
      }) => {
        const index = rows.findIndex((row) => row.id === where.id);
        const existing = rows[index];

        if (existing === undefined) {
          throw new Error('update called for a missing subject');
        }

        rows[index] = { ...existing, ...data };
        return rows[index] as (typeof rows)[number];
      },
    },
  } as unknown as DatabaseClient;

  return { database, rows };
}

function validSubject(overrides: Partial<CreateSubjectRequest> = {}): CreateSubjectRequest {
  return { name: 'Operating Systems', code: 'cs204', description: null, ...overrides };
}

describe('createSubject', () => {
  it('creates an active subject', async () => {
    const { database } = createFakeDatabase();

    const created = await subjectService.createSubject(validSubject(), { database });

    expect(created.code).toBe('CS204');
    expect(created.status).toBe('ACTIVE');
  });

  it('rejects a duplicate code', async () => {
    const { database } = createFakeDatabase();
    await subjectService.createSubject(validSubject(), { database });

    await expect(
      subjectService.createSubject(validSubject({ name: 'Networks' }), { database }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe('listSubjects', () => {
  it('hides archived subjects by default', async () => {
    const { database } = createFakeDatabase();
    const subject = await subjectService.createSubject(validSubject(), { database });
    await subjectService.archiveSubject(subject.id, { database });

    const active = await subjectService.listSubjects({ database });
    const all = await subjectService.listSubjects({ database }, { includeInactive: true });

    expect(active).toEqual([]);
    expect(all).toHaveLength(1);
  });

  it('sorts by name', async () => {
    const { database } = createFakeDatabase();
    await subjectService.createSubject(validSubject({ name: 'Zoology', code: 'BIO' }), {
      database,
    });
    await subjectService.createSubject(validSubject({ name: 'Algebra', code: 'MATH' }), {
      database,
    });

    const subjects = await subjectService.listSubjects({ database });

    expect(subjects.map((subject) => subject.name)).toEqual(['Algebra', 'Zoology']);
  });
});

describe('updateSubject', () => {
  it('updates the name', async () => {
    const { database } = createFakeDatabase();
    const created = await subjectService.createSubject(validSubject(), { database });

    const updated = await subjectService.updateSubject(created.id, { name: 'OS' }, { database });

    expect(updated.name).toBe('OS');
  });

  it('allows saving a subject without changing its own code', async () => {
    const { database } = createFakeDatabase();
    const created = await subjectService.createSubject(validSubject(), { database });

    const updated = await subjectService.updateSubject(created.id, { code: 'CS204' }, { database });

    expect(updated.code).toBe('CS204');
  });

  it('rejects taking another subject’s code', async () => {
    const { database } = createFakeDatabase();
    const first = await subjectService.createSubject(validSubject(), { database });
    await subjectService.createSubject(validSubject({ name: 'Networks', code: 'CS305' }), {
      database,
    });

    await expect(
      subjectService.updateSubject(first.id, { code: 'CS305' }, { database }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('404s for an unknown id', async () => {
    const { database } = createFakeDatabase();

    await expect(
      subjectService.updateSubject('nope', { name: 'X' }, { database }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('archiveSubject', () => {
  it('deactivates instead of removing the row', async () => {
    const { database, rows } = createFakeDatabase();
    const created = await subjectService.createSubject(validSubject(), { database });

    const archived = await subjectService.archiveSubject(created.id, { database });

    expect(archived.status).toBe('INACTIVE');
    expect(rows).toHaveLength(1);
  });
});
