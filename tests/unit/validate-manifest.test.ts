import { describe, expect, it } from "vitest";
import { validateManifest } from "@/lib/manifest/validate-manifest";
import type { Manifest, Scene } from "@/lib/manifest/schema";
import { makeManifest } from "../fixtures/manifest-fixture";

function withScene(
  manifest: Manifest,
  id: string,
  change: (scene: Scene) => Scene,
): Manifest {
  return {
    ...manifest,
    scenes: manifest.scenes.map((scene) =>
      scene.id === id ? change(scene) : scene,
    ),
  };
}

function errorCodes(input: unknown): string[] {
  const result = validateManifest(input);
  return result.ok ? [] : result.errors.map((error) => error.code);
}

describe("validateManifest", () => {
  it("accepts a well-formed manifest", () => {
    const result = validateManifest(makeManifest());
    expect(result.ok).toBe(true);
  });

  it("rejects input that is not a manifest shape", () => {
    expect(errorCodes({ episodeId: "ep1" })).toContain("invalid_shape");
    expect(errorCodes("not json")).toContain("invalid_shape");
  });

  it("rejects duplicate scene ids", () => {
    const manifest = makeManifest();
    const copy = { ...manifest.scenes[1], order: 99 };
    expect(
      errorCodes({ ...manifest, scenes: [...manifest.scenes, copy] }),
    ).toContain("duplicate_id");
  });

  it("rejects duplicate line ids across scenes", () => {
    const manifest = withScene(makeManifest(), "s03", (scene) => ({
      ...scene,
      lines: [{ ...scene.lines[0], id: "s01-01" }, ...scene.lines.slice(1)],
    }));
    expect(errorCodes(manifest)).toContain("duplicate_id");
  });

  it("rejects a line with missing audio", () => {
    const manifest = withScene(makeManifest(), "s03", (scene) => ({
      ...scene,
      lines: scene.lines.map((line, index) =>
        index === 0 ? { ...line, audioUrl: "" } : line,
      ),
    }));
    expect(errorCodes(manifest)).toContain("missing_audio");
  });

  it("rejects a bridge line with missing audio", () => {
    const manifest = withScene(makeManifest(), "s01", (scene) => ({
      ...scene,
      bridge: scene.bridge && { ...scene.bridge, audioUrl: " " },
    }));
    expect(errorCodes(manifest)).toContain("missing_audio");
  });

  it("rejects zero or negative durations", () => {
    expect(
      errorCodes(
        withScene(makeManifest(), "s02", (s) => ({ ...s, durationSec: -5 })),
      ),
    ).toContain("negative_duration");
    const zeroLine = withScene(makeManifest(), "s02", (scene) => ({
      ...scene,
      lines: scene.lines.map((line) => ({ ...line, durationSec: 0 })),
    }));
    expect(errorCodes(zeroLine)).toContain("negative_duration");
  });

  it("rejects a scene without a transcript", () => {
    expect(
      errorCodes(
        withScene(makeManifest(), "s04", (s) => ({ ...s, lines: [] })),
      ),
    ).toContain("missing_transcript");
    const blank = withScene(makeManifest(), "s04", (scene) => ({
      ...scene,
      lines: scene.lines.map((line) => ({ ...line, text: "  " })),
    }));
    expect(errorCodes(blank)).toContain("missing_transcript");
  });

  it("rejects unknown prerequisites", () => {
    const manifest = withScene(makeManifest(), "s05", (scene) => ({
      ...scene,
      prerequisites: ["s99"],
    }));
    expect(errorCodes(manifest)).toContain("unknown_prerequisite");
  });

  it("rejects dependency cycles", () => {
    let manifest = withScene(makeManifest(), "s03", (scene) => ({
      ...scene,
      prerequisites: ["s05"],
    }));
    manifest = withScene(manifest, "s05", (scene) => ({
      ...scene,
      prerequisites: ["s03"],
    }));
    expect(errorCodes(manifest)).toContain("dependency_cycle");
  });

  it("rejects a self-dependency as a cycle", () => {
    const manifest = withScene(makeManifest(), "s03", (scene) => ({
      ...scene,
      prerequisites: ["s03"],
    }));
    expect(errorCodes(manifest)).toContain("dependency_cycle");
  });

  it("rejects a prerequisite that comes later in story order", () => {
    const manifest = withScene(makeManifest(), "s03", (scene) => ({
      ...scene,
      prerequisites: ["s04"],
    }));
    expect(errorCodes(manifest)).toContain("prerequisite_order");
  });

  it("rejects an episode without exactly one opening, climax and ending", () => {
    const noClimax = {
      ...makeManifest(),
      scenes: makeManifest().scenes.filter((scene) => scene.type !== "climax"),
    };
    expect(errorCodes(noClimax)).toContain("missing_scene_type");
    const twoEndings = withScene(makeManifest(), "s05", (scene) => ({
      ...scene,
      type: "ending",
      checkpoint: null,
    }));
    expect(errorCodes(twoEndings)).toContain("duplicate_scene_type");
  });

  it("rejects a checkpoint used by two scenes or missing entirely", () => {
    const twice = withScene(makeManifest(), "s05", (scene) => ({
      ...scene,
      checkpoint: "CP2",
    }));
    const codes = errorCodes(twice);
    expect(codes).toContain("duplicate_checkpoint");
    expect(codes).toContain("missing_checkpoint");
  });

  it("rejects a checkpoint without a compressed ending or recap", () => {
    const manifest = {
      ...makeManifest(),
      scenes: makeManifest().scenes.filter((scene) => scene.id !== "c02"),
    };
    expect(errorCodes(manifest)).toContain("missing_compressed_ending");
    const noRecap = {
      ...makeManifest(),
      scenes: makeManifest().scenes.filter((scene) => scene.id !== "r03"),
    };
    expect(errorCodes(noRecap)).toContain("missing_recap");
  });

  it("rejects an episode without a sign-off", () => {
    const manifest = {
      ...makeManifest(),
      scenes: makeManifest().scenes.filter((scene) => scene.type !== "signoff"),
    };
    expect(errorCodes(manifest)).toContain("missing_scene_type");
  });

  it("rejects a climax and ending that cannot fit in the last 3 minutes", () => {
    const manifest = withScene(makeManifest(), "s06", (scene) => ({
      ...scene,
      durationSec: 150,
    }));
    expect(errorCodes(manifest)).toContain("climax_too_long");
  });

  it("names the scene in every scene-level error", () => {
    const result = validateManifest(
      withScene(makeManifest(), "s02", (s) => ({ ...s, durationSec: -1 })),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({ sceneId: "s02" });
      expect(result.errors[0].message).toMatch(/s02/);
    }
  });
});
