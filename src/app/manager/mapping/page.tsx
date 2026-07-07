import { cookies } from "next/headers";
import { ManagerLogin } from "@/features/cockpit/ManagerLogin";
import { MappingManager } from "@/features/mapping/MappingManager";
import { MGR_COOKIE, isAuthed, managerConfigured } from "@/lib/auth";
import { getTrelloMapping } from "@/lib/queue/mapping-store";
import { fetchBoardLabels, fetchBoardLists } from "@/lib/trello/client";

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

export default async function MappingPage() {
  // Same gate as the cockpit — fail closed.
  if (!managerConfigured()) {
    return <Notice title="Not set up yet" body="Set MANAGER_PASSWORD in the environment to manage the mapping." />;
  }
  const store = await cookies();
  if (!isAuthed(store.get(MGR_COOKIE)?.value)) {
    return <ManagerLogin />;
  }

  // The list editor needs the board's real lists; without them, don't render a
  // form that could save a wipe.
  let lists: string[] = [];
  let labels: string[] = [];
  try {
    [lists, labels] = await Promise.all([fetchBoardLists(), fetchBoardLabels()]);
  } catch {
    return <Notice title="Can't reach Trello right now" body="The mapping editor needs the live board. Try again in a moment." />;
  }

  const mapping = await getTrelloMapping();
  return <MappingManager lists={lists} labels={labels} mapping={mapping} />;
}
