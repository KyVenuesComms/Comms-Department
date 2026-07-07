import { describe, expect, it } from "vitest";
import { defaultTuning, TARGETS, validateTargets, validateTuning } from "./config";

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

describe("validateTuning", () => {
  it("passes the built-in defaults", () => {
    expect(validateTuning(defaultTuning())).toEqual([]);
  });

  it("floors the refresh interval at 5 minutes (cost guard)", () => {
    expect(validateTuning({ ...defaultTuning(), refreshMinutes: 2 })[0]).toMatch(/Refresh interval/);
    expect(validateTuning({ ...defaultTuning(), refreshMinutes: 5 })).toEqual([]);
  });

  it("rejects a workload band over 100 percent", () => {
    expect(validateTuning({ ...defaultTuning(), workloadBandPct: 150 }).some((e) => /can.t exceed 100/.test(e))).toBe(true);
  });

  it("rejects non-integer and zero windows", () => {
    expect(validateTuning({ ...defaultTuning(), recentlyCompletedMax: 0 })[0]).toMatch(/Recently-completed max/);
    expect(validateTuning({ ...defaultTuning(), trendWindowDays: 1.5 })[0]).toMatch(/comparison window/);
  });
});
