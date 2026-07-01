import { Board } from "@/features/board/Board";
import { getQueueSnapshot } from "@/lib/trello/snapshot";

// Reads live Trello data on each request — not prerendered at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  let snapshot = null;
  try {
    snapshot = await getQueueSnapshot();
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

  return (
    <Board
      requested={snapshot.requested}
      inProgress={snapshot.inProgress}
      outForApproval={snapshot.outForApproval}
      closedCount={snapshot.closed.length}
      activeTotal={snapshot.activeTotal}
      updatedAt={snapshot.updatedAt}
      stale={snapshot.stale}
    />
  );
}
