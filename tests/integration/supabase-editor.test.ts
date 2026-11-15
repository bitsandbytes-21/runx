import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  supabaseEditor,
  supabaseEpisodes,
} from "@/lib/db/supabase-repositories";
import { makeManifest } from "../fixtures/manifest-fixture";

type Result = { data: unknown; error: { message: string } | null };

/** Fake client whose result depends on the table queried; records every call. */
function fakeClient(results: Record<string, Result>) {
  const calls: unknown[][] = [];
  const client = {
    from(table: string) {
      calls.push(["from", table]);
      const builder: Record<string, unknown> = {};
      for (const method of [
        "select",
        "eq",
        "not",
        "order",
        "maybeSingle",
        "upsert",
        "update",
      ]) {
        builder[method] = (...args: unknown[]) => {
          calls.push([method, ...args]);
          return builder;
        };
      }
      builder.then = (resolve: (value: Result) => void) =>
        resolve(results[table]);
      return builder;
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

const scene = makeManifest().scenes[0];
const sceneRow = {
  id: scene.id,
  position: 1,
  type: scene.type,
  title: scene.title,
  part: scene.part,
  duration_sec: "60",
  required: true,
  prerequisites: [],
  checkpoint: "CP1",
  for_checkpoint: null,
  beat: null,
  source: scene.source,
  lines: scene.lines,
  bridge: scene.bridge,
};

describe("supabaseEditor", () => {
  it("builds the draft manifest from the episode and its scene rows", async () => {
    const { client } = fakeClient({
      episodes: {
        data: { id: "ep1", title: "Giants", manifest_version: 3 },
        error: null,
      },
      scenes: {
        data: [sceneRow, { ...sceneRow, id: "bad", type: "finale" }],
        error: null,
      },
    });
    const draft = await supabaseEditor(client).getDraft("ep1");
    expect(draft).toMatchObject({ episodeId: "ep1", manifestVersion: 3 });
    expect(draft!.scenes.map((s) => s.id)).toEqual(["s01"]);
    expect(draft!.scenes[0].durationSec).toBe(60);
  });

  it("returns null for an unknown episode", async () => {
    const { client } = fakeClient({
      episodes: { data: null, error: null },
      scenes: { data: [], error: null },
    });
    expect(await supabaseEditor(client).getDraft("nope")).toBeNull();
  });

  it("saves scenes as rows, reorders by position and publishes a snapshot", async () => {
    const { client, calls } = fakeClient({
      scenes: { data: null, error: null },
      episodes: { data: null, error: null },
    });
    const editor = supabaseEditor(client);
    await editor.saveScene("ep1", scene);
    expect(calls).toContainEqual([
      "upsert",
      expect.objectContaining({
        episode_id: "ep1",
        id: "s01",
        position: scene.order,
      }),
      { onConflict: "episode_id,id" },
    ]);
    await editor.reorder("ep1", ["s02", "s01"]);
    expect(calls).toContainEqual(["update", { position: 1 }]);
    const manifest = { ...makeManifest(), manifestVersion: 4 };
    await editor.publish(manifest);
    expect(calls).toContainEqual([
      "update",
      expect.objectContaining({
        manifest_version: 4,
        published_manifest: manifest,
      }),
    ]);
  });

  it("surfaces database errors from every write", async () => {
    const failing = { data: null, error: { message: "permission denied" } };
    const editor = supabaseEditor(
      fakeClient({ scenes: failing, episodes: failing }).client,
    );
    await expect(editor.saveScene("ep1", scene)).rejects.toThrow(
      "permission denied",
    );
    await expect(editor.reorder("ep1", ["s01"])).rejects.toThrow(
      "permission denied",
    );
    await expect(editor.publish(makeManifest())).rejects.toThrow(
      "permission denied",
    );
    await expect(editor.getDraft("ep1")).rejects.toThrow("permission denied");
  });

  it("returns a single published episode or null", async () => {
    const found = fakeClient({
      episodes: { data: { published_manifest: makeManifest() }, error: null },
    });
    expect(
      (await supabaseEpisodes(found.client).getPublished("ep1"))?.episodeId,
    ).toBe("ep1");
    const missing = fakeClient({ episodes: { data: null, error: null } });
    expect(
      await supabaseEpisodes(missing.client).getPublished("ep9"),
    ).toBeNull();
  });
});
