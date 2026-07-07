import { Board } from "@/features/board/Board";
import { showPhase } from "@/lib/queue/shows";
import { getShows } from "@/lib/queue/shows-store";
import { getQueueSnapshot, getWorkloadContext } from "@/lib/trello/snapshot";
import type { WorkloadContext } from "@/lib/queue/types";

// Reads live Trello data on each request — not prerendered at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  let snapshot = null;
  let workload: WorkloadContext | null = null;
  try {
    snapshot = await getQueueSnapshot();
    workload = await getWorkloadContext(snapshot.activeTotal);
  } catch {
    snapshot = null;
  }

  if (!snapshot) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16 font-sans dark:bg-zinc-950">
        <div className="max-w-md rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-center text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
          <p className="font-medium">Can&rsquo;t reach Trello right now.</p>
          <p className="mt-1 text-sm">
            The board will reappear automatically once the connection is back.
          </p>
        </div>
      </div>
    );
  }

  // Chips for shows that haven't wrapped yet ("Kentucky State Fair · 46 days").
  // "Now" = the snapshot time (pure for render; fresh within the refresh window).
  const nowMs = new Date(snapshot.updatedAt).getTime();
  const showChips = (await getShows()).map((s) => ({ show: s, phase: showPhase(s, nowMs) }))
    .filter(({ phase }) => phase.phase !== "after")
    .map(({ show, phase }) => ({
      slug: show.slug,
      label:
        phase.phase === "during"
          ? `${show.name} · LIVE`
          : `${show.name} · ${phase.days} day${phase.days === 1 ? "" : "s"}`,
    }));

  return (
    <Board
      requested={snapshot.requested}
      inProgress={snapshot.inProgress}
      outForApproval={snapshot.outForApproval}
      closedCount={snapshot.closed.length}
      activeTotal={snapshot.activeTotal}
      metrics={snapshot.metrics}
      workload={workload}
      showChips={showChips}
      updatedAt={snapshot.updatedAt}
      stale={snapshot.stale}
    />
  );
}
