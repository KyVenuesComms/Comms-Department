# Operations — Work Order Status

## How data flows
- Visitors read the snapshot from **Vercel KV**. When that stored copy is older
  than ~15 min (or missing), the next page load **rebuilds it from Trello and
  re-caches it** — so ordinary traffic keeps the board fresh, no frequent cron
  needed. This works on any Vercel plan.
- A **once-daily cron** (`/api/cron/refresh`) is a backstop: it guarantees at
  least one refresh per day and banks that day's **trend point** even if nobody
  visits (used for the "busier than usual" read). The cron can also be run
  manually by hitting the endpoint.
- If KV isn't connected, everything still works: the page builds the snapshot
  in-memory on demand (throttled), without cross-instance caching or trend
  history.

## Rate limits (why this is safe)
- One rebuild makes ~5 Trello calls (lists + cards + move history), and a rebuild
  only happens at most once per ~15 min (stale window), regardless of how many
  people are viewing.
- Worst case ≈ a few hundred Trello calls/day. Trello's limit is ~300 requests
  per **10 seconds** — a tiny fraction of a percent. Huge headroom.
- **Note:** the cron in `vercel.json` is once-daily because sub-daily crons need
  a paid Vercel plan. Intraday freshness comes from the lazy refresh above, so
  the daily cron is only a backstop. If you move to a plan with frequent crons
  and prefer cron-driven refresh, set e.g. `*/15 * * * *`.

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
