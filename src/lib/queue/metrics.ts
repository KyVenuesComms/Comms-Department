// Pure metric computations. No I/O — takes projects + move history, returns
// numbers. Add a new metric here (plus a test); the fetch and UI don't change.
import { DEPARTMENT_LABELS, defaultTuning } from "./config";
import { cardCreatedAt, statusForList } from "./map";
import type { Move, Project, QueueMetrics, Tuning } from "./types";

const DAY_MS = 86_400_000;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Latest move time per card = when it entered its current stage. */
export function stageEntryDates(moves: Move[]): Map<string, string> {
  const latest = new Map<string, string>();
  for (const m of moves) {
    const prev = latest.get(m.cardId);
    if (!prev || new Date(m.at) > new Date(prev)) latest.set(m.cardId, m.at);
  }
  return latest;
}

/**
 * Typical time from card creation (≈ added to queue) to reaching "out for
 * approval." Median (robust to mega-request spikes) + a buffer. Null if too few.
 */
export function turnaround(
  moves: Move[],
  nowMs: number,
  tuning: Tuning = defaultTuning(),
): QueueMetrics["turnaround"] {
  const cutoff = nowMs - tuning.turnaroundWindowDays * DAY_MS;
  const samples = moves
    .filter(
      (m) =>
        statusForList(m.toList) === "out-for-approval" &&
        new Date(m.at).getTime() >= cutoff,
    )
    .map(
      (m) =>
        (new Date(m.at).getTime() - new Date(cardCreatedAt(m.cardId)).getTime()) /
        DAY_MS,
    )
    .filter((days) => days >= 0 && days < 365);

  if (samples.length < tuning.turnaroundMinSamples) return null;
  const med = median(samples);
  return {
    medianDays: Math.round(med),
    quotedDays: Math.ceil(med) + tuning.turnaroundBufferDays,
    sampleSize: samples.length,
  };
}

/** Jobs that reached a closed list within the recent window, newest first. */
export function recentlyCompleted(
  moves: Move[],
  nowMs: number,
  tuning: Tuning = defaultTuning(),
): QueueMetrics["recentlyCompleted"] {
  const cutoff = nowMs - tuning.recentlyCompletedDays * DAY_MS;
  const seen = new Set<string>();
  return moves
    .filter(
      (m) =>
        statusForList(m.toList) === "closed" &&
        new Date(m.at).getTime() >= cutoff,
    )
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .filter((m) => (seen.has(m.cardId) ? false : seen.add(m.cardId)))
    .slice(0, tuning.recentlyCompletedMax)
    .map((m) => ({ id: m.cardId, name: m.cardName, at: m.at }));
}

/** Per-department stage counts, for the "your department" summary. */
export function perDepartment(
  requested: Project[],
  inProgress: Project[],
  outForApproval: Project[],
): QueueMetrics["perDepartment"] {
  const out: QueueMetrics["perDepartment"] = {};
  for (const dept of DEPARTMENT_LABELS) {
    const has = (p: Project) => p.departments.includes(dept);
    const r = requested.filter(has).length;
    const ip = inProgress.filter(has).length;
    const ofa = outForApproval.filter(has).length;
    out[dept] = {
      requested: r,
      inProgress: ip,
      outForApproval: ofa,
      total: r + ip + ofa,
    };
  }
  return out;
}
