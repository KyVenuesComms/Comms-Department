import { readLastAlerts, storeMode, writeLastAlerts } from "@/lib/store/store";
import { refreshQueue } from "@/lib/trello/snapshot";

/** Post newly-triggered threshold alerts to a Teams webhook (optional). */
async function notifyAlerts(alerts: string[]): Promise<void> {
  const url = process.env.TEAMS_WEBHOOK_URL;
  if (!url) return; // not configured — alerts still show on /manager
  const sig = alerts.join("|");
  if ((await readLastAlerts()) === sig) return; // unchanged since last ping
  if (alerts.length > 0) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `**Work Order Status — alerts**\n\n${alerts.map((a) => `- ${a}`).join("\n")}\n\nhttps://comms-department.vercel.app/manager`,
      }),
    });
    if (!res.ok) {
      console.warn(`[alerts] Teams webhook responded ${res.status}`);
      return; // don't record the signature; retry next run
    }
    console.info(`[alerts] notified Teams: ${alerts.length} alert(s)`);
  }
  await writeLastAlerts(sig);
}

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
    await notifyAlerts(snap.cockpit.alerts).catch((e) => console.warn("[alerts]", e));
    return Response.json({ ok: true, store: storeMode(), active: snap.activeTotal, alerts: snap.cockpit.alerts.length });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
