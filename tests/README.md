# End-to-end tests

Reserved for the Playwright suite described in PRD §19.

Nothing is configured here yet, on purpose. An end-to-end test is only worth writing once a real
user flow exists to test — the first candidates are:

- a student logs in and reaches the correct dashboard
- faculty creates, previews and publishes an exam
- a student starts an exam, answers, refreshes, and submits
- submission produces exactly one result

Until then the workspaces hold their own tests:

```bash
npm test --workspace @oes/api
npm test --workspace @oes/web
npm test --workspace @oes/shared
```

When the suite is introduced it will own the `dev` server lifecycle (web + API + database) and run
against `http://localhost:5173`.
