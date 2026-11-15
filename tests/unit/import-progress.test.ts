import { describe, expect, it } from "vitest";
import { shouldOfferImport } from "@/lib/progress/import-progress";
import type { ProgressRecord } from "@/lib/progress/progress-record";

const guest: ProgressRecord = {
  episodeId: "ep1",
  manifestVersion: 1,
  checkpoint: "CP2",
  status: "in_progress",
  lastPlayedAt: "2026-11-14T10:00:00.000Z",
  lastDurationMin: 30,
};

describe("shouldOfferImport", () => {
  it("offers guest progress once when the account has none", () => {
    expect(
      shouldOfferImport({ kind: "ok", record: guest }, { kind: "none" }, false),
    ).toBe(true);
  });

  it("does not ask again once the runner answered", () => {
    expect(
      shouldOfferImport({ kind: "ok", record: guest }, { kind: "none" }, true),
    ).toBe(false);
  });

  it("does not offer when there is nothing useful to import", () => {
    expect(shouldOfferImport({ kind: "none" }, { kind: "none" }, false)).toBe(
      false,
    );
    expect(
      shouldOfferImport(
        { kind: "unreadable", reason: "corrupted" },
        { kind: "none" },
        false,
      ),
    ).toBe(false);
  });

  it("never overwrites progress the account already has", () => {
    expect(
      shouldOfferImport(
        { kind: "ok", record: guest },
        { kind: "ok", record: { ...guest, checkpoint: "CP1" } },
        false,
      ),
    ).toBe(false);
  });
});
