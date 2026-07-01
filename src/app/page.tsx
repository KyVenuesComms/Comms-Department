import { getQueueSnapshot, type QueueSnapshot } from "@/lib/trello/snapshot";

// Reads live Trello data on each request — not prerendered at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  let snapshot: QueueSnapshot | null = null;
  try {
    snapshot = await getQueueSnapshot();
  } catch {
    snapshot = null;
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16 font-sans dark:bg-zinc-950">
      <main className="w-full max-w-xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-400">
          Creative team
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Work Order Status
        </h1>

        {snapshot ? (
          <>
            <div className="mt-8 flex items-baseline justify-center gap-3">
              <span className="text-5xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                {snapshot.activeTotal}
              </span>
              <span className="text-lg text-zinc-600 dark:text-zinc-400">
                active projects
              </span>
            </div>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              <span className="tabular-nums text-sky-700 dark:text-sky-400">
                {snapshot.requested.length}
              </span>{" "}
              requested ·{" "}
              <span className="tabular-nums text-amber-700 dark:text-amber-500">
                {snapshot.inProgress.length}
              </span>{" "}
              in progress ·{" "}
              <span className="tabular-nums">{snapshot.closed.length}</span>{" "}
              closed
            </p>
            <p className="mt-6 text-sm text-zinc-400 dark:text-zinc-500">
              {snapshot.stale
                ? "Showing the last good data — Trello was unreachable just now."
                : `Updated ${new Date(snapshot.updatedAt).toLocaleString()}`}
            </p>
          </>
        ) : (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            <p className="font-medium">Can&rsquo;t reach Trello right now.</p>
            <p className="mt-1 text-sm">
              Check that your Trello credentials are set in{" "}
              <code className="font-mono">.env.local</code>, then refresh.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
