# Setup and deployment guide

## Environments
| Environment | Where | Supabase | Deployed by |
|---|---|---|---|
| Development | `npm run dev` on a laptop | none (guest-only) or a personal/staging project in `.env.local` | you |
| CI | GitHub Actions | **none**: CI never sees credentials | every PR and push |
| Preview | Vercel preview URL per PR | staging project (Vercel "Preview" env vars) | `deploy-preview` job in `.github/workflows/ci.yml` |
| Production | Vercel production URL | production project (Vercel "Production" env vars) | `deploy-production` job on push to `main` |

Variables (names only, see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The anon key is public by design; all data access is limited by row-level security. The app never needs the service-role key.

## 1. Local setup
```bash
npm ci
npm run dev          # guest-only
npm test && npm run test:e2e && npm run lint && npm run typecheck && npm run build
```
Playwright needs its browser once: `npx playwright install chromium`.

## 2. Supabase (database and auth)
1. Create a project at supabase.com (one for staging/preview, one for production).
2. In **SQL Editor**, run `supabase/migrations/20261101000000_initial_schema.sql`, then `supabase/seed.sql`. With the Supabase CLI instead: `supabase link --project-ref <ref>` then `supabase db push` and `psql "$DATABASE_URL" -f supabase/seed.sql`.
3. **Authentication → Providers:** Email enabled. Decide whether "Confirm email" stays on (the app handles both).
4. **Authentication → URL configuration:** set the Site URL to the production URL and add the preview URL pattern (`https://*-<team>.vercel.app`) to redirect URLs.
5. Make an editor (roles are never set by the client):
   ```sql
   update public.profiles set role = 'editor'
   where id = (select id from auth.users where email = 'editor@example.com');
   ```
6. Copy the project URL and anon key into `.env.local` (development) and into Vercel (step 3).

Never change tables from the dashboard: add a new file in `supabase/migrations/` and run it in each environment, staging first.

## 3. Vercel
1. Import the GitHub repository in Vercel (framework: Next.js). `vercel.json` turns off Vercel's own Git deployments, so deploys go through CI after the tests pass.
2. **Settings → Environment Variables:** add both `NEXT_PUBLIC_SUPABASE_*` variables for Preview (staging project) and Production (production project).
3. Create a token (Account → Tokens). Run `npx vercel link` locally to get `orgId` and `projectId` from `.vercel/project.json`.
4. In GitHub **Settings → Secrets and variables → Actions**, add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Optionally create GitHub environments `preview` and `production` (required reviewers on production).

Until the secrets exist, the deploy jobs print a notice and skip.

## 4. CI/CD pipeline
`.github/workflows/ci.yml` on every PR and push to `main`:
1. **lint**, **typecheck**, **test** (unit + integration with coverage gates) and **security** (`npm audit`, dependency review on PRs) in parallel.
2. **build** (production build, no secrets).
3. **e2e** (Playwright, 375 px, silent audio, accelerated clock).
4. **deploy-preview** (PRs) or **deploy-production** (`main`), followed by a smoke test of `/api/health`; previews are commented on the PR.

`.github/workflows/codeql.yml` runs CodeQL (security-extended) on PRs, `main` and weekly.

Protect `main` in GitHub (Settings → Branches): require a PR, one approving review, and the CI checks `lint`, `typecheck`, `unit and integration tests`, `dependency audit`, `build`, `e2e`.

## 5. Health check
`GET /api/health` returns `{"status":"ok","database":"ok"}` (or `not_configured` without Supabase) and 503 when the database is unreachable.

## 6. Regenerating content
`npm run content:build` (macOS) rebuilds `public/audio/ep1/`, `src/content/ep1.manifest.json` and `supabase/seed.sql` from `docs/content/scenes/ep1-script.json`. Re-seeding an existing database only inserts missing rows (`on conflict do nothing`); publish changes through the editor instead.
