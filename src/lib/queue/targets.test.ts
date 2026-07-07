import { describe, expect, it } from "vitest";
import { TARGETS, validateTargets } from "./config";

describe("validateTargets", () => {
  it("passes the built-in defaults", () => {
    expect(validateTargets(TARGETS)).toEqual([]);
  });

  it("rejects zero, negative, and non-integer values", () => {
    expect(validateTargets({ turnaroundDays: 0, overdue: 20, weeklyNetGrowth: 5 })[0]).toMatch(/Turnaround/);
    expect(validateTargets({ turnaroundDays: 28, overdue: -1, weeklyNetGrowth: 5 })[0]).toMatch(/Overdue/);
    expect(validateTargets({ turnaroundDays: 28, overdue: 20, weeklyNetGrowth: 1.5 })[0]).toMatch(/net-growth/);
  });

  it("rejects NaN (blank/garbage form input)", () => {
    expect(validateTargets({ turnaroundDays: NaN, overdue: 20, weeklyNetGrowth: 5 })).toHaveLength(1);
  });
});
