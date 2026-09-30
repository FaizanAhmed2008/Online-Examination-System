# Online Examination System — Demo

A working prototype of the Online Examination System. Frontend only: **no backend, no
database, no login.** Everything on screen is seeded demo data held in the browser, so the
whole thing runs from a single dev server and resets to a known state at any time.

The full requirements this prototype is built from are in
`Online_Examination_System_PRD_v1.0.pdf`.

## Run it

```bash
npm install     # first time only
npm run dev
```

Then open <http://localhost:5174>.

```bash
npm run build   # static build into apps/demo/dist
npm run check   # formatting, lint and type checks
```

## What it covers

**Student**

- Published exams with the time limit, question count, total marks and attempt state
- Instructions screen — nothing is recorded until Start is pressed
- Attempt screen: one question at a time, radio options, previous/next, jump-to-question
  palette, answered-progress bar and a countdown timer
- Answers save the moment they are chosen, so a refresh or a crash costs nothing
- Submit with a two-step confirmation; a paper whose time runs out submits itself
- Result with score, percentage and a per-question review including the explanation

**Faculty**

- Overview of the question bank and papers
- Paper builder: title, subject, instructions, time limit and question selection
- Draft → publish, and add questions to the bank
- Results for every submitted attempt, with score and percentage

Switch roles with the control in the top right. **Reset** returns everything to the seeded
demo data.

## Layout

```
apps/demo/
  src/data.ts      seeded questions, exams, subjects — the whole "database"
  src/store.ts     state, localStorage persistence, grading
  src/App.tsx      shell, role switcher, navigation
  src/student.tsx  exam list, instructions, attempt, result
  src/faculty.tsx  overview, paper builder, results
  src/ui.tsx       shared controls
```

Built with React, TypeScript, Vite and Tailwind CSS.
