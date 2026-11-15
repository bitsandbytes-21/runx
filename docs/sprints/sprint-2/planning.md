# Sprint 2 planning

Milestone: Sprint 2 on GitHub. Sprint goal: stop, resume, accounts and API, then deploy and document.

## Scope
| Issue | Title | Story | Estimate (points) |
|---|---|---|---|
| #9 | Session state machine and Stop dialog | US-4 | 5 |
| #10 | Finish now and Save for next time playback | US-4 | 3 |
| #11 | Checkpoints, resume and recap | US-5 | 5 |
| #12 | Persist progress per user, import guest progress | US-7 | 3 |
| #13 | Guest demo mode with accelerated time | US-6 | 2 |
| #14 | Editor role and scene management | US-8 | 5 |
| #15 | Public API with OpenAPI documentation | US-9 | 3 |
| #16 | Deploy, security scan, documentation and demo | — | 3 |

Sprint 1 carry-over: none of #2–#8 were finished in Sprint 1 (only #1 was); they were completed at the start of Sprint 2 together with the issues above. TODO(#16): confirm estimates and roles with the team; Product Owner and Scrum Master rotate (Sprint 1 PO: Yue Li).

## Definition of done
Acceptance criteria met; failing test committed before the code; `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e` green; partner review; squash-merged.
