import { describe, expect, it } from "vitest";
import { seasonalOutlook } from "./seasonal";

const DAY = 86_400_000;
const YEAR = 365 * DAY;
const NOW = Date.parse("2026-07-20T00:00:00Z");

/** n creation timestamps spread inside [start, start + spanDays). */
function burst(start: number, n: number, spanDays = 28): number[] {
  return Array.from({ length: n }, (_, i) => start + ((i % spanDays) + 0.5) * DAY);
}

describe("seasonalOutlook", () => {
  it("detects a ramp: prior years had 2x intake in the upcoming window", () => {
    const history = [
      // Last year: 20 in the "last 4 weeks" window, 40 in the "next 4 weeks".
      ...burst(NOW - YEAR - 28 * DAY, 20),
      ...burst(NOW - YEAR, 40),
      // Two years back: same 2x pattern.
      ...burst(NOW - 2 * YEAR - 28 * DAY, 20),
      ...burst(NOW - 2 * YEAR, 40),
    ];
    const s = seasonalOutlook(history, NOW, 30, 100, 25);
    expect(s).not.toBeNull();
    expect(s!.pctChange).toBe(100); // 2x = +100%
    expect(s!.expectedIntake).toBe(60); // 30 recent × 2
    expect(s!.years).toBe(2);
    // 100 active + 60 expected in − 100 expected out (25/wk × 4)
    expect(s!.inFourWeeks).toBe(60);
  });

  it("returns null when history is too thin to trust", () => {
    const thin = burst(NOW - YEAR - 28 * DAY, 5); // under SEASONAL_MIN_BASE
    expect(seasonalOutlook(thin, NOW, 30, 100, 25)).toBeNull();
  });

  it("returns null with no history at all", () => {
    expect(seasonalOutlook([], NOW, 30, 100, 25)).toBeNull();
  });

  it("reads a seasonal slowdown as negative", () => {
    const history = [
      ...burst(NOW - YEAR - 28 * DAY, 40),
      ...burst(NOW - YEAR, 20),
    ];
    const s = seasonalOutlook(history, NOW, 30, 100, 25);
    expect(s!.pctChange).toBe(-50);
    expect(s!.expectedIntake).toBe(15);
  });
});
