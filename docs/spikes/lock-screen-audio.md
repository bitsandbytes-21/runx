# Spike: audio playback with the screen locked (issue #8)

**Status:** desk research and implementation done 2026-11-15; **device tests still to run** (table below). Decision is provisional until the table is filled in.

## Question
Does RunX keep telling the story when the phone is locked in a pocket, on iOS Safari and Android Chrome? Options: (A) chained clips, one file per line, played one after another; (B) one continuous audio file per run (the timeline rendered with its silences).

## What the app does now (option A)
- One shared `HTMLAudioElement` (`src/lib/audio/audio-port.ts`). It is "unlocked" inside the Start tap with a short silent clip (`public/audio/silence.m4a`), because iOS only lets an element play after a user gesture.
- All clips of a run are downloaded before the clock starts (`preload-clips.ts`) and played from blob URLs, so no network is needed mid-run.
- Media Session: metadata (line as title, speaker as artist, speaker art) is set for every line; `play` and `pause` handlers map to Resume and Pause.
- Screen Wake Lock is requested while a run is active, where supported.
- If the browser blocks playback, the line fails visibly (`role="alert"`, Retry, Skip this line); the clock stops and nothing is skipped automatically.

## Known risk (from platform documentation, not yet measured by us)
- Browsers keep a page running in the background while it is **actively playing media**. Between scenes RunX is silent for up to several minutes; during that silence a locked phone may suspend or throttle the page's timers, so the next scene could start late or only after unlocking. This is most likely on iOS Safari.
- Media Session support differs by browser version; the lock screen controls may not appear on older iOS versions.
- Wake Lock is ignored when the screen is turned off by the user; it only helps when the phone is held or mounted.

## Device test protocol
Run each case with a 20 minute run in the guest demo **off** (real clock), earbuds connected, phone locked right after Ride out.
1. Lock immediately after the first line starts. Note whether the opening finishes, and whether scene 2 starts on time (compare with the timeline in the browser console or the Running screen after unlocking).
2. Lock during a silence between scenes. Note whether the next scene starts on time.
3. Use the lock screen or earbud button to pause and resume.
4. Receive a notification sound mid-line.

| Device / OS / browser | Case 1 | Case 2 | Case 3 | Case 4 | Tester, date |
|---|---|---|---|---|---|
| iPhone, iOS __, Safari | | | | | |
| Android __, Chrome __ | | | | | |

## Decision
**Provisional:** keep option A (chained clips) for the MVP because it supports Stop at the end of a line, captions per line, pause and resume, and editor-managed content without re-rendering audio.

**If case 2 fails on a device:** switch the gaps to a looping silent clip on the same element (`TODO(#8): keep the audio session alive during silences`) so the page stays "playing" during gaps; if that is still unreliable, move to option B (render one continuous file per run on the server) and keep per-line captions by time offsets. State the limit honestly in the README until then.
