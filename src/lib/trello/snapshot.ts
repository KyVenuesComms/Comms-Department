// Builds the board snapshot from Trello, throttles refreshes, and guarantees
// the screen never goes blank by falling back to the last good snapshot.
import "server-only";
import { REFRESH_MS } from "../queue/config";
import { sortProjects, toProject } from "../queue/map";
import type { Project } from "../queue/types";
import { fetchBoardCards } from "./client";

export interface QueueSnapshot {
  requested: Project[];
  inProgress: Project[];
  /** Closed jobs — used by the history search, not shown on the live board. */
  closed: Project[];
  /** Active work = requested + in progress. The headline workload number. */
  activeTotal: number;
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
  const projects = (await fetchBoardCards()).map(toProject);
  const requested = sortProjects(
    projects.filter((p) => p.status === "requested"),
  );
  const inProgress = sortProjects(
    projects.filter((p) => p.status === "in-progress"),
  );
  const closed = projects.filter((p) => p.status === "closed");
  return {
    requested,
    inProgress,
    closed,
    activeTotal: requested.length + inProgress.length,
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
    console.info(
      `[queue] synced: ${snapshot.requested.length} requested, ` +
        `${snapshot.inProgress.length} in progress, ` +
        `${snapshot.closed.length} closed`,
    );
    return snapshot;
  } catch (err) {
    console.error("[queue] Trello sync failed:", err);
    if (lastGood) return { ...lastGood, stale: true };
    throw err;
  }
}
