# Development conventions

Rules established in Sprint 0 (Foundation). They apply to every workspace and are checked by
`npm run check` (format, lint, typecheck, test).

## Repository

- One dependency tree, managed with **npm workspaces**. No extra package manager, no task runner
  beyond `npm run` and `concurrently` for the dev loop.
- Root `package.json` is the only place with cross-workspace scripts. Each workspace keeps its own
  scripts; a developer should rarely need to `cd` into a workspace.
- Secrets never enter the repository. Only `.env.example` is committed; `.env` is ignored.
- Generated code is never committed: `apps/api/src/generated` (Prisma client), `dist`, `coverage`.

## TypeScript

- **Strict mode everywhere.** `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`,
  `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `exactOptionalPropertyTypes`,
  `forceConsistentCasingInFileNames`, `isolatedModules`, `verbatimModuleSyntax`.
- Shared options live in `packages/tsconfig.base.json`; every workspace extends it. Do not restate
  compiler options in a workspace config unless there is a concrete reason.
- `exactOptionalPropertyTypes` is **on**. Omit an optional property instead of assigning `undefined`
  to it: `{ reason: undefined }` and `{}` are different values to an API client, and only the second
  is what we mean. `skipLibCheck` keeps this from fighting third-party React and Express types.
- No `any`. When a type is genuinely unknown, use `unknown` and narrow it. A cast needs a comment
  explaining why it is safe.
- ESM everywhere (`"type": "module"`). In the API, relative imports use the `.js` extension because
  the module resolution is `NodeNext`.
- Types are imported with `import type` (enforced by `@typescript-eslint/consistent-type-imports`).

## Naming and files

- Files are kebab-case (`health.controller.ts`, `system-status` routes); React components are
  PascalCase. Types and schemas are PascalCase; functions and variables are camelCase.
- Constants are UPPER_SNAKE_CASE (`API_PREFIX`).
- One responsibility per file. If a file needs a comment explaining what part does what, it is
  probably two files.
- No "utils grab bag": helpers live next to the feature that owns them, or in `lib/` when shared.

## API (`apps/api`)

Layering, in the order a request flows:

```text
routes/  ->  controllers/  ->  services/  ->  db/
```

- **routes** declare URLs and HTTP methods only, and compose routers.
- **controllers** convert HTTP to and from services: read the request, call one service, set the
  status and body. No business rules, no direct database access.
- **services** hold the logic and are the unit of testing. They receive their dependencies as
  arguments (for example `createHealthController(database)`), so they can be tested without Express
  or a database.
- **db** is the only place that imports the Prisma client.
- Every route is registered in `routes/index.ts`. Nothing is mounted anywhere else.
- Routes are namespaced: `/api/v1/health`, `/api/v1/auth`, `/api/v1/exams`.
- Anything asynchronous inside a controller is `await`ed directly; Express 5 forwards rejected
  promises to the error handler, so no wrapper is needed.

### Errors

- Throw `HttpError` (`lib/http-error.ts`) for expected failures. Use the static helpers
  (`HttpError.notFound()`, `HttpError.conflict()`, ...).
- `middleware/error-handler.ts` is the only place that converts an error into a response. Unknown
  errors become `500 INTERNAL_ERROR` with a generic message.
- Every failure uses the same envelope, defined once in `@oes/shared`:

  ```json
  { "error": { "code": "NOT_FOUND", "message": "Human readable text.", "details": [] } }
  ```

- `code` is for branching, `message` is for humans. Never parse `message`.
- Database and driver errors must not be forwarded to the client: they can contain host names and
  credentials. Log them, return a generic message.
- `requestId` middleware tags every request; the id is returned in `X-Request-Id` and appears in
  every log line, so a user-visible failure can be traced.

### Logging

- Use the `Logger` from `config/logger.ts`. Never `console.log` in the API.
- Log structured objects, not sentences: `logger.info({ requestId, durationMs }, 'request completed')`.
- Never log passwords, tokens, cookies or answer data. The logger redacts the common cases, but the
  rule still applies to what gets passed in.
- Development uses JSON logs on purpose: they stay readable when interleaved and are safe to share.

## Validation

- Zod is the validation library for the whole project: environment variables, request payloads and
  API responses.
- Schemas shared by the client and the server belong in `@oes/shared` so both sides agree on the
  contract. The web app consumes them through a structural `Schema<T>` type, so Zod stays a single
  dependency in one package.
- Validate at the boundary (route input, environment, API response). Do not re-validate deep inside
  services.

## Database

- Prisma 7 with the `prisma-client` generator; the connection is provided by `@prisma/adapter-pg`
  (`pg` driver). The connection string comes from `DATABASE_URL` via `prisma.config.ts`.
- `prisma/schema.prisma` holds no models until a feature needs one. Entities are added with the
  feature that owns them, together with a migration, so the schema never contains speculative tables.
- Migrations are committed; the generated client is not.
- Use `migrate dev` while developing, `migrate deploy` for any shared environment, and never edit an
  applied migration — add a new one.
- Every query goes through Prisma. No raw SQL string interpolation; `$queryRaw` is reserved for
  infrastructure checks such as the readiness probe.
- Schema changes and business rules are discussed in the PRD or a decision record before they are
  implemented (PRD §25).

## Web client (`apps/web`)

- `routes.tsx` is the single route table. Pages are plain components under `pages/`, one per route,
  and hold no data fetching logic beyond calling the API client.
- Screens compose layouts from `layouts/`. A layout owns the shell (header, navigation, container,
  footer); a page owns the content of one route.
- Reusable primitives live in `components/ui` and are owned by this repository (shadcn/ui
  convention). Product-specific components go in `components/<feature>/`.
- Data access goes through `lib/api-client.ts`. Components never call `fetch` directly, and never
  import from `apps/api`.
- Every async surface needs three states: loading (skeleton), error (message + retry) and empty
  (explanation + next action). This is a PRD requirement, not a nicety.
- No business logic in components: a component renders state and raises events.

### Styling

- Tailwind utility classes only. No inline `style` objects, no CSS modules, no new global stylesheets
  for a single component.
- Colours, radii and fonts come from the design tokens in `styles/globals.css`. If a colour is needed
  that does not exist as a token, add a token — do not hardcode a hex value in a component.
- The visual system is minimal and academic: neutral base, one accent (`--primary`), restrained
  status colours, no gradients, no glassmorphism, no decorative animation.
- Reuse an existing component before adding a new one. Two components doing the same job is a bug.

## Testing

- Vitest everywhere, with tests next to the code they cover (`config/env.test.ts` beside
  `config/env.ts`). A test file sits in the directory of the module it covers and carries the same
  base name.
- Name tests after behaviour: `rejects malformed JSON bodies with a validation error`.
- Test the contract, not the implementation. Prefer asserting a status code and a response body over
  asserting internal calls.
- No database, no network, no wall-clock sleeps in unit tests. Inject a fake dependency instead; for
  HTTP tests, start the real app on port `0` and use `fetch`.
- Every bug fix gets a regression test.

## Git

- One bounded change per commit, with a message that says what changed and why.
- Never commit `.env`, `dist`, `coverage` or the generated Prisma client.
- Run `npm run check` before committing.

## Adding a feature

1. Confirm the behaviour is in the PRD; if it is not, add it to the backlog instead of inventing it.
2. Add or change the Prisma model **and** its migration in the same change.
3. Add the Zod schema to `@oes/shared` when both sides need it.
4. Build the API bottom-up: `db` → `service` → `controller` → `route` → test.
5. Build the client: page → layout/component → route entry → test.
6. Update the README status table and any documentation the change affects.
7. Run `npm run check`.
