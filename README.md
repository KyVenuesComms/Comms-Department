# Work Order Status

A read-only webpage that shows the creative team's project queue to internal
departments — a "where's my request" tracker plus a workload-transparency board.
It reads the team's Trello board ("Creative Tasks") and never writes back.

See [CLAUDE.md](./CLAUDE.md) for the house rules and the full status/label mapping.

## Stack
Next.js 16 (App Router, TypeScript) · React 19 · Tailwind v4 · Vercel (host + cron) ·
Trello REST API (read-only).

## Local setup
```bash
npm install
cp .env.example .env.local   # then fill in your Trello API key + token
npm run dev                  # http://localhost:3000
```

## Folder layout (keep the layers apart)
- `src/app` — the screen (routes, pages)
- `src/components` — shared UI pieces
- `src/features` — self-contained feature logic (each in its own folder)
- `src/lib` — shared logic + data (Trello access, the status/label mapping config)

## Build phases
1. **Project setup** ← you are here
2. The mapping config (lists → status, labels → families) + fail-first test
3. Trello read + last-good snapshot (never-blank fallback)
4. The board UI (workload total, the two columns, sort rules)
5. Filters + prioritization explainer
6. Search Closed Jobs
7. Auto-refresh + "updated X ago"
8. Deploy to Vercel
