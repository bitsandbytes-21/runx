import { describe, expect, it } from "vitest";
import { formatClock } from "@/lib/run/format-clock";

describe("formatClock", () => {
  it("shows minutes and seconds, rounding seconds up so 0:00 means done", () => {
    expect(formatClock(30 * 60)).toBe("30:00");
    expect(formatClock(59.2)).toBe("1:00");
    expect(formatClock(61)).toBe("1:01");
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(-4)).toBe("0:00");
  });
});
