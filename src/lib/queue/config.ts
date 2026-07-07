// The single source of truth for how Trello maps onto the board.
// Change a Trello list name here (one place) and the whole app follows.
import type { Flag, ProjectType, Status, Targets } from "./types";

/**
 * Trello list names grouped by the status a department sees.
 * Any list NOT listed here maps to "hidden" by default — so internal lists
 * (Sent to Printer, GPS Ownership, On Hold, or any brand-new list) never leak.
 */
export const LISTS_BY_STATUS: Record<Exclude<Status, "hidden">, string[]> = {
  requested: [
    "Work Order Queue",
    "2026 KSF & WCHS",
    "KSF Merch Store",
    "Jansen Story",
    "Outsourced",
    "Up Next",
  ],
  "in-progress": ["In Progress", "Department Review"],
  "out-for-approval": ["Out For Approval"],
  closed: ["Closed Jobs"],
};

/** Attention-flag labels (closed set) — everything here renders as a badge. */
export const FLAG_LABELS: Flag[] = [
  "High Priority",
  "Submitted Past Deadline",
  "Waiting for Info",
];

/** Project-type labels (closed set). */
export const TYPE_LABELS: ProjectType[] = ["Print", "Signage", "Digital"];

/**
 * Department labels (known set). The board carries many other labels — people,
 * vendors, events, categories — which we deliberately ignore. Only labels here
 * count as a department; add more as departments come online. V1: Expositions.
 */
export const DEPARTMENT_LABELS: string[] = ["Expositions"];

/** How often to re-read Trello. ONE home for the refresh interval (~10 min). */
export const REFRESH_MS = 10 * 60 * 1000;

// --- Metric tuning (one place to adjust the numbers departments see) ---

/** Only look at approvals from the last N days when computing turnaround. */
export const TURNAROUND_WINDOW_DAYS = 60;
/** Don't quote a turnaround until we have at least this many samples. */
export const TURNAROUND_MIN_SAMPLES = 5;
/** Buffer added to the median so quotes stay realistic during busy periods. */
export const TURNAROUND_BUFFER_DAYS = 2;

/** "Recently completed" shows jobs closed within this many days… */
export const RECENTLY_COMPLETED_DAYS = 7;
/** …up to this many entries. */
export const RECENTLY_COMPLETED_MAX = 12;

// --- Workload trend (needs KV history to light up) ---

// --- Leadership targets (the "vs target" context on the cockpit; tune freely) ---
export const TARGETS: Targets = {
  /** Quoted turnaround should stay at or under this many days. */
  turnaroundDays: 28,
  /** Overdue active projects should stay under this. */
  overdue: 20,
  /** Alert when the backlog is growing faster than this per week (avg). */
  weeklyNetGrowth: 5,
};

/** Plain-English problems with a set of targets — empty means good to save. */
export function validateTargets(t: Targets): string[] {
  const errors: string[] = [];
  const check = (v: number, label: string) => {
    if (!Number.isFinite(v) || !Number.isInteger(v) || v <= 0) {
      errors.push(`${label} must be a whole number greater than zero.`);
    }
  };
  check(t.turnaroundDays, "Turnaround target");
  check(t.overdue, "Overdue target");
  check(t.weeklyNetGrowth, "Weekly net-growth target");
  return errors;
}

/** Compare today's load against the median of the prior this-many days. */
export const TREND_WINDOW_DAYS = 30;
/** Don't show a workload read until we have this many prior days banked. */
export const TREND_MIN_DAYS = 7;
/** How far from the typical median counts as "busier"/"quieter" (percent). */
export const WORKLOAD_BAND_PCT = 15;
