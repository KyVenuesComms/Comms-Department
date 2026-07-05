// Builds the board snapshot, and bridges it to the durable store. Visitors read
// the stored snapshot (written by the cron); if there's no store, they build it
// in-memory (throttled) — so it works with or without KV.
import "server-only";
import { REFRESH_MS } from "../queue/config";
import { sortProjects, toProject } from "../queue/map";
import { perDepartment, recentlyCompleted, stageEntryDates, turnaround } from "../queue/metrics";
import { workloadContext } from "../queue/workload";
import type { QueueMetrics, TrendPoint, WorkloadContext } from "../queue/types";
import {
  appendTrendPoint,
  readSnapshot,
  readTrend,
  storeMode,
  writeLastSync,
  writeSnapshot,
  type LastSync,
} from "../store/store";
import { fetchBoardCards, fetchListMoves } from "./client";
import type { QueueSnapshot } from "./snapshot-types";

export type { QueueSnapshot };

/** Today's date (YYYY-MM-DD) in Eastern time — the trend key. */
function todayET(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

async function build(): Promise<QueueSnapshot> {
  const [cards, moves] = await Promise.all([
    fetchBoardCards(),
    fetchListMoves().catch((err) => {
      console.warn("[queue] move history unavailable:", err);
      return [];
    }),
  ]);

  const projects = cards.map(toProject);
  const enteredAt = stageEntryDates(moves);
  for (const p of projects) p.enteredStageAt = enteredAt.get(p.id) ?? null;

  const requested = sortProjects(projects.filter((p) => p.status === "requested"));
  const inProgress = sortProjects(projects.filter((p) => p.status === "in-progress"));
  const outForApproval = sortProjects(projects.filter((p) => p.status === "out-for-approval"));
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

// In-memory path (no KV): throttle + last-good fallback so the screen never blanks.
let memLastGood: QueueSnapshot | null = null;
let memAt = 0;
async function getOrBuildMemory(): Promise<QueueSnapshot> {
  const now = Date.now();
  if (memLastGood && now - memAt < REFRESH_MS) return memLastGood;
  try {
    const snap = await build();
    memLastGood = snap;
    memAt = now;
    return snap;
  } catch (err) {
    console.error("[queue] Trello sync failed:", err);
    if (memLastGood) return { ...memLastGood, stale: true };
    throw err;
  }
}

/** What visitors read. Prefers the stored snapshot (fast, cron-written). */
export async function getQueueSnapshot(): Promise<QueueSnapshot> {
  if (storeMode() === "kv") {
    const stored = await readSnapshot().catch((e) => {
      console.warn("[queue] store read failed:", e);
      return null;
    });
    if (stored) return stored;
    // KV connected but empty (before the first cron run) — build + seed it.
    const built = await build();
    await writeSnapshot(built).catch((e) => console.warn("[queue] seed write failed:", e));
    return built;
  }
  return getOrBuildMemory();
}

/** What the cron runs: rebuild, persist, bank a trend point, record the sync. */
export async function refreshQueue(): Promise<QueueSnapshot> {
  const start = Date.now();
  try {
    const snap = await build();
    await writeSnapshot(snap);
    const point: TrendPoint = {
      date: todayET(),
      active: snap.activeTotal,
      requested: snap.requested.length,
      inProgress: snap.inProgress.length,
      outForApproval: snap.outForApproval.length,
    };
    await appendTrendPoint(point);
    const sync: LastSync = {
      at: new Date().toISOString(),
      ok: true,
      ms: Date.now() - start,
      counts: {
        requested: snap.requested.length,
        inProgress: snap.inProgress.length,
        outForApproval: snap.outForApproval.length,
        closed: snap.closed.length,
      },
    };
    await writeLastSync(sync);
    const t = snap.metrics.turnaround;
    console.info(
      `[queue] refresh ok (${storeMode()}, ${sync.ms}ms): ${point.requested}/${point.inProgress}/${point.outForApproval} active, ${snap.closed.length} closed | turnaround ${t ? `~${t.quotedDays}d` : "n/a"}`,
    );
    return snap;
  } catch (err) {
    await writeLastSync({ at: new Date().toISOString(), ok: false, ms: Date.now() - start, error: String(err) }).catch(() => {});
    console.error("[queue] refresh failed:", err);
    throw err;
  }
}

/** Today's load vs a typical recent day (null until enough history is banked). */
export async function getWorkloadContext(activeToday: number): Promise<WorkloadContext | null> {
  const trend = await readTrend().catch(() => []);
  return workloadContext(trend, activeToday, todayET());
}
