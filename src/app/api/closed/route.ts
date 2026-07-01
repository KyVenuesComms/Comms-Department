import { getQueueSnapshot } from "@/lib/trello/snapshot";

// Searches the closed-jobs history by name. Kept server-side so we don't ship
// ~1,400 closed cards to every browser.
export const dynamic = "force-dynamic";

const MAX_RESULTS = 50;

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams
    .get("q")
    ?.trim()
    .toLowerCase();
  if (!q) return Response.json({ results: [] });

  try {
    const snapshot = await getQueueSnapshot();
    const results = snapshot.closed
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS)
      .map((p) => ({ id: p.id, name: p.name, departments: p.departments }));
    return Response.json({ results });
  } catch {
    return Response.json({ results: [], error: true });
  }
}
