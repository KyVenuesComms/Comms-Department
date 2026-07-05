import { storeMode } from "@/lib/store/store";
import { refreshQueue } from "@/lib/trello/snapshot";

// Scheduled by vercel.json. Rebuilds the snapshot, writes it to the store, and
// banks a daily trend point. Runs on a schedule so visitors never hit Trello.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }
  try {
    const snap = await refreshQueue();
    return Response.json({ ok: true, store: storeMode(), active: snap.activeTotal });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
