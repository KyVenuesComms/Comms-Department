import { readLastSync, readTrend, storeMode } from "@/lib/store/store";

// Lightweight ops endpoint: is the store connected, when did it last sync, how
// many trend days are banked. No secrets, no Trello call — safe to hit anytime.
export const dynamic = "force-dynamic";

export async function GET() {
  const [lastSync, trend] = await Promise.all([
    readLastSync().catch(() => null),
    readTrend().catch(() => []),
  ]);
  return Response.json({
    store: storeMode(),
    lastSync,
    trendDays: trend.length,
  });
}
