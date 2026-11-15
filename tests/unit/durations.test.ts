import { describe, expect, it } from "vitest";
import {
  CUSTOM_DURATION_OPTIONS_MIN,
  DEFAULT_DURATION_MIN,
  DURATION_PRESETS_MIN,
  finishTime,
  isValidDuration,
  nextFittingDuration,
  parseDurationParam,
} from "@/lib/run/durations";

describe("duration rules", () => {
  it("offers 20, 30 and 45 with 30 as the default", () => {
    expect(DURATION_PRESETS_MIN).toEqual([20, 30, 45]);
    expect(DEFAULT_DURATION_MIN).toBe(30);
  });

  it("allows custom lengths from 15 to 60 minutes in 5 minute steps", () => {
    expect(CUSTOM_DURATION_OPTIONS_MIN[0]).toBe(15);
    expect(CUSTOM_DURATION_OPTIONS_MIN.at(-1)).toBe(60);
    expect(CUSTOM_DURATION_OPTIONS_MIN).toHaveLength(10);
    expect(isValidDuration(25)).toBe(true);
    expect(isValidDuration(41)).toBe(false);
    expect(isValidDuration(10)).toBe(false);
    expect(isValidDuration(65)).toBe(false);
  });

  it("parses a length from a URL parameter and rejects anything else", () => {
    expect(parseDurationParam("45")).toBe(45);
    expect(parseDurationParam("44")).toBeNull();
    expect(parseDurationParam("abc")).toBeNull();
    expect(parseDurationParam(null)).toBeNull();
  });

  it("suggests the shortest allowed length that fits", () => {
    expect(nextFittingDuration(17)).toBe(20);
    expect(nextFittingDuration(20)).toBe(20);
    expect(nextFittingDuration(3)).toBe(15);
    expect(nextFittingDuration(61)).toBeNull();
  });

  it("formats the finish time from the given now", () => {
    const now = Date.UTC(2026, 10, 14, 19, 12);
    expect(finishTime(now, 30, { locale: "en-US", timeZone: "UTC" })).toBe(
      "7:42 PM",
    );
  });
});
