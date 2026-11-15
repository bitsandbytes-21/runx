import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  readRole,
  supabaseEpisodes,
  supabaseProgress,
} from "@/lib/db/supabase-repositories";
import { makeManifest } from "../fixtures/manifest-fixture";

type Call = [string, ...unknown[]];

/** A chainable stand-in for the Supabase query builder that records each call. */
function fakeClient(result: {
  data: unknown;
  error: { message: string } | null;
}) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of [
    "select",
    "eq",
    "not",
    "order",
    "maybeSingle",
    "upsert",
    "delete",
    "update",
  ]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      return builder;
    };
  }
  builder.then = (resolve: (value: unknown) => void) => resolve(result);
  const client = {
    from: (table: string) => {
      calls.push(["from", table]);
      return builder;
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe("supabase repositories", () => {
  it("reads only valid published manifests", async () => {
    const { client, calls } = fakeClient({
      data: [
        { published_manifest: makeManifest() },
        { published_manifest: { broken: true } },
      ],
      error: null,
    });
    const manifests = await supabaseEpisodes(client).listPublished();
    expect(manifests.map((m) => m.episodeId)).toEqual(["ep1"]);
    expect(calls).toContainEqual(["not", "published_manifest", "is", null]);
  });

  it("scopes progress queries to the signed-in user and maps columns", async () => {
    const { client, calls } = fakeClient({
      data: {
        episode_id: "ep1",
        manifest_version: 1,
        checkpoint: "CP2",
        status: "in_progress",
        last_played_at: "2026-11-14T10:00:00+00:00",
        last_duration_min: 30,
      },
      error: null,
    });
    const record = await supabaseProgress(client, "user-1").get("ep1");
    expect(record).toEqual({
      episodeId: "ep1",
      manifestVersion: 1,
      checkpoint: "CP2",
      status: "in_progress",
      lastPlayedAt: "2026-11-14T10:00:00.000Z",
      lastDurationMin: 30,
    });
    expect(calls).toContainEqual(["eq", "user_id", "user-1"]);
  });

  it("returns null for a corrupted progress row instead of throwing", async () => {
    const { client } = fakeClient({
      data: { episode_id: "ep1", checkpoint: "CP9" },
      error: null,
    });
    expect(await supabaseProgress(client, "u").get("ep1")).toBeNull();
  });

  it("upserts progress on the user and episode key", async () => {
    const { client, calls } = fakeClient({ data: null, error: null });
    await supabaseProgress(client, "u").upsert({
      episodeId: "ep1",
      manifestVersion: 1,
      checkpoint: "CP1",
      status: "in_progress",
      lastPlayedAt: "2026-11-14T10:00:00.000Z",
      lastDurationMin: null,
    });
    const upsert = calls.find(([method]) => method === "upsert")!;
    expect(upsert[1]).toMatchObject({
      user_id: "u",
      episode_id: "ep1",
      checkpoint: "CP1",
    });
    expect(upsert[2]).toEqual({ onConflict: "user_id,episode_id" });
  });

  it("surfaces database errors", async () => {
    const { client } = fakeClient({
      data: null,
      error: { message: "permission denied" },
    });
    await expect(supabaseProgress(client, "u").remove("ep1")).rejects.toThrow(
      "permission denied",
    );
  });

  it("reads the editor role and defaults to runner", async () => {
    expect(
      await readRole(
        fakeClient({ data: { role: "editor" }, error: null }).client,
        "u",
      ),
    ).toBe("editor");
    expect(
      await readRole(fakeClient({ data: null, error: null }).client, "u"),
    ).toBe("runner");
  });
});
