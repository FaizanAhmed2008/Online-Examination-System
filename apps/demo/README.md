# Online Examination System — Demo

A working prototype of the Online Examination System. **No backend, no database, no
login.** All data is seeded into the browser and kept in `localStorage`, so it runs from
a single Vite dev server and can be reset to its seeded state at any time.

## Run it

```bash
npm run dev:demo          # from the repository root
```

Then open <http://localhost:5174>.

To produce a static build you can host anywhere:

```bash
npm run build:demo        # output in apps/demo/dist
```

## What to show

1. **Student → My exams.** Two published exams and their state (not started / in
   progress / submitted).
2. **View details → Start attempt.** Instructions, question count, marks and time limit.
   Nothing is recorded until you press Start.
3. **The attempt.** One question at a time, radio options, previous/next, a jump-to-question
   palette, an answered-progress bar, and a countdown timer. Answers save as you choose
   them, so a refresh costs nothing.
4. **Submit** (two clicks, so it cannot happen by accident). Time running out submits
   automatically.
5. **Result.** Score, percentage, and a per-question review with the correct answer and the
   explanation.
6. **Faculty role** (top right). Overview, edit or publish the seeded draft paper, add a
   question to the bank, and see submitted attempts under **Results**.

Use **Reset** in the header to return to the seeded demo data between runs.

## Layout

| File              | Purpose                                                     |
| ----------------- | ----------------------------------------------------------- |
| `src/data.ts`     | Seeded questions, exams and subjects — the whole "database" |
| `src/store.ts`    | In-memory state, `localStorage` persistence, grading        |
| `src/App.tsx`     | Shell, role switcher, navigation state machine              |
| `src/student.tsx` | Exam list, instructions, attempt screen, result review      |
| `src/faculty.tsx` | Overview, paper builder, results                            |
| `src/ui.tsx`      | Small shared controls                                       |
