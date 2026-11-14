import { parseSavedProgress, type ProgressStore } from "./progress-record";

export const GUEST_PROGRESS_KEY = "runx:progress";
/** Demo runs never touch real progress (FR-11). */
export const DEMO_PROGRESS_KEY = "runx:demo-progress";

type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function createLocalProgressStore(
  storage: KeyValueStorage,
  prefix: string,
): ProgressStore {
  const keyFor = (episodeId: string) => `${prefix}:${episodeId}`;
  return {
    async load(manifest) {
      let raw: string | null;
      try {
        raw = storage.getItem(keyFor(manifest.episodeId));
      } catch {
        // Private mode or blocked storage: behave as a first visit.
        return { kind: "none" };
      }
      return parseSavedProgress(raw, manifest);
    },
    async save(record) {
      try {
        storage.setItem(keyFor(record.episodeId), JSON.stringify(record));
      } catch {
        throw new Error("Progress could not be saved on this device");
      }
    },
    async clear(episodeId) {
      try {
        storage.removeItem(keyFor(episodeId));
      } catch {
        // Nothing to clear if storage is unavailable.
      }
    },
  };
}

/** window.localStorage, or an in-memory stand-in when the browser refuses access. */
export function browserStorage(): KeyValueStorage {
  try {
    return window.localStorage;
  } catch {
    const data = new Map<string, string>();
    return {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => void data.set(key, value),
      removeItem: (key) => void data.delete(key),
    };
  }
}
