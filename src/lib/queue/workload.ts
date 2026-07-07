// Pure: compares today's active load to a typical recent day. No I/O.
import { defaultTuning } from "./config";
import type { TrendPoint, Tuning, WorkloadContext } from "./types";

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * @param trend banked daily points (any order)
 * @param activeToday today's active total
 * @param today YYYY-MM-DD to exclude from the "typical" baseline
 * Returns null until there are at least `tuning.trendMinDays` of prior history.
 */
export function workloadContext(
  trend: TrendPoint[],
  activeToday: number,
  today: string,
  tuning: Tuning = defaultTuning(),
): WorkloadContext | null {
  const prior = trend
    .filter((p) => p.date !== today)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, tuning.trendWindowDays);

  if (prior.length < tuning.trendMinDays) return null;

  const typical = median(prior.map((p) => p.active));
  if (typical <= 0) return null;

  const pct = Math.round(((activeToday - typical) / typical) * 100);
  const level =
    pct >= tuning.workloadBandPct
      ? "busier"
      : pct <= -tuning.workloadBandPct
        ? "quieter"
        : "typical";

  return { level, pct, sampleDays: prior.length };
}
