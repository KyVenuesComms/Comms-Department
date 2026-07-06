"use client";

import {
  BellRing,
  CalendarClock,
  ChevronDown,
  Download,
  Hourglass,
  Lock,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TARGETS } from "@/lib/queue/config";
import type { CockpitData, QueueMetrics, TrendPoint } from "@/lib/queue/types";

const UI_REFRESH_MS = 5 * 60 * 1000;
const TICK_MS = 30 * 1000;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STAGE_FILL: Record<string, string> = {
  "In Queue": "#2563EB",
  "In Progress": "#E07C0E",
  "Out for Approval": "#17A34A",
};

function agoLabel(iso: string, now: number): string {
  const min = Math.floor(Math.max(0, now - new Date(iso).getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  return `${Math.floor(min / 60)} hr ago`;
}

const CARD = "rounded-2xl border bg-white p-4 sm:p-5";
const CARD_STYLE = { borderColor: "#E4E4DF" } as const;
const K = "text-[11px] font-bold uppercase tracking-[0.09em]";
const ORANGE = "#E07C0E";

/** Abbreviated weekday for a due date, Eastern time ("Wed."). */
function dueWeekday(iso: string): string {
  return `${new Date(iso).toLocaleDateString("en-US", { weekday: "short", timeZone: "America/New_York" })}.`;
}

/** Due-date cell: orange "3d · Wed." when upcoming, red "5d over" when overdue. */
function DueCell({ dueAt, nowMs }: { dueAt: string | null; nowMs: number }) {
  if (!dueAt) return <span className="w-20" />;
  const diff = Math.ceil((new Date(dueAt).getTime() - nowMs) / 86_400_000);
  if (diff < 0) {
    return (
      <span className="w-20 text-right text-[12px] font-bold tabular-nums" style={{ color: "#DB3B3B" }}>
        {-diff}d over
      </span>
    );
  }
  return (
    <span className="w-20 text-right text-[12px] font-bold tabular-nums" style={{ color: ORANGE }}>
      {diff === 0 ? "today" : `${diff}d`} · {dueWeekday(dueAt)}
    </span>
  );
}

/** Red/amber/green context vs a target. */
function ragColor(value: number, target: number): string {
  if (value <= target) return "#12833B";
  if (value <= target * 1.25) return "#B4670C";
  return "#DB3B3B";
}

/** Shopify-style vs-last-week delta chip. */
function Delta({ now, prev }: { now: number; prev: number }) {
  if (prev === 0) return null;
  const pct = Math.round(((now - prev) / prev) * 100);
  if (pct === 0) return <span className="text-[11.5px] font-semibold" style={{ color: "#A0A099" }}>= last wk</span>;
  const up = pct > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-0.5 text-[11.5px] font-semibold" style={{ color: up ? "#B4670C" : "#12833B" }}>
      <Icon size={12} aria-hidden="true" />
      {up ? "+" : ""}{pct}% vs last wk ({prev})
    </span>
  );
}

function Bar({ label, value, max, sub, color }: { label: string; value: number; max: number; sub?: string; color: string }) {
  return (
    <div className="flex items-center gap-3 text-[13px]">
      <span className="flex-1 truncate" style={{ color: "#3A3A34" }}>{label}</span>
      <div className="h-2 flex-[1.4] overflow-hidden rounded-full" style={{ background: "#EDEDE8" }}>
        <span className="block h-full rounded-full" style={{ width: `${max > 0 ? Math.round((value / max) * 100) : 0}%`, background: color }} />
      </div>
      <span className="w-8 text-right font-bold tabular-nums" style={{ color: "#131311" }}>{value}</span>
      {sub !== undefined && <span className="w-9 text-[12px]" style={{ color: "#B4670C" }}>{sub}</span>}
    </div>
  );
}

/** Unified weekly flow: intake vs shipped per week; click a week for detail. */
function WeeklyFlow({
  intake,
  shipped,
  prevIntake,
  prevShipped,
}: {
  intake: number[];
  shipped: number[];
  prevIntake: number;
  prevShipped: number;
}) {
  const weeks = intake.length;
  const [sel, setSel] = useState(weeks - 1);
  const max = Math.max(1, ...intake, ...shipped);
  const label = (i: number) => (i === weeks - 1 ? "this wk" : `${weeks - 1 - i}w ago`);
  const net = intake[sel] - shipped[sel];
  const isThisWeek = sel === weeks - 1;
  return (
    <div>
      <div className="flex items-end gap-2" style={{ height: 64 }}>
        {intake.map((inN, i) => {
          const outN = shipped[i];
          const active = i === sel;
          return (
            <button
              key={i}
              onClick={() => setSel(i)}
              className="flex h-full flex-1 items-end justify-center gap-[3px] rounded-md px-0.5 pb-0.5"
              style={{ background: active ? "#F1F1EC" : "transparent" }}
              aria-label={`${label(i)}: ${inN} in, ${outN} out`}
              title={`${label(i)}: ${inN} in · ${outN} out · net ${inN - outN >= 0 ? "+" : ""}${inN - outN}`}
            >
              <span className="w-1/2 rounded-t-[3px]" style={{ height: `${Math.max(4, (inN / max) * 100)}%`, background: "#2563EB", opacity: active ? 1 : 0.55 }} />
              <span className="w-1/2 rounded-t-[3px]" style={{ height: `${Math.max(4, (outN / max) * 100)}%`, background: "#17A34A", opacity: active ? 1 : 0.55 }} />
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex gap-2">
        {intake.map((_, i) => (
          <span key={i} className="flex-1 text-center text-[9.5px]" style={{ color: i === sel ? "#3A3A34" : "#A0A099" }}>{label(i)}</span>
        ))}
      </div>
      <p className="mt-2 text-[12.5px]" style={{ color: "#3A3A34" }}>
        <b style={{ color: "#131311" }}>{isThisWeek ? "This week" : label(sel)}</b>:{" "}
        <b style={{ color: "#1D5FCB" }}>+{intake[sel]} in</b> ·{" "}
        <b style={{ color: "#12833B" }}>−{shipped[sel]} out</b> ·{" "}
        <b style={{ color: net > 0 ? "#B4670C" : "#12833B" }}>
          net {net >= 0 ? "+" : ""}{net}
          {isThisWeek && (net > 0 ? " · backlog growing" : " · holding/shrinking")}
        </b>
      </p>
      {isThisWeek && (
        <div className="mt-1 flex gap-3">
          <span className="inline-flex items-center gap-1 text-[11.5px]" style={{ color: "#8A8A82" }}>
            in: <Delta now={intake[sel]} prev={prevIntake} />
          </span>
          <span className="inline-flex items-center gap-1 text-[11.5px]" style={{ color: "#8A8A82" }}>
            out: <Delta now={shipped[sel]} prev={prevShipped} />
          </span>
        </div>
      )}
    </div>
  );
}

/** Per-stage rows for the backlog hero: count, trend, and ~days per stage. */
function StageRows({
  trend,
  stageTime,
  counts,
}: {
  trend: TrendPoint[];
  stageTime: CockpitData["stageTime"];
  counts: Record<string, number>;
}) {
  const avgDays = new Map(stageTime.map((s) => [s.stage, s.avgDays]));
  // A 2-day "trend" is a flat line and a zero — wait for a week of history
  // before showing sparklines/deltas, so they carry an actual shape.
  const MIN_SPARK_DAYS = 7;
  const series = (pick: (t: TrendPoint) => number, label: string) =>
    trend.length >= MIN_SPARK_DAYS ? trend.map(pick) : [counts[label] ?? 0];
  const rows: { label: string; color: string; values: number[] }[] = [
    { label: "In Queue", color: STAGE_FILL["In Queue"], values: series((t) => t.requested, "In Queue") },
    { label: "In Progress", color: STAGE_FILL["In Progress"], values: series((t) => t.inProgress, "In Progress") },
    { label: "Out for Approval", color: STAGE_FILL["Out for Approval"], values: series((t) => t.outForApproval, "Out for Approval") },
  ];
  const hasTrend = trend.length >= MIN_SPARK_DAYS;
  const W = 84;
  const H = 22;
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => {
        const first = r.values[0];
        const last = counts[r.label] ?? r.values[r.values.length - 1];
        const delta = last - first;
        const min = Math.min(...r.values);
        const span = Math.max(1, Math.max(...r.values) - min);
        const pts = hasTrend
          ? r.values.map((v, i) => `${(i / (r.values.length - 1)) * W},${H - ((v - min) / span) * (H - 4) - 2}`).join(" ")
          : "";
        const days = avgDays.get(r.label);
        return (
          <div key={r.label} className="flex items-center justify-end gap-2.5 text-[12.5px]">
            <span className="flex items-center gap-1.5" style={{ color: "#3A3A34" }}>
              <span className="h-2 w-2 rounded-[3px]" style={{ background: r.color }} aria-hidden="true" />
              {r.label}
            </span>
            {hasTrend && (
              <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="flex-none" aria-hidden="true">
                <polyline points={pts} fill="none" stroke={r.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <b className="w-8 text-right text-[15px] tabular-nums" style={{ color: "#131311" }}>{last}</b>
            {hasTrend && (
              <span className="w-9 text-[11.5px] font-bold tabular-nums" style={{ color: delta > 0 ? "#B4670C" : delta < 0 ? "#12833B" : "#A0A099" }}>
                {delta > 0 ? "+" : ""}{delta}
              </span>
            )}
            <span className="w-14 text-[11.5px]" style={{ color: "#8A8A82" }}>{days !== undefined ? `~${Math.round(days)}d each` : ""}</span>
          </div>
        );
      })}
      <p className="text-right text-[10.5px]" style={{ color: "#A0A099" }}>
        {hasTrend ? `trend since ${trend[0].date} · ` : ""}~days = typical time in that stage
      </p>
    </div>
  );
}

export function Cockpit({
  cockpit,
  turnaround,
  trend,
  updatedAt,
  stale,
}: {
  cockpit: CockpitData;
  turnaround: QueueMetrics["turnaround"];
  trend: TrendPoint[];
  updatedAt: string;
  stale: boolean;
}) {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date(updatedAt).getTime());
  const [showAllDue, setShowAllDue] = useState(false);
  const [showAllAged, setShowAllAged] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), TICK_MS);
    const r = setInterval(() => router.refresh(), UI_REFRESH_MS);
    return () => { clearInterval(t); clearInterval(r); };
  }, [router]);

  const active = cockpit.byDepartment.reduce((s, d) => s + d.active, 0);
  const depts = cockpit.byDepartment.slice(0, 8);
  const deptMax = depts[0]?.active ?? 1;
  const team = cockpit.byAssignee.filter((a) => a.name !== "Unassigned").slice(0, 8);
  const teamMax = team[0]?.active ?? 1;
  const mixTotal = cockpit.workMix.Print + cockpit.workMix.Signage + cockpit.workMix.Digital;
  const pct = (n: number) => (mixTotal > 0 ? Math.round((n / mixTotal) * 100) : 0);
  const turnWeeks = turnaround ? `≈ ${Math.round(turnaround.quotedDays / 7)} wks` : "—";
  const dueShown = showAllDue ? cockpit.dueSoon : cockpit.dueSoon.slice(0, 5);
  const agedShown = showAllAged ? cockpit.agedItems : cockpit.agedItems.slice(0, 5);

  return (
    <div className="min-h-screen px-4 py-8 sm:px-8" style={{ background: "#E7E7E2" }}>
      <div className="mx-auto flex max-w-[1100px] flex-col gap-3">
        {/* header */}
        <div className="flex items-end justify-between">
          <div>
            <div className={K} style={{ color: "#2563EB" }}>Creative operations · leadership</div>
            <h1 className="mt-1 text-[26px] font-extrabold tracking-[-0.015em]" style={{ color: "#131311" }}>The cockpit</h1>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/api/manager/export"
              className="inline-flex items-center gap-1.5 rounded-[9px] border bg-white px-3 py-1.5 text-[12.5px] font-bold no-underline transition-colors hover:bg-[#F1F1EC]"
              style={{ borderColor: "#E4E4DE", color: "#3A3A34" }}
            >
              <Download size={13} aria-hidden="true" /> Export CSV
            </a>
            <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "#A0A099" }}>
              <Lock size={12} aria-hidden="true" /> private ·
              <RefreshCw size={12} aria-hidden="true" />
              {stale ? "last good data" : `updated ${agoLabel(updatedAt, now)}`}
            </div>
          </div>
        </div>

        {/* leverage */}
        <div className={CARD} style={{ ...CARD_STYLE, background: "#131311" }}>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.09em]" style={{ color: "#F5C86B" }}>
            <Zap size={14} aria-hidden="true" /> Highest-leverage move
          </div>
          <p className="mt-1.5 text-[16px] font-semibold text-white">{cockpit.leverage}</p>
        </div>

        {/* alerts (now includes the bottleneck when one exists) */}
        {cockpit.alerts.length > 0 && (
          <div className={CARD} style={{ ...CARD_STYLE, background: "#FBEAEA" }}>
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.09em]" style={{ color: "#A32D2D" }}>
              <BellRing size={13} aria-hidden="true" /> Alerts — needs a look
            </div>
            <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5 text-[13.5px]" style={{ color: "#791F1F" }}>
              {cockpit.alerts.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        )}

        {/* hero: backlog + per-stage breakdown */}
        <div className={CARD} style={CARD_STYLE}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className={K} style={{ color: "#8A8A82" }}>Active backlog</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[40px] font-extrabold leading-none tabular-nums" style={{ color: "#131311" }}>{active}</span>
                <span className="text-[14px]" style={{ color: "#6A6A63" }}>active projects</span>
              </div>
            </div>
            <StageRows
              trend={trend}
              stageTime={cockpit.stageTime}
              counts={Object.fromEntries(
                cockpit.agingBuckets.map((s) => [s.stage, s.buckets[0] + s.buckets[1] + s.buckets[2] + s.buckets[3]]),
              )}
            />
          </div>
        </div>

        {/* core row: overdue, turnaround, weekly flow */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className={CARD} style={CARD_STYLE}>
            <p className={K} style={{ color: "#8A8A82" }}>Overdue</p>
            <div className="text-[30px] font-extrabold tabular-nums" style={{ color: ragColor(cockpit.overdue, TARGETS.overdue) }}>{cockpit.overdue}</div>
            <p className="text-[12px]" style={{ color: "#6A6A63" }}>target &lt;{TARGETS.overdue} · {cockpit.dueThisWeek} due this wk</p>
          </div>
          <div className={CARD} style={CARD_STYLE}>
            <p className={K} style={{ color: "#8A8A82" }}>Turnaround</p>
            <div className="text-[30px] font-extrabold" style={{ color: turnaround ? ragColor(turnaround.quotedDays, TARGETS.turnaroundDays) : "#1D5FCB" }}>{turnWeeks}</div>
            <p className="text-[12px]" style={{ color: "#6A6A63" }}>target ≤{Math.round(TARGETS.turnaroundDays / 7)} wks · request → approval</p>
          </div>
          <div className={`${CARD} lg:col-span-2`} style={CARD_STYLE}>
            <p className={`${K} mb-1`} style={{ color: "#8A8A82" }}>
              Weekly flow — <span style={{ color: "#2563EB" }}>in</span> vs <span style={{ color: "#12833B" }}>out</span> <span style={{ color: "#A0A099" }}>(click a week)</span>
            </p>
            <WeeklyFlow
              intake={cockpit.intakePerWeek}
              shipped={cockpit.shippedPerWeek}
              prevIntake={cockpit.netFlow.prevIntakeWeek}
              prevShipped={cockpit.netFlow.prevShippedWeek}
            />
          </div>
        </div>

        {/* needs attention: due soon + longest in stage */}
        <div className={CARD} style={CARD_STYLE}>
          <p className={`${K} mb-2.5 flex items-center gap-1.5`} style={{ color: "#8A8A82" }}>
            <CalendarClock size={13} aria-hidden="true" /> Due in the next 10 days ({cockpit.dueSoon.length})
          </p>
          {cockpit.dueSoon.length === 0 ? (
            <p className="text-[13px]" style={{ color: "#A0A099" }}>Nothing due in the next 10 days.</p>
          ) : (
            <div className="flex flex-col">
              {dueShown.map((it, i) => (
                <div key={`${it.name}-${i}`} className="flex items-center gap-3 py-2 text-[13px]" style={i > 0 ? { borderTop: "1px solid #EDEDE8" } : undefined}>
                  <span className="flex-1 truncate font-semibold" style={{ color: "#131311" }}>{it.name}</span>
                  <span className="hidden w-24 truncate text-[12px] sm:block" style={{ color: "#6E56CF" }}>{it.assignee ?? "—"}</span>
                  <span className="hidden w-36 truncate text-[12px] lg:block" style={{ color: "#8A8A82" }}>{it.department}</span>
                  <span className="hidden w-28 text-[12px] sm:block" style={{ color: "#6A6A63" }}>{it.stage}</span>
                  <DueCell dueAt={it.dueAt} nowMs={now} />
                </div>
              ))}
            </div>
          )}
          {cockpit.dueSoon.length > 5 && (
            <button onClick={() => setShowAllDue((v) => !v)} className="mt-2 flex items-center gap-1 text-[12.5px] font-bold" style={{ color: "#2563EB" }}>
              <ChevronDown size={13} style={{ transform: showAllDue ? "rotate(180deg)" : "none" }} aria-hidden="true" />
              {showAllDue ? "Show fewer" : `Show all ${cockpit.dueSoon.length}`}
            </button>
          )}

          <div className="my-3 h-px" style={{ background: "#EDEDE8" }} />

          <p className={`${K} mb-2.5 flex items-center gap-1.5`} style={{ color: "#8A8A82" }}>
            <Hourglass size={13} aria-hidden="true" /> Longest in current stage
          </p>
          <div className="flex flex-col">
            {agedShown.map((it, i) => (
              <div key={`${it.name}-${i}`} className="flex items-center gap-3 py-2 text-[13px]" style={i > 0 ? { borderTop: "1px solid #EDEDE8" } : undefined}>
                <span className="flex-1 truncate font-semibold" style={{ color: "#131311" }}>{it.name}</span>
                <span className="hidden w-24 truncate text-[12px] sm:block" style={{ color: "#6E56CF" }}>{it.assignee ?? "—"}</span>
                <span className="hidden w-36 truncate text-[12px] lg:block" style={{ color: "#8A8A82" }}>{it.department}</span>
                <span className="hidden w-28 text-[12px] sm:block" style={{ color: "#6A6A63" }}>{it.stage}</span>
                <DueCell dueAt={it.dueAt} nowMs={now} />
                <span className="w-14 text-right font-bold tabular-nums" style={{ color: it.days > 30 ? "#DB3B3B" : "#B4670C" }}>{it.days}d</span>
              </div>
            ))}
          </div>
          {cockpit.agedItems.length > 5 && (
            <button onClick={() => setShowAllAged((v) => !v)} className="mt-2 flex items-center gap-1 text-[12.5px] font-bold" style={{ color: "#2563EB" }}>
              <ChevronDown size={13} style={{ transform: showAllAged ? "rotate(180deg)" : "none" }} aria-hidden="true" />
              {showAllAged ? "Show fewer" : `Show all ${cockpit.agedItems.length}`}
            </button>
          )}
        </div>

        {/* by department + work mix */}
        <div className="grid gap-3 md:grid-cols-[1.6fr_1fr]">
          <div className={CARD} style={CARD_STYLE}>
            <p className={`${K} mb-3`} style={{ color: "#8A8A82" }}>By department — active <span style={{ color: "#B4670C" }}>(+ new this week)</span></p>
            <div className="flex flex-col gap-2.5">
              {depts.map((d) => (
                <Bar key={d.name} label={d.name} value={d.active} max={deptMax} sub={d.newThisWeek > 0 ? `+${d.newThisWeek}` : ""} color="#2563EB" />
              ))}
            </div>
            {cockpit.byDepartment.length > 8 && (
              <p className="mt-3 text-[12px]" style={{ color: "#A0A099" }}>+ {cockpit.byDepartment.length - 8} more</p>
            )}
          </div>
          <div className={CARD} style={CARD_STYLE}>
            <p className={`${K} mb-3`} style={{ color: "#8A8A82" }}>Work mix</p>
            <div className="flex h-3.5 overflow-hidden rounded-full">
              <div style={{ width: `${pct(cockpit.workMix.Print)}%`, background: "#2563EB" }} />
              <div style={{ width: `${pct(cockpit.workMix.Signage)}%`, background: "#E07C0E" }} />
              <div style={{ width: `${pct(cockpit.workMix.Digital)}%`, background: "#17A34A" }} />
            </div>
            <div className="mt-3 flex flex-col gap-1.5 text-[13px]" style={{ color: "#3A3A34" }}>
              <div><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] align-middle" style={{ background: "#2563EB" }} />Print {pct(cockpit.workMix.Print)}%</div>
              <div><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] align-middle" style={{ background: "#E07C0E" }} />Signage {pct(cockpit.workMix.Signage)}%</div>
              <div><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] align-middle" style={{ background: "#17A34A" }} />Digital {pct(cockpit.workMix.Digital)}%</div>
            </div>
          </div>
        </div>

        {/* team load + missing-info concentration */}
        <div className="grid gap-3 md:grid-cols-2">
          {team.length > 0 && (
            <div className={CARD} style={CARD_STYLE}>
              <p className={`${K} mb-3`} style={{ color: "#8A8A82" }}>Team load — active per person</p>
              <div className="flex flex-col gap-2.5">
                {team.map((a) => (
                  <Bar key={a.name} label={a.name} value={a.active} max={teamMax} color="#6E56CF" />
                ))}
              </div>
            </div>
          )}
          {cockpit.missingInfoByDept.length > 0 && (
            <div className={CARD} style={CARD_STYLE}>
              <p className={`${K} mb-3`} style={{ color: "#8A8A82" }}>Missing info — who we&rsquo;re waiting on</p>
              <div className="flex flex-col gap-2.5">
                {cockpit.missingInfoByDept.map((d) => (
                  <Bar key={d.name} label={d.name} value={d.waiting} max={cockpit.missingInfoByDept[0].waiting} sub={`/${d.active}`} color="#B4670C" />
                ))}
              </div>
              <p className="mt-2 text-[11px]" style={{ color: "#A0A099" }}>waiting / their active total — ammunition for the nudge</p>
            </div>
          )}
        </div>

        {/* view more stats (collapsed) */}
        <details className="rounded-2xl border bg-white" style={CARD_STYLE}>
          <summary className="flex cursor-pointer items-center gap-1.5 p-4 text-[13px] font-bold sm:p-5" style={{ color: "#3A3A34" }}>
            <ChevronDown size={14} aria-hidden="true" /> View more stats
          </summary>
          <div className="flex flex-col gap-3 px-4 pb-4 sm:px-5 sm:pb-5">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl p-3.5" style={{ background: "#F7F7F4" }}>
                <p className={K} style={{ color: "#8A8A82" }}>Waiting on info</p>
                <div className="text-[26px] font-extrabold tabular-nums" style={{ color: "#B4670C" }}>{cockpit.waitingForInfo}</div>
                <p className="text-[11.5px]" style={{ color: "#6A6A63" }}>blocked on requesters — not ours to control</p>
              </div>
              <div className="rounded-xl p-3.5" style={{ background: "#F7F7F4" }}>
                <p className={K} style={{ color: "#8A8A82" }}>Cycle time spread</p>
                {cockpit.cycleTime ? (
                  <>
                    <div className="text-[26px] font-extrabold tabular-nums" style={{ color: "#1D5FCB" }}>{cockpit.cycleTime.p85}d</div>
                    <p className="text-[11.5px]" style={{ color: "#6A6A63" }}>85% finish within · median {cockpit.cycleTime.p50}d (n={cockpit.cycleTime.sampleSize})</p>
                  </>
                ) : (
                  <p className="text-[12px]" style={{ color: "#A0A099" }}>Too few recent completions.</p>
                )}
              </div>
              <div className="rounded-xl p-3.5" style={{ background: "#F7F7F4" }}>
                <p className={K} style={{ color: "#8A8A82" }}>Rework</p>
                {cockpit.rework ? (
                  <>
                    <div className="text-[26px] font-extrabold tabular-nums" style={{ color: ragColor(cockpit.rework.pct, 15) }}>{cockpit.rework.pct}%</div>
                    <p className="text-[11.5px]" style={{ color: "#6A6A63" }}>{cockpit.rework.bounced} of {cockpit.rework.sample} proofs bounced back</p>
                  </>
                ) : (
                  <p className="text-[12px]" style={{ color: "#A0A099" }}>Too few proofs observed.</p>
                )}
              </div>
              <div className="rounded-xl p-3.5" style={{ background: "#F7F7F4" }}>
                <p className={K} style={{ color: "#8A8A82" }}>4-week outlook</p>
                <div className="text-[26px] font-extrabold tabular-nums" style={{ color: cockpit.forecast.weeklyNet > 0 ? "#B4670C" : "#12833B" }}>
                  {cockpit.forecast.seasonal?.inFourWeeks ?? cockpit.forecast.inFourWeeks}
                </div>
                <p className="text-[11.5px]" style={{ color: "#6A6A63" }}>
                  {cockpit.forecast.seasonal ? (
                    <>
                      seasonal ({cockpit.forecast.seasonal.years} yr):{" "}
                      <b style={{ color: cockpit.forecast.seasonal.pctChange > 0 ? "#B4670C" : "#12833B" }}>
                        {cockpit.forecast.seasonal.pctChange >= 0 ? "+" : ""}
                        {cockpit.forecast.seasonal.pctChange}% intake
                      </b>{" "}
                      → ~{cockpit.forecast.seasonal.expectedIntake} new · {cockpit.forecast.inFourWeeks} flat
                    </>
                  ) : (
                    <>at current pace ({cockpit.forecast.weeklyNet >= 0 ? "+" : ""}{cockpit.forecast.weeklyNet}/wk)</>
                  )}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl p-3.5" style={{ background: "#F7F7F4" }}>
                <p className={`${K} mb-2`} style={{ color: "#8A8A82" }}>Intake by weekday <span style={{ color: "#A0A099" }}>(last 8 wks)</span></p>
                <div className="flex items-end gap-1" style={{ height: 44 }}>
                  {cockpit.intakeByDay.map((n, i) => {
                    const max = Math.max(1, ...cockpit.intakeByDay);
                    return (
                      <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
                        <div className="w-full rounded-[3px]" style={{ height: `${Math.max(4, Math.round((n / max) * 36))}px`, background: "#2563EB", opacity: 0.5 + (n / max) * 0.5 }} title={`${WEEKDAYS[i]}: ${n}`} />
                        <span className="text-[9px]" style={{ color: "#A0A099" }}>{WEEKDAYS[i][0]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-xl p-3.5" style={{ background: "#F7F7F4" }}>
                <p className={`${K} mb-2`} style={{ color: "#8A8A82" }}>Aging — days in current stage <span style={{ color: "#A0A099" }}>(0–7 / 8–14 / 15–30 / 30+)</span></p>
                <div className="flex flex-col gap-2.5">
                  {cockpit.agingBuckets.map((s) => {
                    const total = Math.max(1, s.buckets[0] + s.buckets[1] + s.buckets[2] + s.buckets[3]);
                    const shades = [0.35, 0.55, 0.75, 1];
                    return (
                      <div key={s.stage}>
                        <div className="mb-1 flex justify-between text-[11.5px]">
                          <span style={{ color: "#3A3A34" }}>{s.stage}</span>
                          <span className="tabular-nums" style={{ color: "#8A8A82" }}>{s.buckets.join(" / ")}</span>
                        </div>
                        <div className="flex h-2.5 overflow-hidden rounded-full" style={{ background: "#EDEDE8" }}>
                          {s.buckets.map((n, i) => (
                            <div key={i} style={{ width: `${(n / total) * 100}%`, background: STAGE_FILL[s.stage], opacity: shades[i] }} title={`${n}`} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px]" style={{ color: "#A0A099" }}>
                  How to read: watch the darkest (30+) share — if it grows week over week, work is quietly rotting; the specific items are in the attention list above.
                </p>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
