import { describe, expect, it } from "vitest";
import { getEpisode, getEpisodeScenes, listEpisodes } from "@/lib/api/handlers";
import { fakeDeps, request } from "../fixtures/api-fakes";

describe("GET /api/episodes", () => {
  it("lists published episodes without auth", async () => {
    const { deps } = fakeDeps();
    const response = await listEpisodes(deps, request("/api/episodes"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        id: "ep1",
        title: "Giants on the Horizon",
        manifestVersion: 1,
        sceneCount: 17,
      },
    ]);
  });
});

describe("GET /api/episodes/{id} and /scenes", () => {
  it("returns the published manifest and its scenes in story order", async () => {
    const { deps } = fakeDeps();
    const manifest = await (
      await getEpisode(deps, request("/api/episodes/ep1"), "ep1")
    ).json();
    expect(manifest.episodeId).toBe("ep1");
    const scenes = await (
      await getEpisodeScenes(deps, request("/api/episodes/ep1/scenes"), "ep1")
    ).json();
    expect(scenes.map((s: { order: number }) => s.order)).toEqual(
      [...scenes.map((s: { order: number }) => s.order)].sort((a, b) => a - b),
    );
    expect(scenes[0]).toMatchObject({
      id: "s01",
      type: "opening",
      durationSec: 60,
    });
  });

  it("returns 404 with the error shape for an unknown or unpublished episode", async () => {
    const { deps } = fakeDeps();
    const response = await getEpisodeScenes(
      deps,
      request("/api/episodes/nope/scenes"),
      "nope",
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "not_found", message: "Episode nope was not found" },
    });
  });
});
