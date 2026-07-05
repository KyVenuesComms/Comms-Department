// Seasonal intake forecasting from the board's full history (closed + archived
// cards' creation dates). Pure — no I/O.
//
// Method: for each of the last SEASONAL_YEARS years, compare intake in the
// window that matches "the next 4 weeks" against the window matching "the last
// 4 weeks". The pooled ratio is a seasonal ramp (e.g. "August brings 1.4× July")
// that self-corrects for overall volume growth, then scales today's intake rate.
import type { CockpitData } from "./types";

const DAY = 86_400_000;
const YEAR = 365 * DAY;

export const SEASONAL_YEARS = 3;
/** Don't quote a ratio built on fewer prior-window requests than this. */
export const SEASONAL_MIN_BASE = 15;

export type Seasonal = NonNullable<CockpitData["forecast"]["seasonal"]>;

export function seasonalOutlook(
  createdMs: number[],
  nowMs: number,
  recentIntake: number,
  activeNow: number,
  shippedPerWeekAvg: number,
  horizonDays = 28,
): Seasonal | null {
  const horizon = horizonDays * DAY;
  let ahead = 0;
  let base = 0;
  let years = 0;

  for (let y = 1; y <= SEASONAL_YEARS; y++) {
    const anchor = nowMs - y * YEAR;
    const aheadCount = createdMs.filter((t) => t >= anchor && t < anchor + horizon).length;
    const baseCount = createdMs.filter((t) => t >= anchor - horizon && t < anchor).length;
    if (aheadCount + baseCount === 0) continue; // no data that far back
    ahead += aheadCount;
    base += baseCount;
    years++;
  }

  if (years === 0 || base < SEASONAL_MIN_BASE) return null;

  const ratio = ahead / base;
  const expectedIntake = Math.round(recentIntake * ratio);
  const expectedShipped = Math.round(shippedPerWeekAvg * (horizonDays / 7));
  return {
    pctChange: Math.round((ratio - 1) * 100),
    expectedIntake,
    recentIntake,
    inFourWeeks: Math.max(0, activeNow + expectedIntake - expectedShipped),
    years,
  };
}
