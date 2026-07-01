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
  outForApproval: Project[];
  /** Closed jobs — searchable, not shown as a live column. */
  closed: Project[];
  /** Active work = requested + in progress + out for approval. The headline. */
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
  const outForApproval = sortProjects(
    projects.filter((p) => p.status === "out-for-approval"),
  );
  const closed = projects.filter((p) => p.status === "closed");
  return {
    requested,
    inProgress,
    outForApproval,
    closed,
    activeTotal: requested.length + inProgress.length + outForApproval.length,
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
        `${snapshot.outForApproval.length} out for approval, ` +
        `${snapshot.closed.length} closed`,
    );
    return snapshot;
  } catch (err) {
    console.error("[queue] Trello sync failed:", err);
    if (lastGood) return { ...lastGood, stale: true };
    throw err;
  }
}
