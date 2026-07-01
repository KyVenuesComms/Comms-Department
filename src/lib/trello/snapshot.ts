// Builds the board snapshot from Trello, throttles refreshes, and guarantees
// the screen never goes blank by falling back to the last good snapshot.
import "server-only";
import { REFRESH_MS } from "../queue/config";
import { sortProjects, toProject } from "../queue/map";
import {
  perDepartment,
  recentlyCompleted,
  stageEntryDates,
  turnaround,
} from "../queue/metrics";
import type { Project, QueueMetrics } from "../queue/types";
import { fetchBoardCards, fetchListMoves } from "./client";

export interface QueueSnapshot {
  requested: Project[];
  inProgress: Project[];
  outForApproval: Project[];
  /** Closed jobs — searchable, not shown as a live column. */
  closed: Project[];
  /** Active work = requested + in progress + out for approval. The headline. */
  activeTotal: number;
  /** Computed board-wide numbers (turnaround, recently completed, per-dept). */
  metrics: QueueMetrics;
  /** When this data was read from Trello (ISO string). */
  updatedAt: string;
  /** True when Trello was unreachable and we're serving the last good copy. */
  stale: boolean;
}

// In-memory last-good copy. Persists for the life of a server instance; a
// durable, shared store (Vercel KV) is a later upgrade for serverless.
let lastGood: QueueSnapshot | null = null;
let lastFetchedMs = 0;

async function build(): Promise<QueueSnapshot> {
  const [cards, moves] = await Promise.all([
    fetchBoardCards(),
    // Move history is an enhancement, not load-bearing — never let it blank the board.
    fetchListMoves().catch((err) => {
      console.warn("[queue] move history unavailable:", err);
      return [];
    }),
  ]);

  const projects = cards.map(toProject);
  const enteredAt = stageEntryDates(moves);
  for (const p of projects) p.enteredStageAt = enteredAt.get(p.id) ?? null;

  const requested = sortProjects(
    projects.filter((p) => p.status === "requested"),
  );
  const inProgress = sortProjects(
    projects.filter((p) => p.status === "in-progress"),
  );
  const outForApproval = sortProjects(
    projects.filter((p) => p.status === "out-for-approval"),
  );
  const closed = projects.filter((p) => p.status === "closed");

  const nowMs = Date.now();
  const metrics: QueueMetrics = {
    turnaround: turnaround(moves, nowMs),
    recentlyCompleted: recentlyCompleted(moves, nowMs),
    perDepartment: perDepartment(requested, inProgress, outForApproval),
  };

  return {
    requested,
    inProgress,
    outForApproval,
    closed,
    activeTotal: requested.length + inProgress.length + outForApproval.length,
    metrics,
    updatedAt: new Date().toISOString(),
    stale: false,
  };
}

/**
 * The board's data. Returns the cached copy if it's still fresh (< REFRESH_MS).
 * On a failed refresh, returns the last good copy marked stale; only throws if
 * there's no copy to fall back to (first load with Trello unreachable).
 */
export async function getQueueSnapshot(): Promise<QueueSnapshot> {
  const now = Date.now();
  if (lastGood && now - lastFetchedMs < REFRESH_MS) return lastGood;

  try {
    const snapshot = await build();
    lastGood = snapshot;
    lastFetchedMs = now;
    const t = snapshot.metrics.turnaround;
    console.info(
      `[queue] synced: ${snapshot.requested.length} requested, ` +
        `${snapshot.inProgress.length} in progress, ` +
        `${snapshot.outForApproval.length} out for approval, ` +
        `${snapshot.closed.length} closed | ` +
        `turnaround: ${t ? `~${t.quotedDays}d (median ${t.medianDays}d, n=${t.sampleSize})` : "n/a"}, ` +
        `recently completed: ${snapshot.metrics.recentlyCompleted.length}`,
    );
    return snapshot;
  } catch (err) {
    console.error("[queue] Trello sync failed:", err);
    if (lastGood) return { ...lastGood, stale: true };
    throw err;
  }
}
