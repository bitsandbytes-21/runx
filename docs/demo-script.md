# Demo video script (10 minutes)

A recording kit: set up once, then follow the segments in order. Every label in **bold** is the exact text on screen. Narration is a suggestion; say it in your own words.

## Before you record (about 15 minutes, once)

1. **App URL.** Use the production URL (see [deployment guide](deployment.md)). Without one, run locally with Supabase keys in `.env.local`: `npm ci && npm run build && npm start`, then use `http://localhost:3000`. Below, `$APP` means that URL.
2. **Accounts.** In the app, sign up two accounts at `$APP/login` (**Sign up**): a runner (e.g. `runner@…`) and an editor (e.g. `editor@…`). Then in Supabase **SQL Editor** make the second one an editor:
   ```sql
   update public.profiles set role = 'editor'
   where id = (select id from auth.users where email = '<editor email>');
   ```
   If "Confirm email" is on in Supabase, confirm both emails first (or turn it off for the demo).
3. **Browsers.** Chrome window A for guest and runner (DevTools device toolbar, iPhone SE, 375 px); Chrome **incognito** window B for the editor; a terminal for `curl`. In window A open DevTools → Application → Local storage and clear `runx:*` keys so Home starts fresh.
4. **Tabs to pre-open:** the GitHub repo, a merged PR (e.g. [#18 scheduler](https://github.com/bitsandbytes-21/runx/pull/18), shows `test(...)` red commit before `feat(...)`), the Actions run on `main`, the Security → Code scanning page, Milestones, `docs/architecture.md` and `docs/architecture/schema.md` on GitHub (diagrams render there).
5. **Sound on** for segments 2–3 so the voices are heard; captions show regardless.
6. **Speed-up trick:** add `?speed=4` to the Home URL (`$APP/?speed=4`). **Ride out** keeps it, so a real run (saved to real progress) plays 4× faster. The demo button already runs 10× and keeps its progress separate.

## Segments

| # | Time | Show (clicks) | Say |
|---|---|---|---|
| 1 | 0:00–0:45 | README on GitHub, then `$APP` Home | "Runs are boring and never the same length, and people stop early. RunX turns a run into an audio episode of Don Quixote: two characters talk you through it, and the story is fitted to the length of your run, with the climax in your last three minutes." |
| 2 | 0:45–1:45 | Home: tap **20**, **30**, **45** chips (watch "Story ends at …" change); open **Other length**, pick 25; back to **30** | "Pick 20, 30 or 45 minutes, or any length from 15 to 60. The scheduler is a pure function: it drops optional scenes, keeps story order and puts the climax in the last 3 minutes, within 15 seconds." |
| 3 | 1:45–3:15 | Tap **Try the demo, no account needed**. Show loading bar, caption card (speaker + line), windmill progress (4 sails), **Pause** → clock freezes → **Resume**. Tap **Stop** during the opening: only **Save for next time** and **Keep running** are offered; tap **Keep running** | "The demo runs a 20 minute plan ten times faster. Every line has a caption. The clock does not start until audio is buffered. Stop never cuts a line mid-sentence, and before the opening ends you can only save, because there is no checkpoint yet." |
| 4 | 3:15–4:15 | Still in the demo, after the windmill shows part 2 (**Rising**): **Stop** → **Finish the story now** → compressed ending plays → **Episode complete** → the sign-up prompt | "Finish now plays a short ending for where you are. The episode only counts as complete after that ending fully plays; an audio error never marks it complete." |
| 5 | 4:15–5:30 | Go to `$APP/?speed=4`, **Ride out**. After part 2 shows, **Stop** → **Save for next time** → sign-off → **Done**. Home now shows the Continue card. Tap it → Resume screen shows the checkpoint; pick **15** → "Nothing is skipped, so pick a longer run"; pick **30** → **Continue the story** (starts from the checkpoint; then go back) | "Save keeps the last checkpoint: CP1 after departure, CP2 when the windmills appear, CP3 facing them. Resume rebuilds the timeline from there and refuses a length that would skip required scenes." |
| 6 | 5:30–6:00 | Recap: DevTools Console, paste the snippet below, reload Home, tap Continue: **Play the recap** bubbles appear | "If you come back after three days or more, a short recap plays first, and you can skip it." |
| 7 | 6:00–7:00 | **Log in or sign up** → **Log in** as the runner → **Import your progress?** → **Import**. Open `$APP` in a second browser (or incognito) logged in as the runner: same Continue card | "Accounts use Supabase Auth with JWTs. Guest progress can be imported on first login. Progress is stored per user, and row-level security means a user can only ever read or write their own rows." |
| 8 | 7:00–8:00 | Window A (runner): `$APP/editor` → "Only editors can manage scenes." Window B: log in as editor → `$APP/editor` → **Edit** a scene, change a line → **Save scene**; edit another scene and add a prerequisite that comes later → the problems list blocks **Publish**; fix it → **Publish** (version goes up) | "The third role is the editor. The server checks the role, never the client: a runner gets 403. Edits go to a draft; publishing runs the same validator and is blocked for a broken story." |
| 9 | 8:00–8:45 | `$APP/api/docs` (Swagger UI); terminal: `curl $APP/api/episodes` then `curl -i $APP/api/progress/ep1` (401) and `curl $APP/api/health` | "The public API is documented with OpenAPI. A test fails CI if a route and the spec drift apart. Errors share one shape." |
| 10 | 8:45–9:40 | GitHub: PR #18 commits (red test, then green); Actions run (lint, typecheck, tests with coverage, dependency audit, build, E2E, deploy); Security → Code scanning (CodeQL); `docs/architecture.md` diagram | "Every issue was built test-first: the failing test is committed before the code. CI runs 290 unit and integration tests at 94% line coverage, 98% on the scheduler, then a Playwright end-to-end run of the whole pick → run → stop → save → resume flow on an accelerated clock, a security scan, and deploys." |
| 11 | 9:40–10:00 | Milestones page (Sprint 1, Sprint 2), `docs/sprints/sprint-2/retro.md` | "Two sprints, sixteen issues. What I learned: …" (one or two sentences of your own) |

### Recap snippet (segment 6)
Run in the DevTools console on `$APP` while you have guest progress saved (segment 5). It moves the last run four days into the past:
```js
const k = "runx:progress:ep1";
const r = JSON.parse(localStorage.getItem(k));
r.lastPlayedAt = new Date(Date.now() - 4 * 864e5).toISOString();
localStorage.setItem(k, JSON.stringify(r));
location.reload();
```
Do segment 6 before logging in (segment 7); once logged in, progress comes from the database instead.

## Recording tips
- Record each segment separately and join them; re-take one segment rather than the whole video.
- Keep the 375 px device frame for app segments; switch to full width for GitHub segments.
- If a deploy is not available, say so and show the local run; do not claim a URL that does not work.
- Known limit to mention if asked: background audio with a locked phone screen is not yet verified on real devices ([spike](spikes/lock-screen-audio.md)).
