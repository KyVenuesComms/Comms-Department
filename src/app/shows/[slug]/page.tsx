import { CalendarDays, CircleCheck, Hourglass, Megaphone, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Countdown } from "@/features/shows/Countdown";
import { fmtDate } from "@/features/board/format";
import { STAGE_META, LIVE_STAGES } from "@/features/board/stages";
import { lastCallStatus, matchShow, showBySlug } from "@/lib/queue/shows";
import { getShows } from "@/lib/queue/shows-store";
import type { Project } from "@/lib/queue/types";
import { getQueueSnapshot } from "@/lib/trello/snapshot";

export const dynamic = "force-dynamic";

const CARD = "rounded-2xl border bg-white p-4 sm:p-5";
const CARD_STYLE = { borderColor: "#E4E4DF" } as const;
const K = "text-[11px] font-bold uppercase tracking-[0.09em]";

export default async function ShowPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shows = await getShows();
  const show = showBySlug(slug, shows);
  if (!show) notFound();

  let snapshot = null;
  try {
    snapshot = await getQueueSnapshot();
  } catch {
    snapshot = null;
  }

  const startIso = `${show.start}T00:00:00-04:00`;
  const endIso = `${show.end}T23:59:59-04:00`;
  const startMs = new Date(startIso).getTime();

  // Last call for work orders — use real wall-clock so it stays correct even if
  // Trello is unreachable (the countdown deadline shouldn't drift with the cache).
  // eslint-disable-next-line react-hooks/purity
  const lastCall = lastCallStatus(show, Date.now());

  const byStage: Record<string, Project[]> = { requested: [], "in-progress": [], "out-for-approval": [] };
  let closedCount = 0;
  if (snapshot) {
    for (const p of [...snapshot.requested, ...snapshot.inProgress, ...snapshot.outForApproval]) {
      if (p.show === slug) byStage[p.status]?.push(p);
    }
    closedCount = snapshot.closed.filter((p) => p.show === slug).length;
  }
  const active = [...byStage.requested, ...byStage["in-progress"], ...byStage["out-for-approval"]];
  const total = active.length + closedCount;
  const readiness = total > 0 ? Math.round((closedCount / total) * 100) : 0;

  // Risk: active show work due on/after doors open, or already overdue.
  // "Now" = snapshot time — pure for render, fresh within the refresh window.
  const nowMs = snapshot ? new Date(snapshot.updatedAt).getTime() : 0;
  const dueAfterDoors = active.filter((p) => p.dueAt && !p.dueComplete && new Date(p.dueAt).getTime() >= startMs).length;
  const overdue = active.filter((p) => p.dueAt && !p.dueComplete && new Date(p.dueAt).getTime() < nowMs).length;

  // Oldest still-open show items.
  const oldest = [...active]
    .map((p) => ({
      name: p.name,
      stage: STAGE_META[p.status as (typeof LIVE_STAGES)[number]].label,
      days: Math.floor((nowMs - new Date(p.enteredStageAt ?? p.createdAt).getTime()) / 86_400_000),
    }))
    .sort((a, b) => b.days - a.days)
    .slice(0, 5);

  // Recently shipped for this show (matched by name).
  const shipped = (snapshot?.metrics.recentlyCompleted ?? []).filter((r) => matchShow(r.name, undefined, shows) === slug).slice(0, 6);

  return (
    <div className="min-h-screen px-4 py-8 sm:px-8" style={{ background: "#E7E7E2" }}>
      <div className="mx-auto flex max-w-[900px] flex-col gap-3">
        <header>
          <div className={K} style={{ color: "#2563EB" }}>
            <Link href="/" className="no-underline" style={{ color: "#2563EB" }}>Kentucky Venues Work Order Status</Link> · show page
          </div>
          <h1 className="mt-1 text-[30px] font-extrabold tracking-[-0.015em]" style={{ color: "#131311" }}>{show.name}</h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-[14px]" style={{ color: "#6A6A63" }}>
            <CalendarDays size={15} aria-hidden="true" /> {show.tagline ?? `${show.start} – ${show.end}`}
          </p>
        </header>

        <div className={CARD} style={CARD_STYLE}>
          <Countdown startIso={startIso} endIso={endIso} />
        </div>

        {lastCall && (
          <div
            className={CARD}
            style={{
              ...CARD_STYLE,
              background: lastCall.state === "open" ? "#FBF1DC" : "#F4E4E4",
              borderColor: lastCall.state === "open" ? "#E7C77A" : "#E3B9B9",
            }}
          >
            <div className="flex items-start gap-3">
              <Megaphone
                size={18}
                aria-hidden="true"
                style={{ color: lastCall.state === "open" ? "#B4670C" : "#B23A3A", marginTop: 2 }}
              />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.09em]" style={{ color: lastCall.state === "open" ? "#B4670C" : "#B23A3A" }}>
                  Last call for work orders
                </p>
                {lastCall.state === "open" ? (
                  <p className="mt-1 text-[15px] leading-snug" style={{ color: "#3A3A34" }}>
                    <b>{lastCall.days} {lastCall.days === 1 ? "day" : "days"} left</b> to submit — deadline{" "}
                    <b>{fmtDate(`${lastCall.date}T00:00:00-04:00`)}</b>. After that, new requests aren&rsquo;t guaranteed for this show.
                  </p>
                ) : (
                  <p className="mt-1 text-[15px] leading-snug" style={{ color: "#3A3A34" }}>
                    Last call was <b>{fmtDate(`${lastCall.date}T00:00:00-04:00`)}</b> ({lastCall.days} {lastCall.days === 1 ? "day" : "days"} ago). New requests
                    aren&rsquo;t guaranteed for this show — the team is finishing what&rsquo;s already in the queue.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {!snapshot ? (
          <div className={CARD} style={CARD_STYLE}>
            <p style={{ color: "#6A6A63" }}>Can&rsquo;t reach Trello right now — work stats will reappear shortly.</p>
          </div>
        ) : (
          <>
            {/* readiness */}
            <div className={CARD} style={CARD_STYLE}>
              <div className="flex items-baseline justify-between">
                <p className={K} style={{ color: "#8A8A82" }}>Creative readiness</p>
                <p className="text-[13px] tabular-nums" style={{ color: "#6A6A63" }}>
                  <b style={{ color: "#12833B" }}>{closedCount}</b> done · <b style={{ color: "#131311" }}>{active.length}</b> in flight · {total} total
                </p>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-3.5 flex-1 overflow-hidden rounded-full" style={{ background: "#EDEDE8" }}>
                  <div className="h-full rounded-full" style={{ width: `${readiness}%`, background: "#17A34A" }} />
                </div>
                <span className="text-[22px] font-extrabold tabular-nums" style={{ color: "#12833B" }}>{readiness}%</span>
              </div>
            </div>

            {/* stage + risk row */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={CARD} style={CARD_STYLE}>
                <p className={`${K} mb-3`} style={{ color: "#8A8A82" }}>Where the open work sits</p>
                <div className="flex flex-col gap-2">
                  {LIVE_STAGES.map((key) => {
                    const m = STAGE_META[key];
                    const n = byStage[key].length;
                    const max = Math.max(1, ...LIVE_STAGES.map((k) => byStage[k].length));
                    return (
                      <div key={key} className="flex items-center gap-3 text-[13px]">
                        <span className="w-32" style={{ color: "#3A3A34" }}>{m.label}</span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: "#EDEDE8" }}>
                          <div className="h-full rounded-full" style={{ width: `${(n / max) * 100}%`, background: m.accent }} />
                        </div>
                        <span className="w-8 text-right font-bold tabular-nums" style={{ color: "#131311" }}>{n}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className={CARD} style={{ ...CARD_STYLE, background: overdue + dueAfterDoors > 0 ? "#FBF1DC" : "#fff" }}>
                <p className={`${K} mb-2 flex items-center gap-1.5`} style={{ color: overdue + dueAfterDoors > 0 ? "#B4670C" : "#8A8A82" }}>
                  <TriangleAlert size={13} aria-hidden="true" /> Deadline risk
                </p>
                <p className="text-[14px] leading-relaxed" style={{ color: "#3A3A34" }}>
                  <b className="text-[22px] tabular-nums" style={{ color: overdue > 0 ? "#DB3B3B" : "#12833B" }}>{overdue}</b> overdue now ·{" "}
                  <b className="text-[22px] tabular-nums" style={{ color: dueAfterDoors > 0 ? "#B4670C" : "#12833B" }}>{dueAfterDoors}</b> due on/after doors open
                </p>
                <p className="mt-1 text-[12px]" style={{ color: "#8A8A82" }}>anything due after {fmtDate(startIso)} lands mid-show</p>
              </div>
            </div>

            {/* oldest open + recently shipped */}
            <div className="grid gap-3 md:grid-cols-2">
              {oldest.length > 0 && (
                <div className={CARD} style={CARD_STYLE}>
                  <p className={`${K} mb-2.5 flex items-center gap-1.5`} style={{ color: "#8A8A82" }}>
                    <Hourglass size={13} aria-hidden="true" /> Longest-open show work
                  </p>
                  <div className="flex flex-col">
                    {oldest.map((it, i) => (
                      <div key={`${it.name}-${i}`} className="flex items-center gap-2 py-1.5 text-[13px]" style={i > 0 ? { borderTop: "1px solid #EDEDE8" } : undefined}>
                        <span className="flex-1 truncate font-semibold" style={{ color: "#131311" }}>{it.name}</span>
                        <span className="w-24 text-[11.5px]" style={{ color: "#8A8A82" }}>{it.stage}</span>
                        <span className="w-10 text-right font-bold tabular-nums" style={{ color: it.days > 30 ? "#DB3B3B" : "#B4670C" }}>{it.days}d</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {shipped.length > 0 && (
                <div className={CARD} style={CARD_STYLE}>
                  <p className={`${K} mb-2.5 flex items-center gap-1.5`} style={{ color: "#12833B" }}>
                    <CircleCheck size={13} aria-hidden="true" /> Recently shipped for the show
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {shipped.map((r) => (
                      <div key={r.id} className="flex items-baseline justify-between gap-2 text-[13px]">
                        <span className="truncate" style={{ color: "#3A3A34" }}>{r.name}</span>
                        <span className="flex-none text-[11.5px]" style={{ color: "#A0A099" }}>{fmtDate(r.at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <p className="text-center text-[12px]" style={{ color: "#A0A099" }}>
              Auto-matched from Trello ({total} work orders tagged to this show) · <Link href="/" style={{ color: "#2563EB" }}>full board</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
