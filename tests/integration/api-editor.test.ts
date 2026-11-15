import { describe, expect, it } from "vitest";
import {
  getDraftScenes,
  publishEpisode,
  putSceneOrder,
  saveScene,
} from "@/lib/api/editor-handlers";
import { getEpisodeScenes } from "@/lib/api/handlers";
import { fakeDeps, request } from "../fixtures/api-fakes";

const json = (value: unknown) => JSON.stringify(value);

async function draftOf(deps: ReturnType<typeof fakeDeps>["deps"]) {
  return (
    await getDraftScenes(deps, request("/x", { token: "token-editor" }), "ep1")
  ).json();
}

describe("editor API", () => {
  it("returns 401 without a token and 403 for a runner on every endpoint", async () => {
    const { deps } = fakeDeps();
    const calls = [
      (token?: string) => getDraftScenes(deps, request("/x", { token }), "ep1"),
      (token?: string) =>
        saveScene(
          deps,
          request("/x", { method: "PUT", token, body: json({}) }),
          "ep1",
          "s01",
        ),
      (token?: string) =>
        putSceneOrder(
          deps,
          request("/x", { method: "PUT", token, body: json({ sceneIds: [] }) }),
          "ep1",
        ),
      (token?: string) =>
        publishEpisode(deps, request("/x", { method: "POST", token }), "ep1"),
    ];
    for (const call of calls) {
      expect((await call()).status).toBe(401);
      const forbidden = await call("token-runner");
      expect(forbidden.status).toBe(403);
      expect((await forbidden.json()).error.code).toBe("forbidden");
    }
  });

  it("lists draft scenes in order with validation problems", async () => {
    const { deps } = fakeDeps();
    const body = await draftOf(deps);
    expect(body.manifest.scenes[0].id).toBe("s01");
    expect(body.problems).toEqual([]);
  });

  it("saves an edited scene", async () => {
    const { deps } = fakeDeps();
    const { manifest } = await draftOf(deps);
    const scene = { ...manifest.scenes[1], title: "The island, revised" };
    const response = await saveScene(
      deps,
      request("/x", {
        method: "PUT",
        token: "token-editor",
        body: json(scene),
      }),
      "ep1",
      scene.id,
    );
    expect(response.status).toBe(200);
    expect((await draftOf(deps)).manifest.scenes[1].title).toBe(
      "The island, revised",
    );
  });

  it("rejects a malformed scene or a mismatched id with 400", async () => {
    const { deps } = fakeDeps();
    const { manifest } = await draftOf(deps);
    const bad = await saveScene(
      deps,
      request("/x", {
        method: "PUT",
        token: "token-editor",
        body: json({ ...manifest.scenes[1], type: "finale" }),
      }),
      "ep1",
      "s02",
    );
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.fields).toHaveProperty("type");
    const mismatch = await saveScene(
      deps,
      request("/x", {
        method: "PUT",
        token: "token-editor",
        body: json(manifest.scenes[1]),
      }),
      "ep1",
      "s03",
    );
    expect(mismatch.status).toBe(400);
  });

  it("reorders scenes, rejecting lists that are not a permutation", async () => {
    const { deps } = fakeDeps();
    const { manifest } = await draftOf(deps);
    const ids: string[] = manifest.scenes.map((s: { id: string }) => s.id);
    const bad = await putSceneOrder(
      deps,
      request("/x", {
        method: "PUT",
        token: "token-editor",
        body: json({ sceneIds: ids.slice(1) }),
      }),
      "ep1",
    );
    expect(bad.status).toBe(400);
    const swapped = [ids[0], ids[2], ids[1], ...ids.slice(3)];
    const ok = await putSceneOrder(
      deps,
      request("/x", {
        method: "PUT",
        token: "token-editor",
        body: json({ sceneIds: swapped }),
      }),
      "ep1",
    );
    expect(ok.status).toBe(200);
    expect(
      (await draftOf(deps)).manifest.scenes
        .map((s: { id: string }) => s.id)
        .slice(0, 3),
    ).toEqual(["s01", "s03", "s02"]);
  });

  it("blocks publishing an invalid manifest and explains why", async () => {
    const { deps, editor } = fakeDeps();
    const { manifest } = await draftOf(deps);
    const broken = { ...manifest.scenes[2], prerequisites: ["s99"] };
    await saveScene(
      deps,
      request("/x", {
        method: "PUT",
        token: "token-editor",
        body: json(broken),
      }),
      "ep1",
      broken.id,
    );
    expect((await draftOf(deps)).problems[0].code).toBe("unknown_prerequisite");
    const response = await publishEpisode(
      deps,
      request("/x", { method: "POST", token: "token-editor" }),
      "ep1",
    );
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("invalid_manifest");
    expect(body.error.problems[0]).toMatchObject({
      code: "unknown_prerequisite",
      sceneId: "s03",
    });
    expect(editor.published).toHaveLength(0);
  });

  it("publishes a valid draft and bumps the manifest version", async () => {
    const { deps, editor } = fakeDeps();
    const response = await publishEpisode(
      deps,
      request("/x", { method: "POST", token: "token-editor" }),
      "ep1",
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      episodeId: "ep1",
      manifestVersion: 2,
    });
    expect(editor.published[0].manifestVersion).toBe(2);
  });

  it("keeps unpublished edits out of public responses", async () => {
    const { deps } = fakeDeps();
    const { manifest } = await draftOf(deps);
    const scene = { ...manifest.scenes[1], title: "Draft only" };
    await saveScene(
      deps,
      request("/x", {
        method: "PUT",
        token: "token-editor",
        body: json(scene),
      }),
      "ep1",
      scene.id,
    );
    const scenes = await (
      await getEpisodeScenes(deps, request("/x"), "ep1")
    ).json();
    expect(scenes.map((s: { title: string }) => s.title)).not.toContain(
      "Draft only",
    );
  });

  it("returns 404 for an unknown episode", async () => {
    const { deps } = fakeDeps();
    expect(
      (
        await getDraftScenes(
          deps,
          request("/x", { token: "token-editor" }),
          "nope",
        )
      ).status,
    ).toBe(404);
  });
});
