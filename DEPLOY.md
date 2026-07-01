# Deploying Work Order Status (Vercel)

The repo lives at **KyVenuesComms/Comms-Department** on GitHub. Importing it into
Vercel gives automatic re-deploys on every push to `main`.

## One-time setup (Vercel dashboard)

1. Go to **https://vercel.com/new** (signed into your work Vercel account).
2. **Import** the `KyVenuesComms/Comms-Department` repository.
   - Framework preset: **Next.js** (auto-detected). Root directory: **/** (default).
   - Leave build/output settings at their defaults.
3. Before clicking Deploy, open **Environment Variables** and add these three
   (same values as your local `.env.local` — copy them across):
   - `TRELLO_API_KEY`
   - `TRELLO_TOKEN`
   - `TRELLO_BOARD_ID` = `5c781bbfe5ada150f318a677`
   Add them for **Production** (and Preview, if you want preview builds to work).
4. Click **Deploy**. First build takes ~1–2 min.

## After it's live

- Every `git push` to `main` auto-deploys. No manual steps.
- If you ever rotate the Trello token, update it in **Project → Settings →
  Environment Variables**, then redeploy.
- No password/login gate (by design — it's an internal, read-only page).

## Notes / future

- The board reads Trello at request time and keeps a short in-memory cache.
  On Vercel's serverless runtime that cache doesn't persist across instances,
  so cold requests re-read Trello. At the team's traffic this is well within
  Trello's rate limits and costs nothing. If usage grows, move the "last good"
  snapshot to **Vercel KV** for a shared, durable cache (small change in
  `src/lib/trello/snapshot.ts`).
- No Vercel Cron is needed for V1 — the page refreshes itself on view.
