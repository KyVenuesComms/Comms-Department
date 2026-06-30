@AGENTS.md

# House Rules for Work Order Status

A read-only webpage that shows the creative team's project queue to internal
departments — a "where's my request" tracker plus a workload-transparency board.
It reads the team's Trello board ("Creative Tasks") and never writes back.

You're the engineer. Ian is the product manager. Follow these on every change.

## How to work
- Think first: before non-trivial code, say what you'll build and ask about anything unclear. Don't guess.
- Keep it simple: build the simplest thing that solves the problem. No extra features, no "just in case" code.
- Change only what's asked: don't rewrite or "improve" unrelated code. If you spot something, mention it, don't do it.
- Aim at a finish line: work to a clear, checkable "done," then show how each item checks out.
- Checkpoints: at the end of each build phase, STOP and explain in plain language before moving on.

## How to write code
- Don't repeat yourself: one home for each piece of logic. The list→status / label→family mapping lives in ONE config.
- Same name everywhere: a queue stage is a "status" (`requested` / `in-progress` / `closed`); the label groups are "families" (`department` / `flag` / `type`).
- Handle the sad path: every failure shows a friendly message and a way out. The screen NEVER goes blank — fall back to the cached last-good snapshot with a "last updated" note.
- Leave a trail: log important actions (each Trello sync: cards fetched, mapped, any error).
- Keep layers apart: the screen (`src/app`, `src/components`), feature logic (`src/features`), shared logic + data (`src/lib`) stay separate.
- Self-contained features: each feature in its own folder under `src/features`.
- Read-only to Trello: the app never creates, moves, or edits cards.

## Key facts (single source of truth)
- Trello board: "Creative Tasks", id `5c781bbfe5ada150f318a677`. Read via Trello REST API.
- Status mapping: Requested ← Work Order Queue · 2026 KSF & WCHS · KSF Merch Store · Jansen Story · Outsourced · Up Next. In Progress ← In Progress · Department Review. Closed (search only) ← Closed Jobs. Hidden ← Sent to Printer · GPS Ownership · On Hold · any unrecognized list (hide by default — never leak internal lists).
- Label families: department (V1: Expositions; unmatched = "All Departments"); flags (High-Priority, Submitted Past Deadline, Waiting for Info); type (Print, Signage, Digital).
- Sort: High-Priority floats up · Waiting-for-Info sinks · Print/Signage before Digital · Submitted-Past-Deadline is neutral (never reorders).
- Refresh: ~10 minutes. Lives in ONE config value. Never poll Trello every few seconds (cost + rate-limit trap).
- Access: no password in V1 (open page). Secrets (Trello key + token) live in `.env` / Vercel env vars, server-side only, NEVER in code or shipped to the browser. The board id is not a secret.
- Accessibility: flags/statuses always show text + icon, never color alone.

## Tech stack
Next.js 16 (App Router, TypeScript) · React 19 · Tailwind v4 ·
Vercel (host + cron, corporate account) · Trello REST API (read-only).

## Definition of done (every change clears all of these)
- It works and didn't break anything that worked before.
- Build, linter, and formatter are green.
- Any test fails on the old code and passes on the new (fail-first), especially for the mapping and sort logic.
- It touched only what the task needed.
- It matches the project's names and patterns.

Working is the floor, not the bar.
