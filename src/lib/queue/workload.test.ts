import { describe, expect, it } from "vitest";
import { workloadContext } from "./workload";
import type { TrendPoint } from "./types";

function pt(date: string, active: number): TrendPoint {
  return { date, active, requested: 0, inProgress: 0, outForApproval: 0 };
}

function days(n: number, active: number): TrendPoint[] {
  return Array.from({ length: n }, (_, i) =>
    pt(`2026-06-${String(i + 1).padStart(2, "0")}`, active),
  );
}

describe("workloadContext", () => {
  it("returns null until there is enough history", () => {
    expect(workloadContext(days(3, 100), 100, "2026-07-01")).toBeNull();
  });

  it("flags busier when well above the typical median", () => {
    const ctx = workloadContext(days(10, 100), 130, "2026-07-01");
    expect(ctx?.level).toBe("busier");
    expect(ctx?.pct).toBe(30);
    expect(ctx?.sampleDays).toBe(10);
  });

  it("flags quieter when well below", () => {
    expect(workloadContext(days(10, 100), 80, "2026-07-01")?.level).toBe("quieter");
  });

  it("reads as typical inside the band", () => {
    expect(workloadContext(days(10, 100), 105, "2026-07-01")?.level).toBe("typical");
  });

  it("excludes today from the baseline", () => {
    const trend = [...days(7, 100), pt("2026-07-01", 999)];
    const ctx = workloadContext(trend, 100, "2026-07-01");
    expect(ctx?.level).toBe("typical"); // 999 (today) must not skew the median
  });
});
