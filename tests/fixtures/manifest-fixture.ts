import type { Line, Manifest, Scene } from "@/lib/manifest/schema";

// A small manifest shaped like Episode 1 (same checkpoints, scene kinds and
// prerequisites) with round durations, so test arithmetic stays readable.

function makeLines(sceneId: string, totalSec: number, count = 2): Line[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${sceneId}-${String(index + 1).padStart(2, "0")}`,
    speaker: index % 2 === 0 ? "sancho" : "quixote",
    text: `Line ${index + 1} of ${sceneId}.`,
    audioUrl: `/audio/test/${sceneId}-${index + 1}.m4a`,
    durationSec: totalSec / count,
  }));
}

type SceneInput = Pick<Scene, "id" | "type" | "part"> & Partial<Scene>;

export function makeScene(input: SceneInput): Scene {
  const durationSec = input.durationSec ?? 60;
  return {
    order: 0,
    title: input.id,
    required: ["opening", "core", "climax", "ending"].includes(input.type),
    prerequisites: [],
    checkpoint: null,
    forCheckpoint: null,
    beat: null,
    source: "Ormsby 1885, Part I, ch. VIII",
    lines: makeLines(input.id, durationSec),
    bridge: null,
    ...input,
    durationSec,
  };
}

function bridgeFor(sceneId: string): Line {
  return {
    id: `${sceneId}-bridge`,
    speaker: "sancho",
    text: "We ride on; I will call you when something happens.",
    audioUrl: `/audio/test/${sceneId}-bridge.m4a`,
    durationSec: 4,
  };
}

export function makeManifest(overrides: Partial<Manifest> = {}): Manifest {
  const story: Scene[] = [
    makeScene({
      id: "s01",
      type: "opening",
      part: "warmup",
      durationSec: 60,
      checkpoint: "CP1",
      bridge: bridgeFor("s01"),
    }),
    makeScene({
      id: "s02",
      type: "optional",
      part: "warmup",
      durationSec: 60,
      prerequisites: ["s01"],
      bridge: bridgeFor("s02"),
    }),
    makeScene({
      id: "s03",
      type: "core",
      part: "rising",
      durationSec: 60,
      prerequisites: ["s01"],
      checkpoint: "CP2",
      bridge: bridgeFor("s03"),
    }),
    makeScene({
      id: "s04",
      type: "optional",
      part: "rising",
      durationSec: 60,
      prerequisites: ["s03"],
      bridge: bridgeFor("s04"),
    }),
    makeScene({
      id: "s05",
      type: "core",
      part: "rising",
      durationSec: 60,
      prerequisites: ["s03"],
      checkpoint: "CP3",
      bridge: bridgeFor("s05"),
    }),
    makeScene({
      id: "s06",
      type: "climax",
      part: "climax",
      durationSec: 90,
      prerequisites: ["s05"],
      beat: "charge",
    }),
    makeScene({
      id: "s07",
      type: "ending",
      part: "epilogue",
      durationSec: 60,
      prerequisites: ["s06"],
    }),
  ];
  const extras: Scene[] = [
    makeScene({
      id: "e01",
      type: "optional",
      part: "rising",
      durationSec: 10,
      beat: "encourage",
    }),
    makeScene({
      id: "e02",
      type: "optional",
      part: "rising",
      durationSec: 10,
      beat: "encourage",
    }),
    makeScene({ id: "x01", type: "signoff", part: "epilogue", durationSec: 30 }),
    ...(["CP1", "CP2", "CP3"] as const).flatMap((cp, index) => [
      makeScene({
        id: `r0${index + 1}`,
        type: "recap",
        part: "warmup",
        durationSec: 40,
        forCheckpoint: cp,
      }),
      makeScene({
        id: `c0${index + 1}`,
        type: "compressed_ending",
        part: "epilogue",
        durationSec: 50,
        forCheckpoint: cp,
      }),
    ]),
  ];
  const scenes = [...story, ...extras].map((scene, index) => ({
    ...scene,
    order: index + 1,
  }));
  return {
    episodeId: "ep1",
    manifestVersion: 1,
    title: "Giants on the Horizon",
    scenes,
    ...overrides,
  };
}
