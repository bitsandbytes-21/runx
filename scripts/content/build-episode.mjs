// Builds src/content/ep1.manifest.json and public/audio/ep1/*.m4a from the
// written script (docs/content/scenes/ep1-script.json). macOS only: it uses
// the built-in `say` voices and `afconvert`, so no audio service or key is needed.
// Usage: node scripts/content/build-episode.mjs [--skip-audio]
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const VOICES = {
  quixote: process.env.RUNX_VOICE_QUIXOTE ?? "Daniel",
  sancho: process.env.RUNX_VOICE_SANCHO ?? "Eddy (English (UK))",
};
const RATE_WPM = { quixote: "165", sancho: "175" };
const EPISODE_ID = "ep1";
const AUDIO_DIR = join("public", "audio", EPISODE_ID);
const skipAudio = process.argv.includes("--skip-audio");

const script = JSON.parse(
  readFileSync("docs/content/scenes/ep1-script.json", "utf8"),
);
const previous = existsSync("src/content/ep1.manifest.json")
  ? JSON.parse(readFileSync("src/content/ep1.manifest.json", "utf8"))
  : null;
const knownDurations = new Map(
  (previous?.scenes ?? []).flatMap((s) =>
    [...s.lines, ...(s.bridge ? [s.bridge] : [])].map((l) => [
      l.id,
      l.durationSec,
    ]),
  ),
);

mkdirSync(AUDIO_DIR, { recursive: true });
const scratch = join(tmpdir(), "runx-tts.aiff");

function durationOf(file) {
  const info = execFileSync("afinfo", [file], { encoding: "utf8" });
  return Number(/estimated duration: ([\d.]+)/.exec(info)[1]);
}

function buildLine(id, line) {
  const file = join(AUDIO_DIR, `${id}.m4a`);
  if (!skipAudio) {
    execFileSync("say", [
      "-v",
      VOICES[line.speaker],
      "-r",
      RATE_WPM[line.speaker],
      "-o",
      scratch,
      line.text,
    ]);
    execFileSync("afconvert", [
      "-f",
      "m4af",
      "-d",
      "aac",
      "-c",
      "1",
      "-b",
      "48000",
      scratch,
      file,
    ]);
  }
  const durationSec = skipAudio ? knownDurations.get(id) : durationOf(file);
  return {
    id,
    speaker: line.speaker,
    text: line.text,
    audioUrl: `/audio/${EPISODE_ID}/${id}.m4a`,
    durationSec: Math.round(durationSec * 100) / 100,
  };
}

const scenes = script.scenes.map((scene, index) => {
  const lines = scene.lines.map((line, i) =>
    buildLine(`${scene.id}-${String(i + 1).padStart(2, "0")}`, line),
  );
  const bridge = scene.bridge
    ? buildLine(`${scene.id}-bridge`, scene.bridge)
    : null;
  // A short breath between lines is part of the scene's length.
  const durationSec = Math.ceil(
    lines.reduce((total, line) => total + line.durationSec, 0) +
      0.3 * (lines.length - 1),
  );
  return { ...scene, order: index + 1, durationSec, lines, bridge };
});

const manifest = {
  episodeId: EPISODE_ID,
  manifestVersion: 1,
  title: "Giants on the Horizon",
  scenes: scenes.map(
    ({
      id,
      type,
      order,
      title,
      part,
      durationSec,
      required,
      prerequisites,
      checkpoint,
      forCheckpoint,
      beat,
      source,
      lines,
      bridge,
    }) => ({
      id,
      type,
      order,
      title,
      part,
      durationSec,
      required,
      prerequisites,
      checkpoint,
      forCheckpoint,
      beat,
      source,
      lines,
      bridge,
    }),
  ),
};
writeFileSync(
  "src/content/ep1.manifest.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
rmSync(scratch, { force: true });
console.info(`Wrote ${scenes.length} scenes`);
