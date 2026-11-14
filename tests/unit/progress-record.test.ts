import { describe, expect, it } from "vitest";
import {
  applyProgressChange,
  parseSavedProgress,
  type ProgressRecord,
} from "@/lib/progress/progress-record";
import { makeManifest } from "../fixtures/manifest-fixture";

const manifest = makeManifest();
const ctx = {
  episodeId: "ep1",
  manifestVersion: 1,
  nowIso: "2026-11-14T10:00:00.000Z",
  durationMin: 30,
};
const saved: ProgressRecord = {
  episodeId: "ep1",
  manifestVersion: 1,
  checkpoint: "CP2",
  status: "in_progress",
  lastPlayedAt: "2026-11-10T10:00:00.000Z",
  lastDurationMin: 30,
};

describe("applyProgressChange", () => {
  it("stores a reached checkpoint as in progress", () => {
    expect(
      applyProgressChange(null, { kind: "checkpoint", checkpoint: "CP1" }, ctx),
    ).toEqual({
      ...saved,
      checkpoint: "CP1",
      lastPlayedAt: ctx.nowIso,
    });
  });

  it("keeps the episode in progress when the runner saves", () => {
    const next = applyProgressChange(
      saved,
      { kind: "saved", checkpoint: "CP3" },
      ctx,
    );
    expect(next).toMatchObject({ status: "in_progress", checkpoint: "CP3" });
  });

  it("keeps earlier progress when saving before the first checkpoint", () => {
    expect(
      applyProgressChange(saved, { kind: "saved", checkpoint: null }, ctx),
    ).toEqual({
      ...saved,
      lastPlayedAt: ctx.nowIso,
    });
    expect(
      applyProgressChange(null, { kind: "saved", checkpoint: null }, ctx),
    ).toBeNull();
  });

  it("marks the episode complete and clears the checkpoint", () => {
    expect(applyProgressChange(saved, { kind: "complete" }, ctx)).toMatchObject(
      {
        status: "complete",
        checkpoint: null,
      },
    );
  });
});

describe("parseSavedProgress", () => {
  it("returns none when nothing is saved", () => {
    expect(parseSavedProgress(null, manifest)).toEqual({ kind: "none" });
  });

  it("accepts a valid record", () => {
    expect(parseSavedProgress(saved, manifest)).toEqual({
      kind: "ok",
      record: saved,
    });
  });

  it("reports corrupted data instead of crashing", () => {
    expect(parseSavedProgress({ checkpoint: "CP9" }, manifest)).toEqual({
      kind: "unreadable",
      reason: "corrupted",
    });
    expect(parseSavedProgress("{not json", manifest)).toEqual({
      kind: "unreadable",
      reason: "corrupted",
    });
  });

  it("reports progress for another episode as corrupted", () => {
    expect(
      parseSavedProgress({ ...saved, episodeId: "ep9" }, manifest),
    ).toEqual({
      kind: "unreadable",
      reason: "corrupted",
    });
  });

  it("carries progress over to a newer version when the checkpoint still exists", () => {
    const newer = { ...manifest, manifestVersion: 2 };
    expect(parseSavedProgress(saved, newer)).toEqual({
      kind: "ok",
      record: { ...saved, manifestVersion: 2 },
    });
  });

  it("flags a version mismatch whose checkpoint no longer exists", () => {
    const newer = {
      ...manifest,
      manifestVersion: 2,
      scenes: manifest.scenes.map((s) =>
        s.checkpoint === "CP2" ? { ...s, checkpoint: null } : s,
      ),
    };
    expect(parseSavedProgress(saved, newer)).toEqual({
      kind: "unreadable",
      reason: "incompatible",
    });
  });
});
