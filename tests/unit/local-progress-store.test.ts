import { describe, expect, it } from "vitest";
import {
  createLocalProgressStore,
  DEMO_PROGRESS_KEY,
  GUEST_PROGRESS_KEY,
} from "@/lib/progress/local-progress-store";
import type { ProgressRecord } from "@/lib/progress/progress-record";
import { makeManifest } from "../fixtures/manifest-fixture";

const manifest = makeManifest();
const record: ProgressRecord = {
  episodeId: "ep1",
  manifestVersion: 1,
  checkpoint: "CP1",
  status: "in_progress",
  lastPlayedAt: "2026-11-14T10:00:00.000Z",
  lastDurationMin: 20,
};

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    data,
  };
}

describe("createLocalProgressStore", () => {
  it("saves and loads progress for an episode", async () => {
    const storage = memoryStorage();
    const store = createLocalProgressStore(storage, GUEST_PROGRESS_KEY);
    await store.save(record);
    expect(await store.load(manifest)).toEqual({ kind: "ok", record });
  });

  it("keeps demo progress apart from real guest progress", async () => {
    const storage = memoryStorage();
    await createLocalProgressStore(storage, DEMO_PROGRESS_KEY).save({
      ...record,
      checkpoint: "CP3",
    });
    expect(
      await createLocalProgressStore(storage, GUEST_PROGRESS_KEY).load(
        manifest,
      ),
    ).toEqual({ kind: "none" });
  });

  it("reports corrupted JSON without throwing", async () => {
    const storage = memoryStorage({ [`${GUEST_PROGRESS_KEY}:ep1`]: "{oops" });
    expect(
      await createLocalProgressStore(storage, GUEST_PROGRESS_KEY).load(
        manifest,
      ),
    ).toEqual({
      kind: "unreadable",
      reason: "corrupted",
    });
  });

  it("treats blocked storage as nothing saved", async () => {
    const blocked = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceeded");
      },
      removeItem: () => {},
    };
    const store = createLocalProgressStore(blocked, GUEST_PROGRESS_KEY);
    expect(await store.load(manifest)).toEqual({ kind: "none" });
    await expect(store.save(record)).rejects.toThrow(/could not be saved/i);
  });

  it("clears progress", async () => {
    const storage = memoryStorage();
    const store = createLocalProgressStore(storage, GUEST_PROGRESS_KEY);
    await store.save(record);
    await store.clear("ep1");
    expect(await store.load(manifest)).toEqual({ kind: "none" });
  });
});
