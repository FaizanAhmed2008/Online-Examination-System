# Online Examination System

A web application for setting and sitting online examinations. Faculty build multiple-choice
papers from a question bank and publish them; students sign in, sit a timed paper, and review
their result with the correct answers and explanations.

The requirements this is built from are in `Online_Examination_System_PRD_v1.0.pdf`.

## Run it

```bash
npm install     # first time only
npm run dev     # http://localhost:5174
```

```bash
npm run build   # static build into apps/web/dist
npm run check   # formatting, lint and type checks
```

## Signing in

Accounts live in the browser (see `apps/web/src/store.ts`), so there is no server to register
against. Lecturers and students use the same sign-in screen and land on their own screens
afterwards — the screens you get follow the role on the account.

| Role     | Email               | Password     |
| -------- | ------------------- | ------------ |
| Lecturer | `s.osei@oes.edu`    | `faculty123` |
| Lecturer | `r.mensah@oes.edu`  | `faculty123` |
| Student  | `a.khan@oes.edu`    | `student123` |
| Student  | `k.osei@oes.edu`    | `student123` |
| Student  | `e.boateng@oes.edu` | `student123` |

You can add more students in two ways:

- **Self-service** — _Create a student account_ on the sign-in screen.
- **By a lecturer** — the _Students_ tab, which registers an account and shows each student's
  progress.

Lecturer accounts are not created from the interface; they are listed in
`apps/web/src/data.ts` alongside the question bank.

## What it does

**Student**

- Published papers with the time limit, question count, marks and attempt state
- Instructions screen — nothing is recorded until Start is pressed
- Attempt screen: one question at a time, previous/next, a jump-to-question palette, an
  answered-progress bar and a countdown timer
- Answers save the moment they are chosen, so a refresh or a crash costs nothing
- Submit with a two-step confirmation; a paper whose time runs out submits itself
- Result with score, percentage and a per-question review including the explanation

**Faculty**

- Overview of the question bank and the papers they own
- Paper builder: title, subject, instructions, time limit and question selection
- Draft → publish, and add questions to the bank
- Results for every submitted attempt, with score, percentage and answers given
- Student accounts: register a student and see their progress

Each lecturer sees only their own papers and results. **Reset** in the header puts every
account, paper and attempt back to how it started.

## Layout

```
apps/web/src/
  data.ts    the data model, the accounts and the starting question bank and papers
  store.ts   browser storage, sign-in, account creation, grading
  auth.tsx   sign-in and student registration
  App.tsx    shell, role guard, navigation
  student.tsx  exam list, instructions, attempt, result review
  faculty.tsx  overview, paper builder, results, student accounts
  ui.tsx     shared controls
```

Built with React, TypeScript, Vite and Tailwind CSS.
