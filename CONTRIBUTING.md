# Contributing

Bug reports, corrections to the math and new teaching modules are all welcome.

## Setup

```bash
npm install
npm run dev
```

## Before you open a pull request

- `npx vitest run` passes
- `npm run build` passes
- New DSP or RF math comes with a test that checks it against a known value
  (a textbook result, a reference implementation, or a hand calculation)

## Guidelines

- Keep each module self-contained: its components, its state hook and its DSP code.
- Everything runs in the browser. Don't add a backend.
- If a module shows a result, its "Learn" section should explain where the number comes from.
- Keep pull requests small and focused on one change.

If you find a wrong formula or a misleading explanation, open an issue with a reference. Those are the most useful reports for a teaching tool.
