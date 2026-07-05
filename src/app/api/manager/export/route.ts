import { cookies } from "next/headers";
import { isAuthed, managerConfigured, MGR_COOKIE } from "@/lib/auth";
import { getQueueSnapshot } from "@/lib/trello/snapshot";
import type { Project } from "@/lib/queue/types";

// CSV export of active work orders for the leadership cockpit. Same cookie
// gate as /manager — fail closed.
export const dynamic = "force-dynamic";

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export async function GET() {
  if (!managerConfigured()) return new Response("Not configured", { status: 404 });
  const store = await cookies();
  if (!isAuthed(store.get(MGR_COOKIE)?.value)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const s = await getQueueSnapshot();
  const rows: [string, Project[]][] = [
    ["In Queue", s.requested],
    ["In Progress", s.inProgress],
    ["Out for Approval", s.outForApproval],
  ];
  const header = "Stage,Project,Department,Type,Flags,Assignee,Created,In stage since,Due";
  const lines = [header];
  for (const [stage, list] of rows) {
    for (const p of list) {
      lines.push(
        [
          stage,
          p.name,
          p.departments[0] ?? "Unassigned",
          p.type ?? "",
          p.flags.join("; "),
          p.assignee ?? "",
          p.createdAt.slice(0, 10),
          p.enteredStageAt?.slice(0, 10) ?? "",
          p.dueAt?.slice(0, 10) ?? "",
        ]
          .map(csvCell)
          .join(","),
      );
    }
  }
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="work-orders-${today}.csv"`,
    },
  });
}
