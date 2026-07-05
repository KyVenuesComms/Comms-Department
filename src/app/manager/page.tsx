import { cookies } from "next/headers";
import { Cockpit } from "@/features/cockpit/Cockpit";
import { ManagerLogin } from "@/features/cockpit/ManagerLogin";
import { MGR_COOKIE, isAuthed, managerConfigured } from "@/lib/auth";
import { getQueueSnapshot, getTrendSeries } from "@/lib/trello/snapshot";

export const dynamic = "force-dynamic";

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "#E7E7E2" }}>
      <div className="max-w-md rounded-2xl border bg-white px-6 py-5 text-center" style={{ borderColor: "#E4E4DF" }}>
        <p className="font-semibold" style={{ color: "#131311" }}>{title}</p>
        <p className="mt-1 text-sm" style={{ color: "#6A6A63" }}>{body}</p>
      </div>
    </div>
  );
}

export default async function ManagerPage() {
  // Fail closed: no password configured means no access.
  if (!managerConfigured()) {
    return <Notice title="Leadership cockpit isn't set up yet" body="Set MANAGER_PASSWORD in the environment to enable this page." />;
  }
  const store = await cookies();
  if (!isAuthed(store.get(MGR_COOKIE)?.value)) {
    return <ManagerLogin />;
  }

  let snapshot = null;
  try {
    snapshot = await getQueueSnapshot();
  } catch {
    snapshot = null;
  }
  if (!snapshot) {
    return <Notice title="Can't reach Trello right now" body="The cockpit will reappear once the connection is back." />;
  }

  const trend = await getTrendSeries().catch(() => []);

  return (
    <Cockpit
      cockpit={snapshot.cockpit}
      turnaround={snapshot.metrics.turnaround}
      trend={trend}
      updatedAt={snapshot.updatedAt}
      stale={snapshot.stale}
    />
  );
}
