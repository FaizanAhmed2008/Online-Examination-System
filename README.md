# Online Examination System

A lightweight, web-based examination platform for students, faculty and administrators.
Built as an academic Software Engineering project.

The product requirements live in [`Online_Examination_System_PRD_v1.0.pdf`](./Online_Examination_System_PRD_v1.0.pdf).
That PRD is the source of truth for scope, roles, features, UX and architecture. This repository
follows it and does not silently change it.

## Current status — Sprint 1 (Faculty exam authoring)

Sign-in, the subject catalogue, the faculty question bank, and exam creation with publishing are
built and covered by tests. **Student attempts, automatic evaluation and result screens are not
started yet**, on purpose: the project is delivered incrementally, one bounded sprint at a time.

| Area            | State                                                                              |
| --------------- | ---------------------------------------------------------------------------------- |
| Repository      | npm workspaces monorepo, TypeScript strict mode, ESLint, Prettier                  |
| Web client      | React + Vite + Tailwind CSS + shadcn/ui, routing and role-aware layout shell       |
| API             | Express + TypeScript, health checks, centralised error handling, Zod config        |
| Database        | PostgreSQL via Docker, Prisma 7 migrations: users, subjects, questions, exams      |
| Shared contract | `@oes/shared` — Zod schemas for auth, subjects, questions, exams and API errors    |
| Tests           | 176 Vitest unit/integration tests across shared, API and web client                |
| Authentication  | Sign-in, httpOnly session cookie, and role guards (FR-01)                          |
| Subjects        | Administrator-managed catalogue, readable by faculty (FR-18)                       |
| Question bank   | Faculty create, edit and archive their own questions (FR-13)                       |
| Exams           | Faculty build a draft from their bank, then publish or unpublish it (FR-14, FR-15) |
| Not started     | Student attempts, automatic evaluation, results, administrator reporting           |

## Technology stack

| Layer        | Choice                                 | Reason                                            |
| ------------ | -------------------------------------- | ------------------------------------------------- |
| Frontend     | React 19, TypeScript, Vite             | Component model, fast dev server, PRD §16         |
| Styling / UI | Tailwind CSS 4, shadcn/ui (radix-vega) | Consistent UI without a proprietary design system |
| Routing      | React Router 8 (library mode)          | Small, explicit route table                       |
| Backend      | Node.js, Express 5, TypeScript         | Simple API architecture for an academic project   |
| Validation   | Zod 4                                  | One schema language shared by client and server   |
| Database     | PostgreSQL 17                          | Reliable relational model for exams and attempts  |
| ORM          | Prisma 7 (`prisma-client` generator)   | Typed data access and reviewable migrations       |
| Logging      | pino                                   | Structured, redacted JSON logs                    |
| Testing      | Vitest, Testing Library, jsdom         | Fast unit and component tests                     |
| Tooling      | npm workspaces, ESLint 10, Prettier 3  | One dependency tree, one config set               |

## Repository structure

```text
online-examination-system/
├── apps/
│   ├── api/                     Express REST API
│   │   ├── prisma/              Prisma schema + migrations
│   │   ├── prisma.config.ts     Prisma CLI configuration
│   │   └── src/
│   │       ├── config/          Environment parsing, logger
│   │       ├── controllers/     HTTP request/response only
│   │       ├── db/              Prisma client access
│   │       ├── lib/             Cross-cutting helpers and error types
│   │       ├── middleware/      Request id, logging, 404, error handler
│   │       ├── routes/          Route table, one router per bounded area
│   │       ├── services/        Business and infrastructure logic
│   │       ├── app.ts           Express app assembly
│   │       └── server.ts        Process entry point, graceful shutdown
│   └── web/                     React client
│       └── src/
│           ├── components/ui/   shadcn/ui primitives
│           ├── config/          Client environment
│           ├── layouts/         Reusable screen shells
│           ├── lib/             API client, utilities
│           ├── pages/           One component per route
│           ├── styles/          Design tokens and global CSS
│           └── routes.tsx       Route table
├── packages/
│   ├── shared/                  @oes/shared — API contract (types + Zod)
│   └── tsconfig.base.json       Shared TypeScript compiler options
├── docs/
│   └── development-conventions.md
├── tests/                       Reserved for end-to-end tests (Playwright, later)
├── docker/
│   └── docker-compose.yml       Local PostgreSQL
├── .env.example
└── package.json                 Workspace root, all commands
```

## Prerequisites

- Node.js 22 or newer (developed on Node 26)
- npm 10 or newer
- Docker with Docker Compose (for the local PostgreSQL)

## Local setup

```bash
# 1. Install dependencies
npm install

# 2. Create the local environment file
cp .env.example .env

# 3. Start PostgreSQL
docker compose -f docker/docker-compose.yml up -d

# 4. Generate the Prisma client and apply migrations
npm run db:generate
npm run db:migrate

# 5. Start the API and the web client together
npm run dev
```

Then open:

- Web client — <http://localhost:5173>
- API health — <http://localhost:4000/api/v1/health>
- API + database readiness — <http://localhost:4000/api/v1/health/ready>

`npm run dev` starts three watchers: the shared package build, the API (`tsx watch`) and the web
client (`vite`). Stop PostgreSQL again with
`docker compose -f docker/docker-compose.yml down`.

## Environment variables

`.env` lives at the repository root and is git-ignored. `.env.example` documents every variable.

| Variable            | Used by | Purpose                                            |
| ------------------- | ------- | -------------------------------------------------- |
| `NODE_ENV`          | api     | `development` \| `test` \| `production`            |
| `PORT`              | api     | HTTP port (default `4000`)                         |
| `DATABASE_URL`      | api     | PostgreSQL connection string for Prisma            |
| `CORS_ORIGIN`       | api     | Comma-separated list of allowed browser origins    |
| `LOG_LEVEL`         | api     | `silent` \| `debug` \| `info` \| `warn` \| `error` |
| `VITE_API_BASE_URL` | web     | API origin used by the browser client              |

Rules: no secret is ever committed, no credential is hardcoded, and every variable is validated by
Zod in `apps/api/src/config/env.ts` at process start.

## Database

`apps/api/prisma/schema.prisma` intentionally contains **no models yet**. The production entities
(PRD §14) are introduced together with the feature that needs them, so the schema and its migrations
stay reviewable. Database connectivity is verified through `GET /api/v1/health/ready`, which executes
a real query through Prisma.

```bash
npm run db:generate   # regenerate the Prisma client
npm run db:migrate    # create + apply a migration (development)
npm run db:status     # compare schema with migration history
npm run db:studio     # open Prisma Studio
```

Migrations live in `apps/api/prisma/migrations` and are committed. Generated Prisma client code
(`apps/api/src/generated`) is not committed.

## Development commands

| Command                | What it does                                             |
| ---------------------- | -------------------------------------------------------- |
| `npm run dev`          | Shared build + API + web client, all watching            |
| `npm run dev:api`      | API only                                                 |
| `npm run dev:web`      | Web client only                                          |
| `npm run build`        | Type-check and build all workspaces                      |
| `npm run typecheck`    | TypeScript `--noEmit` across workspaces                  |
| `npm run lint`         | ESLint over the whole repository                         |
| `npm run lint:fix`     | ESLint with autofix                                      |
| `npm run format`       | Prettier write                                           |
| `npm run format:check` | Prettier verification                                    |
| `npm test`             | Vitest across workspaces                                 |
| `npm run check`        | format:check + lint + typecheck + test (pre-commit gate) |
| `npm run clean`        | Remove build output                                      |

## Testing

```bash
npm test                                  # everything
npm test --workspace @oes/api             # API integration + unit tests
npm test --workspace @oes/shared          # contract schema tests
npm test --workspace @oes/web             # component/route tests
```

- `@oes/shared` — schema accept/reject behaviour of the shared contract.
- `@oes/api` — environment parsing, plus HTTP-level tests that start the real Express app on an
  ephemeral port and assert status codes and response envelopes.
- `@oes/web` — route rendering through a memory router, including the 404 path.

End-to-end tests with Playwright are **not** set up yet; `tests/` is reserved for them and the
suite is introduced when the first real user flow exists (Sprint 6 in the PRD plan).

## Architecture notes

- **Request path**: browser → REST API (`/api/v1`) → route → controller → service → Prisma → PostgreSQL.
  Controllers only translate HTTP to and from services; services hold the logic.
- **The client never sends trusted data.** Roles, scores, ownership and remaining time are decided
  server-side (PRD §21). This foundation only provides the boundary where that will happen.
- **One error envelope.** Every failure leaves the API as
  `{ "error": { "code", "message", "details"? } }` with a code from `@oes/shared`. Clients branch on
  `code`, never on `message`.
- **Validation at the edges.** Environment variables and request payloads are parsed with Zod; the
  same schemas in `@oes/shared` are used by the client to verify what the API returned.
- **No secrets in the client.** The web app only reads `VITE_*` variables, which Vite inlines at
  build time; they must never hold sensitive values.
- **Prisma access is lazy.** The client is created on first use, so importing the app (in tests or
  tooling) never requires a live database.
- **API versioning.** Routes are mounted under `/api/v1` from day one so a future breaking change
  does not break a deployed client.

## Conventions

See [`docs/development-conventions.md`](./docs/development-conventions.md) for naming, file
placement, error handling, styling, testing and database rules.

## Known issues

- `npm audit` reports 4 high-severity advisories in the Prisma toolchain: `prisma` (a dev dependency)
  pulls in `mysql2` and `@prisma/config`, which pulls in `deepmerge-ts`. The application itself only
  ever opens a PostgreSQL connection through `@prisma/adapter-pg` and `pg`, and imports no MySQL code
  path — note that `mysql2` is still _installed_, because `@prisma/client` depends on the CLI for
  `prisma generate`. The advisories disappear when they are fixed upstream, or by pinning Prisma to an
  older major (`npm audit fix --force` does the latter and would move us to Prisma 6.x, so it is a
  deliberate decision, not a reflex).
