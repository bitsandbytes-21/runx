import { describe, expect, it, vi } from "vitest";
import { createApiProgressStore } from "@/lib/progress/api-progress-store";
import type { ProgressRecord } from "@/lib/progress/progress-record";
import { makeManifest } from "../fixtures/manifest-fixture";

const manifest = makeManifest();
const record: ProgressRecord = {
  episodeId: "ep1",
  manifestVersion: 1,
  checkpoint: "CP2",
  status: "in_progress",
  lastPlayedAt: "2026-11-14T10:00:00.000Z",
  lastDurationMin: 30,
};

function store(response: Response) {
  const fetchFn = vi.fn(async () => response);
  return {
    fetchFn,
    store: createApiProgressStore({ fetchFn, getToken: () => "tok" }),
  };
}

describe("createApiProgressStore", () => {
  it("loads the signed-in runner's progress with a bearer token", async () => {
    const { fetchFn, store: s } = store(Response.json(record));
    expect(await s.load(manifest)).toEqual({ kind: "ok", record });
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/progress/ep1",
      expect.objectContaining({ headers: { authorization: "Bearer tok" } }),
    );
  });

  it("treats 404 as nothing saved", async () => {
    expect(
      await store(new Response(null, { status: 404 })).store.load(manifest),
    ).toEqual({ kind: "none" });
  });

  it("reports a corrupted response safely", async () => {
    expect(
      await store(Response.json({ checkpoint: "CP9" })).store.load(manifest),
    ).toEqual({ kind: "unreadable", reason: "corrupted" });
  });

  it("throws on server errors so the caller can show them", async () => {
    await expect(
      store(new Response(null, { status: 500 })).store.load(manifest),
    ).rejects.toThrow(/500/);
  });

  it("saves only the fields the API accepts", async () => {
    const { fetchFn, store: s } = store(Response.json(record));
    await s.save(record);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/progress/ep1");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({
      checkpoint: "CP2",
      status: "in_progress",
      lastDurationMin: 30,
    });
  });

  it("fails a save that the server rejects", async () => {
    await expect(
      store(new Response(null, { status: 400 })).store.save(record),
    ).rejects.toThrow(/could not be saved/i);
  });

  it("clears with DELETE", async () => {
    const { fetchFn, store: s } = store(new Response(null, { status: 204 }));
    await s.clear("ep1");
    expect(
      (fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1].method,
    ).toBe("DELETE");
  });
});
