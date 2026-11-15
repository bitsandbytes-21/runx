# P2 submission checklist

Where each required deliverable lives. Items marked **you** cannot be produced from the repo.

| Deliverable | Where | Status |
|---|---|---|
| GitHub repository | https://github.com/bitsandbytes-21/runx | Done |
| Deployed application | Production URL in the [README](../README.md) | **you**: after Supabase and Vercel setup ([deployment guide](deployment.md)) |
| README | [README.md](../README.md) | Done |
| API documentation (OpenAPI) | [docs/api/openapi.yaml](api/openapi.yaml); interactive at `/api/docs` | Done |
| Architecture diagram | [docs/architecture.md](architecture.md) | Done |
| Database schema diagram | [docs/architecture/schema.md](architecture/schema.md) | Done |
| Setup and deployment guide | [docs/deployment.md](deployment.md) | Done |
| User stories, acceptance criteria | [docs/PRD.md](PRD.md), [docs/features/](features/), GitHub issues #1–#16 | Done |
| Sprints as milestones (5+ issues each) | [Milestones](https://github.com/bitsandbytes-21/runx/milestones): Sprint 1 (8 issues), Sprint 2 (8+ issues) | Done |
| Sprint planning with estimates | [Sprint 1](sprints/sprint-1/planning.md), [Sprint 2](sprints/sprint-2/planning.md) | Done |
| Standups | [Sprint 2 standups](sprints/sprint-2/standups.md) | **you**: add your entries |
| Retrospective | [Sprint 2 retro](sprints/sprint-2/retro.md) | Metrics filled; **you**: what went well / not, changes |
| PRs with CI on every PR | [Closed PRs #17–#31](https://github.com/bitsandbytes-21/runx/pulls?q=is%3Apr+is%3Aclosed) | Done (self-reviewed, CI green, squash-merged) |
| TDD evidence | Red `test(...)` commit before `feat(...)` in each PR's commit list | Done |
| Unit, integration, E2E tests | `tests/unit`, `tests/integration` (290 tests), `e2e/` (7 Playwright flows) | Done |
| Multi-stage CI/CD, security scan | [.github/workflows/ci.yml](../.github/workflows/ci.yml), [codeql.yml](../.github/workflows/codeql.yml) | Done; deploy jobs need the Vercel secrets |
| Contribution log | [docs/contribution-log.md](contribution-log.md) | Done |
| 10-minute demo video | Script: [docs/demo-script.md](demo-script.md) | **you**: record, upload, add the link to the README |
| Individual reflection (300 words) | Canvas | **you** |

## Numbers to quote (from `main`, 2026-11-15)
- 46 test files, 290 unit and integration tests; 7 end-to-end flows.
- Coverage: 93.8% lines and 84.6% branches overall; scheduler 97.6% lines and 97.8% branches.
- `npm audit`: 0 vulnerabilities; CodeQL green.
