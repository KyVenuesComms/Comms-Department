// Pure: compares today's active load to a typical recent day. No I/O.
import { TREND_MIN_DAYS, TREND_WINDOW_DAYS, WORKLOAD_BAND_PCT } from "./config";
import type { TrendPoint, WorkloadContext } from "./types";

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * @param trend banked daily points (any order)
 * @param activeToday today's active total
 * @param today YYYY-MM-DD to exclude from the "typical" baseline
 * Returns null until there are at least TREND_MIN_DAYS of prior history.
 */
export function workloadContext(
  trend: TrendPoint[],
  activeToday: number,
  today: string,
): WorkloadContext | null {
  const prior = trend
    .filter((p) => p.date !== today)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, TREND_WINDOW_DAYS);

  if (prior.length < TREND_MIN_DAYS) return null;

  const typical = median(prior.map((p) => p.active));
  if (typical <= 0) return null;

  const pct = Math.round(((activeToday - typical) / typical) * 100);
  const level =
    pct >= WORKLOAD_BAND_PCT
      ? "busier"
      : pct <= -WORKLOAD_BAND_PCT
        ? "quieter"
        : "typical";

  return { level, pct, sampleDays: prior.length };
}
