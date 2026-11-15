# Sprint 2 retrospective

Fill this in at the end of the sprint.

## What went well

## What did not go well

## What I change next time
<!-- Each item: the change and the file or process it touches -->

## Metrics
- Issues planned / done: 15 / 15 (#2–#16, including the 7 Sprint 1 carry-overs); PRs #17–#31 merged
- Tests: 290 unit + integration tests in 46 files, 7 E2E flows; coverage 93.8% lines / 84.6% branches, scheduler 97.6% / 97.8%
- Rules file (AGENTS.md) changes made because of this sprint: Next.js 16 gotchas (Suspense and `connection()` under `cacheComponents`, `proxy.ts` as an optimistic guard, generated files not hand-edited, clicking labels of `sr-only` radios in Playwright, regenerating the lockfile with npm 10); solo workflow with self-review
- CI incident: npm 11 on macOS dropped Linux-only optional packages from `package-lock.json`, so `npm ci` failed on every PR until the lockfile was regenerated with npm 10
