import {
  apiErrorResponseSchema,
  type ApiErrorCode,
  type ApiErrorDetail,
  type Attempt,
  attemptResultSchema,
  attemptSchema,
  type AttemptAnswerInput,
  type AvailableExam,
  availableExamsResponseSchema,
  type CreateExamRequest,
  type CreateQuestionRequest,
  type CreateSubjectRequest,
  type Exam,
  type ExamListQuery,
  examListResponseSchema,
  examSchema,
  type ExamSummary,
  type LoginRequest,
  type LoginResponse,
  loginResponseSchema,
  type LivenessResponse,
  livenessResponseSchema,
  type Question,
  questionListResponseSchema,
  type QuestionListQuery,
  type ReadinessResponse,
  readinessResponseSchema,
  type SaveAnswersResponse,
  saveAnswersResponseSchema,
  type SessionUser,
  type StartAttemptRequest,
  type Subject,
  subjectListResponseSchema,
  subjectSchema,
  questionSchema,
  type SubmitAttemptRequest,
  type UpdateExamRequest,
  type UpdateQuestionRequest,
  type UpdateSubjectRequest,
} from '@oes/shared';

import { API_BASE_URL } from '@/config/env';

/** Structural subset of a Zod schema, so the web app does not depend on Zod directly. */
interface Schema<T> {
  safeParse(data: unknown): { success: true; data: T } | { success: false };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode | 'NETWORK_ERROR';
  readonly details: ApiErrorDetail[];

  constructor(
    status: number,
    code: ApiErrorCode | 'NETWORK_ERROR',
    message: string,
    details: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const API_PREFIX = '/api/v1';

interface RawResponse {
  status: number;
  /** Parsed JSON body, or `null` when the response had none. */
  payload: unknown;
}

interface SendOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/**
 * Performs one request and returns its status and parsed body.
 *
 * `credentials: 'include'` is required because the session lives in an httpOnly
 * cookie that this code cannot read; without it the cookie is never sent and
 * every authenticated call looks signed out (PRD §21).
 */
async function send(
  path: string,
  { method = 'GET', body }: SendOptions = {},
): Promise<RawResponse> {
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
      method,
      headers,
      credentials: 'include',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      `Could not reach the API at ${API_BASE_URL}. Is the server running?`,
    );
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsedError = apiErrorResponseSchema.safeParse(payload);

    if (parsedError.success) {
      throw new ApiError(
        response.status,
        parsedError.data.error.code,
        parsedError.data.error.message,
        parsedError.data.error.details ?? [],
      );
    }

    throw new ApiError(response.status, 'INTERNAL_ERROR', 'The server returned an error.');
  }

  return { status: response.status, payload };
}

function contractBreach(status: number): ApiError {
  return new ApiError(status, 'INTERNAL_ERROR', 'The server returned an unexpected response.');
}

async function request<T>(path: string, schema: Schema<T>, options: SendOptions = {}): Promise<T> {
  const { status, payload } = await send(path, options);
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    throw contractBreach(status);
  }

  return parsed.data;
}

export function getLiveness(): Promise<LivenessResponse> {
  return request('/health', livenessResponseSchema);
}

export function getReadiness(): Promise<ReadinessResponse> {
  return request('/health/ready', readinessResponseSchema);
}

/** Signs in. The API sets the session cookie; this code never sees the token. */
export function login(credentials: LoginRequest): Promise<LoginResponse> {
  return request('/auth/login', loginResponseSchema, { method: 'POST', body: credentials });
}

/** Signs out. The API revokes the session and clears the cookie. */
export async function logout(): Promise<void> {
  await send('/auth/logout', { method: 'POST' });
}

/**
 * Reads the current session. The API answers `{ user: SessionUser }`, so the
 * wrapper is unwrapped here rather than assuming the bare user shape.
 */
export async function getCurrentUser(): Promise<SessionUser> {
  const { status, payload } = await send('/auth/me');
  const parsed = loginResponseSchema.safeParse(payload);

  if (!parsed.success) {
    throw contractBreach(status);
  }

  return parsed.data.user;
}

/* -------------------------------------------------------------------------- */
/* Subjects (admin-managed, read-only for faculty)                           */
/* -------------------------------------------------------------------------- */

export async function listSubjects(
  options: { includeInactive?: boolean } = {},
): Promise<Subject[]> {
  const query =
    options.includeInactive === true || options.includeInactive === undefined
      ? ''
      : '?includeInactive=false';
  const { status, payload } = await send(`/subjects${query}`);
  const parsed = subjectListResponseSchema.safeParse(payload);

  if (!parsed.success) {
    throw contractBreach(status);
  }

  return parsed.data.items;
}

export async function createSubject(input: CreateSubjectRequest): Promise<Subject> {
  return request('/subjects', subjectSchema, { method: 'POST', body: input });
}

export async function updateSubject(id: string, input: UpdateSubjectRequest): Promise<Subject> {
  return request(`/subjects/${id}`, subjectSchema, { method: 'PATCH', body: input });
}

export async function archiveSubject(id: string): Promise<Subject> {
  return request(`/subjects/${id}`, subjectSchema, { method: 'DELETE' });
}

/* -------------------------------------------------------------------------- */
/* Question bank (faculty)                                                    */
/* -------------------------------------------------------------------------- */

function questionListPath(query: QuestionListQuery): string {
  const params = new URLSearchParams();

  if (query.q !== undefined && query.q.length > 0) params.set('q', query.q);
  if (query.subjectId !== undefined && query.subjectId.length > 0)
    params.set('subjectId', query.subjectId);

  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));

  return `/questions?${params.toString()}`;
}

export async function listQuestions(
  query: Partial<QuestionListQuery> = {},
): Promise<{ items: Question[]; page: number; pageSize: number; total: number }> {
  return request(questionListPath({ page: 1, pageSize: 20, ...query }), questionListResponseSchema);
}

export async function createQuestion(input: CreateQuestionRequest): Promise<Question> {
  return request('/questions', questionSchema, { method: 'POST', body: input });
}

export async function updateQuestion(id: string, input: UpdateQuestionRequest): Promise<Question> {
  return request(`/questions/${id}`, questionSchema, { method: 'PATCH', body: input });
}

/** Archives the question. The API keeps the row so published exams survive. */
export async function archiveQuestion(id: string): Promise<Question> {
  return request(`/questions/${id}`, questionSchema, { method: 'DELETE' });
}

/* -------------------------------------------------------------------------- */
/* Exams (faculty: create a draft, then publish)                                */
/* -------------------------------------------------------------------------- */

function examListPath(query: ExamListQuery): string {
  const params = new URLSearchParams();

  if (query.status !== undefined) params.set('status', query.status);
  if (query.subjectId !== undefined && query.subjectId.length > 0)
    params.set('subjectId', query.subjectId);

  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));

  return `/exams?${params.toString()}`;
}

export async function listExams(
  query: Partial<ExamListQuery> = {},
): Promise<{ items: ExamSummary[]; page: number; pageSize: number; total: number }> {
  return request(examListPath({ page: 1, pageSize: 20, ...query }), examListResponseSchema);
}

/** Reads one exam with its full paper, which the list shape deliberately omits. */
export function getExam(id: string): Promise<Exam> {
  return request(`/exams/${id}`, examSchema);
}

export function createExam(input: CreateExamRequest): Promise<Exam> {
  return request('/exams', examSchema, { method: 'POST', body: input });
}

export function updateExam(id: string, input: UpdateExamRequest): Promise<Exam> {
  return request(`/exams/${id}`, examSchema, { method: 'PATCH', body: input });
}

/** Deletes a draft. The API refuses this for a published exam. */
export async function deleteExam(id: string): Promise<void> {
  await send(`/exams/${id}`, { method: 'DELETE' });
}

export function publishExam(id: string): Promise<Exam> {
  return request(`/exams/${id}/publish`, examSchema, { method: 'POST' });
}

export function unpublishExam(id: string): Promise<Exam> {
  return request(`/exams/${id}/unpublish`, examSchema, { method: 'POST' });
}

/* -------------------------------------------------------------------------- */
/* Attempts (student: available exams, then start, answer and submit)          */
/* -------------------------------------------------------------------------- */

export async function listAvailableExams(): Promise<AvailableExam[]> {
  const { status, payload } = await send('/attempts/exams');
  const parsed = availableExamsResponseSchema.safeParse(payload);

  if (!parsed.success) {
    throw contractBreach(status);
  }

  return parsed.data.items;
}

/**
 * Starts an attempt, or resumes the one already in flight. The API makes this
 * idempotent, so a double click or a refresh cannot consume a second attempt.
 */
export function startAttempt(input: StartAttemptRequest): Promise<Attempt> {
  return request('/attempts', attemptSchema, { method: 'POST', body: input });
}

/** Reads an attempt for resume, including the answers already given. */
export function getAttempt(id: string): Promise<Attempt> {
  return request(`/attempts/${id}`, attemptSchema);
}

export function saveAttemptAnswers(
  id: string,
  answers: AttemptAnswerInput[],
): Promise<SaveAnswersResponse> {
  return request(`/attempts/${id}/answers`, saveAnswersResponseSchema, {
    method: 'PUT',
    body: { answers },
  });
}

export function submitAttempt(id: string, answers: AttemptAnswerInput[]) {
  return request(`/attempts/${id}/submit`, attemptResultSchema, {
    method: 'POST',
    body: { answers } satisfies SubmitAttemptRequest,
  });
}
