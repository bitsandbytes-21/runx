import { describe, expect, it } from "vitest";
import { deleteProgress, getProgress, putProgress } from "@/lib/api/handlers";
import { fakeDeps, request } from "../fixtures/api-fakes";

const body = (value: unknown) => JSON.stringify(value);

describe("progress endpoints", () => {
  it("return 401 without a token", async () => {
    const { deps } = fakeDeps();
    for (const response of [
      await getProgress(deps, request("/api/progress/ep1"), "ep1"),
      await putProgress(
        deps,
        request("/api/progress/ep1", {
          method: "PUT",
          body: body({ checkpoint: "CP1", status: "in_progress" }),
        }),
        "ep1",
      ),
      await deleteProgress(
        deps,
        request("/api/progress/ep1", { method: "DELETE" }),
        "ep1",
      ),
    ]) {
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("unauthenticated");
    }
  });

  it("returns 401 for an invalid token", async () => {
    const { deps } = fakeDeps();
    const response = await getProgress(
      deps,
      request("/api/progress/ep1", { token: "forged" }),
      "ep1",
    );
    expect(response.status).toBe(401);
  });

  it("saves a checkpoint and reads it back", async () => {
    const { deps } = fakeDeps();
    const saved = await putProgress(
      deps,
      request("/api/progress/ep1", {
        method: "PUT",
        token: "token-runner",
        body: body({
          checkpoint: "CP2",
          status: "in_progress",
          lastDurationMin: 30,
        }),
      }),
      "ep1",
    );
    expect(saved.status).toBe(200);
    const read = await getProgress(
      deps,
      request("/api/progress/ep1", { token: "token-runner" }),
      "ep1",
    );
    expect(await read.json()).toEqual({
      episodeId: "ep1",
      manifestVersion: 1,
      checkpoint: "CP2",
      status: "in_progress",
      lastPlayedAt: "2026-11-14T10:00:00.000Z",
      lastDurationMin: 30,
    });
  });

  it("never shows one runner's progress to another", async () => {
    const { deps } = fakeDeps();
    await putProgress(
      deps,
      request("/api/progress/ep1", {
        method: "PUT",
        token: "token-runner",
        body: body({ checkpoint: "CP3", status: "in_progress" }),
      }),
      "ep1",
    );
    const other = await getProgress(
      deps,
      request("/api/progress/ep1", { token: "token-other" }),
      "ep1",
    );
    expect(other.status).toBe(404);
  });

  it("returns 400 with field errors and writes nothing for invalid input", async () => {
    const { deps, progress } = fakeDeps();
    const cases = [
      body({ checkpoint: "CP9", status: "in_progress" }),
      body({ checkpoint: "CP1", status: "done" }),
      body({ checkpoint: null, status: "in_progress" }),
      body({ checkpoint: "CP1", status: "complete" }),
      body({ checkpoint: "CP1", status: "in_progress", lastDurationMin: 99 }),
      "{not json",
    ];
    for (const raw of cases) {
      const response = await putProgress(
        deps,
        request("/api/progress/ep1", {
          method: "PUT",
          token: "token-runner",
          body: raw,
        }),
        "ep1",
      );
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error.code).toBe("invalid_input");
    }
    const fields = await (
      await putProgress(
        deps,
        request("/api/progress/ep1", {
          method: "PUT",
          token: "token-runner",
          body: body({ checkpoint: "CP9", status: "in_progress" }),
        }),
        "ep1",
      )
    ).json();
    expect(fields.error.fields).toHaveProperty("checkpoint");
    expect(progress.table.size).toBe(0);
  });

  it("returns 404 when saving progress for an unknown episode", async () => {
    const { deps } = fakeDeps();
    const response = await putProgress(
      deps,
      request("/api/progress/nope", {
        method: "PUT",
        token: "token-runner",
        body: body({ checkpoint: "CP1", status: "in_progress" }),
      }),
      "nope",
    );
    expect(response.status).toBe(404);
  });

  it("marks complete and clears progress", async () => {
    const { deps, progress } = fakeDeps();
    const done = await putProgress(
      deps,
      request("/api/progress/ep1", {
        method: "PUT",
        token: "token-runner",
        body: body({ checkpoint: null, status: "complete" }),
      }),
      "ep1",
    );
    expect((await done.json()).status).toBe("complete");
    const removed = await deleteProgress(
      deps,
      request("/api/progress/ep1", { method: "DELETE", token: "token-runner" }),
      "ep1",
    );
    expect(removed.status).toBe(204);
    expect(progress.table.size).toBe(0);
  });
});
