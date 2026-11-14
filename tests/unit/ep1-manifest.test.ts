import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EP1_MANIFEST } from "@/content/episodes";
import { validateManifest } from "@/lib/manifest/validate-manifest";
import script from "../../docs/content/scenes/ep1-script.json";

const FORBIDDEN =
  /\b(faster|speed up|sprint|pace|don't stop|keep going|finish the story|kilomet|miles?)\b/i;

describe("Episode 1 manifest", () => {
  it("passes validation", () => {
    expect(validateManifest(EP1_MANIFEST).ok).toBe(true);
  });

  it("has a local audio file for every line", () => {
    const missing = EP1_MANIFEST.scenes
      .flatMap((scene) =>
        scene.bridge ? [...scene.lines, scene.bridge] : scene.lines,
      )
      .filter((line) => !existsSync(join("public", line.audioUrl)));
    expect(missing).toEqual([]);
  });

  it("matches the written script line for line", () => {
    const fromManifest = EP1_MANIFEST.scenes.map((scene) =>
      scene.lines.map((l) => l.text),
    );
    const fromScript = script.scenes.map((scene) =>
      scene.lines.map((l) => l.text),
    );
    expect(fromManifest).toEqual(fromScript);
  });

  it("uses two speakers and the three checkpoints in story order", () => {
    const speakers = new Set(
      EP1_MANIFEST.scenes.flatMap((s) => s.lines.map((l) => l.speaker)),
    );
    expect([...speakers].sort()).toEqual(["quixote", "sancho"]);
    const checkpoints = EP1_MANIFEST.scenes
      .filter((s) => s.checkpoint)
      .map((s) => s.checkpoint);
    expect(checkpoints).toEqual(["CP1", "CP2", "CP3"]);
  });

  it("never gives the runner a pace command or a finish-the-story push", () => {
    const offending = EP1_MANIFEST.scenes
      .flatMap((scene) =>
        scene.bridge ? [...scene.lines, scene.bridge] : scene.lines,
      )
      .filter((line) => FORBIDDEN.test(line.text))
      .map((line) => line.id);
    expect(offending).toEqual([]);
  });

  it("credits a public-domain source on every scene", () => {
    expect(EP1_MANIFEST.scenes.every((s) => /Ormsby 1885/.test(s.source))).toBe(
      true,
    );
  });
});
