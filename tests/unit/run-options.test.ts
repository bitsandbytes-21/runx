import { describe, expect, it } from "vitest";
import {
  DEMO_SPEED,
  parseRunOptions,
  withTestParams,
} from "@/lib/run/run-options";

const parse = (query: string) => parseRunOptions(new URLSearchParams(query));

describe("parseRunOptions", () => {
  it("defaults to a real 30 minute run with audio", () => {
    expect(parse("")).toEqual({
      durationMin: 30,
      isDemo: false,
      speed: 1,
      audioMode: "html",
      isResume: false,
      includeRecap: false,
      fromCheckpoint: null,
    });
  });

  it("reads a valid length and ignores an invalid one", () => {
    expect(parse("min=45").durationMin).toBe(45);
    expect(parse("min=7").durationMin).toBe(30);
  });

  it("runs the demo as a 20 minute plan on an accelerated clock", () => {
    expect(parse("demo=1")).toMatchObject({
      isDemo: true,
      durationMin: 20,
      speed: DEMO_SPEED,
    });
  });

  it("accepts a test speed and silent audio for E2E runs", () => {
    expect(parse("audio=silent&speed=60")).toMatchObject({
      audioMode: "silent",
      speed: 60,
    });
    expect(parse("speed=5000").speed).toBe(1);
  });

  it("reads resume and recap flags", () => {
    expect(parse("resume=1&from=CP2&recap=1")).toMatchObject({
      isResume: true,
      includeRecap: true,
      fromCheckpoint: "CP2",
    });
    expect(parse("recap=1").includeRecap).toBe(false);
    expect(parse("resume=1&from=CP9")).toMatchObject({
      isResume: false,
      fromCheckpoint: null,
    });
  });
});

describe("withTestParams", () => {
  it("forwards only the audio and speed parameters", () => {
    const next = withTestParams(
      new URLSearchParams("audio=silent&speed=60&min=45"),
      new URLSearchParams("min=20"),
    );
    expect(next.toString()).toBe("min=20&audio=silent&speed=60");
  });
});
