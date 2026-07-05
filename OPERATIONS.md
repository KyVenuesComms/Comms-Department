# Operations — Work Order Status

## How data flows
- A **Vercel Cron** hits `/api/cron/refresh` every 15 minutes.
- That rebuilds the snapshot from Trello, writes it to **Vercel KV**, and banks
  one **daily trend point** (used for the "busier than usual" read).
- **Visitors read the stored snapshot** — they never call Trello. So load stays
  instant and Trello usage doesn't grow with traffic.
- If KV isn't connected, everything still works: the page builds the snapshot
  in-memory on demand (throttled), just without cross-instance caching or trend
  history.

## Rate limits (why 15 min is safe)
- One refresh makes ~5 Trello calls (lists + cards + move history).
- 96 runs/day ≈ **~480 Trello calls/day total**; visitor loads add **zero**.
- Trello's limit is ~300 requests per **10 seconds** — we use a tiny fraction of
  a percent. Huge headroom.

## Monitoring
- **`/api/status`** (public, no secrets, no Trello call) returns:
  - `store`: `"kv"` (connected) or `"memory"` (fallback)
  - `lastSync`: `{ at, ok, ms, counts }` from the most recent refresh
  - `trendDays`: how many daily points are banked
- Server logs: each refresh prints a `[queue] refresh ok …` (or `failed`) line —
  visible in Vercel's function/cron logs.
- If Trello ever rate-limits (429), the refresh fails and `lastSync.ok` is
  `false` — the last good snapshot keeps serving.

## Changing the cadence
Edit the schedule in `vercel.json` (`crons[0].schedule`, standard cron syntax)
and redeploy. Examples: `*/15 * * * *` (15 min), `*/30 * * * *` (30 min),
`0 * * * *` (hourly). Requires a Vercel plan that allows the chosen frequency
(Pro allows sub-daily crons).

## Environment variables (Vercel project settings)
- `TRELLO_API_KEY`, `TRELLO_TOKEN`, `TRELLO_BOARD_ID` — the board read.
- KV connection vars — added automatically when the KV store is connected to the
  project (either `KV_REST_API_URL`/`KV_REST_API_TOKEN` or the `UPSTASH_…`
  equivalents; the store reads whichever is present).
- `CRON_SECRET` *(optional)* — if set, the cron route requires
  `Authorization: Bearer <CRON_SECRET>`. Vercel Cron sends this automatically.
