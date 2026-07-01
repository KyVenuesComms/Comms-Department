import { getQueueSnapshot } from "@/lib/trello/snapshot";
import type { Project, Status } from "@/lib/queue/types";

// Unified search across every stage — requested, in progress, out for approval,
// and closed. Runs server-side so the closed archive (~1,400 cards) never ships
// to the browser.
export const dynamic = "force-dynamic";

const MAX_RESULTS = 50;

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase();
  if (!q) return Response.json({ results: [] });

  try {
    const s = await getQueueSnapshot();
    // Active stages first, then closed — most searches want live work.
    const all: Project[] = [
      ...s.requested,
      ...s.inProgress,
      ...s.outForApproval,
      ...s.closed,
    ];
    const results = all
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS)
      .map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status as Status,
        departments: p.departments,
        url: p.url,
      }));
    return Response.json({ results });
  } catch {
    return Response.json({ results: [], error: true });
  }
}
