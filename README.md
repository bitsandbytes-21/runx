# RunX

**Run with Don Quixote and Sancho.** A mobile web app that turns a run into an episode of a comedy audio adventure. While you run, Don Quixote and his squire Sancho Panza talk to you in short scenes adapted from the public-domain novel. Pick a 20, 30 or 45 minute run (or 15–60 in 5 minute steps) and a scheduler fits the story to it: an easy opening, rising action, and the climax in your last 3 minutes. Stop early and you choose: **Save for next time** or **Finish the story now**. Progress resumes on your next run.

- **Live app:** _add the production URL after the first deploy (see [deployment guide](docs/deployment.md))_
- **API docs:** `/api/docs` on any deployment (OpenAPI source: [`docs/api/openapi.yaml`](docs/api/openapi.yaml))
- **Course:** CS7180 Project 2, pair project (Yue Li, Uryaswi Bhowmick)

## Features and roles
| Role | Can do |
|---|---|
| **Guest** | Run any length without an account; progress stays on the device; try the accelerated **demo** (a 20 minute plan with a 10x clock, kept separate from real progress) |
| **Runner** (signed in) | Everything a guest can, with progress stored in PostgreSQL per user (row-level security) and restored on any device; guest progress offered for import on first login |
| **Editor** | Manage Episode 1 scenes at `/editor`: edit, add, reorder, publish. Publishing is blocked while the manifest validator reports problems and bumps the manifest version |

Core behaviour: pure scheduler (`buildTimeline`), a run-session state machine (pause, stop sheet, the current line always finishes, a second Stop does nothing), captions for every line, checkpoints CP1–CP3, recap after a 3 day gap, compressed endings, a public REST API.

## Stack
Next.js 16 (App Router, route handlers) · React 19 · TypeScript (strict) · Tailwind CSS 4 with the `DESIGN.md` tokens · Supabase (PostgreSQL, Auth with JWT) · Zod · Vitest + Testing Library · Playwright · GitHub Actions · Vercel.

## Getting started
Requirements: Node 24+, npm.

```bash
git clone <repo-url> && cd runx
npm ci
npm run dev            # http://localhost:3000, guest-only without Supabase
```

To enable accounts and the database, create a Supabase project, run the migration and seed, and copy `.env.example` to `.env.local` with your project URL and anon key. Step-by-step: [docs/deployment.md](docs/deployment.md).

## Commands
| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm test` | Unit and integration tests (Vitest) |
| `npm run test:coverage` | Tests with coverage gates (scheduler ≥ 90%, rest of `src/lib` ≥ 80%) |
| `npm run test:e2e` | Playwright flows at 375 px with silent audio and an accelerated clock |
| `npm run lint` | ESLint and Prettier check |
| `npm run typecheck` | Route type generation and `tsc --noEmit` |
| `npm run build` | Production build |
| `npm run content:build` | Regenerate Episode 1 audio (macOS `say`), manifest and `supabase/seed.sql` from `docs/content/scenes/ep1-script.json` |

Test-only URL parameters: `/run?audio=silent&speed=60` plays captions on a 60x clock without audio (used by E2E); `/?audio=silent&speed=60` forwards them to the next run.

## Documentation
| Document | Contents |
|---|---|
| [docs/PRD.md](docs/PRD.md), [docs/features/](docs/features/README.md) | User stories US-1..US-9 with acceptance criteria; feature PRDs |
| [docs/architecture.md](docs/architecture.md) | Architecture diagram, modules, key flows |
| [docs/architecture/schema.md](docs/architecture/schema.md) | Database schema diagram and row-level security |
| [docs/api/openapi.yaml](docs/api/openapi.yaml) | Public API (served at `/api/docs`) |
| [docs/deployment.md](docs/deployment.md) | Setup, environments, Supabase, Vercel, CI/CD |
| [docs/sprints/](docs/sprints/) | Sprint planning, standups, retrospectives |
| [docs/contribution-log.md](docs/contribution-log.md) | Who did what |
| [docs/spikes/lock-screen-audio.md](docs/spikes/lock-screen-audio.md) | Background audio findings and device test plan |
| [docs/decisions/](docs/decisions/README.md) | Architecture decision records |
| [DESIGN.md](DESIGN.md), [AGENTS.md](AGENTS.md) | Design system; shared rules file for AI tools |
| [docs/SOURCES.md](docs/SOURCES.md) | Public-domain sources and credits |

## Known limits
- Audio is generated with macOS system voices as a placeholder until final TTS voices are chosen.
- Background playback with a locked screen is not yet verified on real devices; see the [spike](docs/spikes/lock-screen-audio.md).
- No pace, speed or body comments, by design. Stopping is always respected.

## Workflow
Every change starts from a GitHub issue; branch `feature/<issue>-desc`; failing test committed first; Conventional Commits with `Refs #N`; one issue per PR, reviewed by the partner, CI green, squash-merged. Details in [AGENTS.md](AGENTS.md).
