"use client";

import { AlertTriangle, BellRing, Download, Hourglass, Lock, RefreshCw, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TARGETS } from "@/lib/queue/config";
import type { CockpitData, QueueMetrics, TrendPoint } from "@/lib/queue/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STAGE_FILL: Record<string, string> = {
  "In Queue": "#2563EB",
  "In Progress": "#E07C0E",
  "Out for Approval": "#17A34A",
};

/** Red/amber/green context vs a target — "a number without context is meaningless." */
function ragColor(value: number, target: number): string {
  if (value <= target) return "#12833B";
  if (value <= target * 1.25) return "#B4670C";
  return "#DB3B3B";
}

/** Stacked cumulative-flow bands from the banked daily trend points. */
function Cfd({ trend }: { trend: TrendPoint[] }) {
  if (trend.length < 3) {
    return (
      <p className="text-[12.5px]" style={{ color: "#A0A099" }}>
        Collecting history — {trend.length} day{trend.length === 1 ? "" : "s"} banked. Bands appear at 3.
      </p>
    );
  }
  const W = 320;
  const H = 90;
  const max = Math.max(...trend.map((t) => t.active), 1);
  const x = (i: number) => (i / (trend.length - 1)) * W;
  const layers: ("outForApproval" | "inProgress" | "requested")[] = ["outForApproval", "inProgress", "requested"];
  const colors = { requested: "#2563EB", inProgress: "#E07C0E", outForApproval: "#17A34A" };
  let base = trend.map(() => 0);
  const paths = layers.map((key) => {
    const top = trend.map((t, i) => base[i] + t[key]);
    const d =
      `M0,${H - (base[0] / max) * H} ` +
      top.map((v, i) => `L${x(i)},${H - (v / max) * H}`).join(" ") +
      ` L${W},${H - (base[base.length - 1] / max) * H} ` +
      [...base].reverse().map((v, i) => `L${x(base.length - 1 - i)},${H - (v / max) * H}`).join(" ") +
      " Z";
    base = top;
    return { key, d, fill: colors[key] };
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Cumulative flow: stage bands over time">
      {paths.map((p) => (
        <path key={p.key} d={p.d} fill={p.fill} opacity={0.85} />
      ))}
    </svg>
  );
}

const UI_REFRESH_MS = 5 * 60 * 1000;
const TICK_MS = 30 * 1000;

function agoLabel(iso: string, now: number): string {
  const min = Math.floor(Math.max(0, now - new Date(iso).getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  return `${Math.floor(min / 60)} hr ago`;
}

const CARD = "rounded-2xl border bg-white p-4 sm:p-5";
const CARD_STYLE = { borderColor: "#E4E4DF" } as const;
const K = "text-[11px] font-bold uppercase tracking-[0.09em]";

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
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), TICK_MS);
    const r = setInterval(() => router.refresh(), UI_REFRESH_MS);
    return () => { clearInterval(t); clearInterval(r); };
  }, [router]);

  const active = cockpit.byDepartment.reduce((s, d) => s + d.active, 0);
  const { intakeWeek, shippedWeek, net } = cockpit.netFlow;
  const depts = cockpit.byDepartment.slice(0, 8);
  const deptMax = depts[0]?.active ?? 1;
  const team = cockpit.byAssignee.filter((a) => a.name !== "Unassigned").slice(0, 8);
  const teamMax = team[0]?.active ?? 1;
  const shipMax = Math.max(1, ...cockpit.shippedPerWeek);
  const mixTotal = cockpit.workMix.Print + cockpit.workMix.Signage + cockpit.workMix.Digital;
  const pct = (n: number) => (mixTotal > 0 ? Math.round((n / mixTotal) * 100) : 0);
  const turnWeeks = turnaround ? `≈ ${Math.round(turnaround.quotedDays / 7)} wks` : "—";

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

        {/* leverage — Grove's highest-leverage move */}
        <div className={CARD} style={{ ...CARD_STYLE, background: "#131311" }}>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.09em]" style={{ color: "#F5C86B" }}>
            <Zap size={14} aria-hidden="true" /> Highest-leverage move
          </div>
          <p className="mt-1.5 text-[16px] font-semibold text-white">{cockpit.leverage}</p>
        </div>

        {/* threshold alerts vs targets */}
        {cockpit.alerts.length > 0 && (
          <div className={CARD} style={{ ...CARD_STYLE, background: "#FBEAEA" }}>
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.09em]" style={{ color: "#A32D2D" }}>
              <BellRing size={13} aria-hidden="true" /> Alerts — outside target
            </div>
            <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5 text-[13.5px]" style={{ color: "#791F1F" }}>
              {cockpit.alerts.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        )}

        {/* hero: backlog & net flow */}
        <div className={CARD} style={CARD_STYLE}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className={K} style={{ color: "#8A8A82" }}>Active backlog</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[40px] font-extrabold leading-none tabular-nums" style={{ color: "#131311" }}>{active}</span>
                <span className="text-[14px]" style={{ color: "#6A6A63" }}>active projects</span>
              </div>
            </div>
            <div className="text-right text-[13.5px]" style={{ color: "#3A3A34" }}>
              <div>
                This week:{" "}
                <b style={{ color: "#1D5FCB" }}>+{intakeWeek} in</b> ·{" "}
                <b style={{ color: "#12833B" }}>−{shippedWeek} out</b> ·{" "}
                <b style={{ color: net > 0 ? "#B4670C" : "#12833B" }}>
                  net {net >= 0 ? "+" : ""}{net} {net > 0 ? "· backlog growing" : "· holding/shrinking"}
                </b>
              </div>
              <div className="mt-1 flex justify-end gap-3">
                <span className="inline-flex items-center gap-1 text-[11.5px]" style={{ color: "#8A8A82" }}>
                  in: <Delta now={intakeWeek} prev={cockpit.netFlow.prevIntakeWeek} />
                </span>
                <span className="inline-flex items-center gap-1 text-[11.5px]" style={{ color: "#8A8A82" }}>
                  out: <Delta now={shippedWeek} prev={cockpit.netFlow.prevShippedWeek} />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* bottleneck */}
        <div className={CARD} style={{ ...CARD_STYLE, background: cockpit.bottleneck ? "#FBF1DC" : "#fff" }}>
          <div className="flex items-center gap-2 text-[13.5px]">
            <AlertTriangle size={16} style={{ color: cockpit.bottleneck ? "#B4670C" : "#A0A099" }} aria-hidden="true" />
            {cockpit.bottleneck ? (
              <span style={{ color: "#8A5A12" }}>
                <b>Bottleneck: {cockpit.bottleneck.stage}</b> — {cockpit.bottleneck.reason}.
              </span>
            ) : (
              <span style={{ color: "#6A6A63" }}>No stage is backed up right now.</span>
            )}
          </div>
        </div>

        {/* stat row */}
        <div className="grid gap-3 sm:grid-cols-4">
          <div className={CARD} style={CARD_STYLE}>
            <p className={K} style={{ color: "#8A8A82" }}>Overdue</p>
            <div className="text-[30px] font-extrabold tabular-nums" style={{ color: ragColor(cockpit.overdue, TARGETS.overdue) }}>{cockpit.overdue}</div>
            <p className="text-[12px]" style={{ color: "#6A6A63" }}>target &lt;{TARGETS.overdue} · {cockpit.dueThisWeek} due this wk</p>
          </div>
          <div className={CARD} style={CARD_STYLE}>
            <p className={K} style={{ color: "#8A8A82" }}>Waiting on info</p>
            <div className="text-[30px] font-extrabold tabular-nums" style={{ color: ragColor(cockpit.waitingForInfo, TARGETS.waitingForInfo) }}>{cockpit.waitingForInfo}</div>
            <p className="text-[12px]" style={{ color: "#6A6A63" }}>target &lt;{TARGETS.waitingForInfo} · blocked on requesters</p>
          </div>
          <div className={CARD} style={CARD_STYLE}>
            <p className={K} style={{ color: "#8A8A82" }}>Turnaround</p>
            <div className="text-[30px] font-extrabold" style={{ color: turnaround ? ragColor(turnaround.quotedDays, TARGETS.turnaroundDays) : "#1D5FCB" }}>{turnWeeks}</div>
            <p className="text-[12px]" style={{ color: "#6A6A63" }}>target ≤{Math.round(TARGETS.turnaroundDays / 7)} wks · request → approval</p>
          </div>
          <div className={CARD} style={CARD_STYLE}>
            <p className={K} style={{ color: "#8A8A82" }}>Shipped / week</p>
            <div className="mt-1 flex items-end gap-1" style={{ height: 44 }}>
              {cockpit.shippedPerWeek.map((n, i) => (
                <div key={i} className="flex-1 rounded-[3px]" style={{ height: `${Math.max(6, Math.round((n / shipMax) * 100))}%`, background: i === cockpit.shippedPerWeek.length - 1 ? "#12833B" : "#17A34A" }} title={`${n}`} />
              ))}
            </div>
          </div>
        </div>

        {/* speed, quality, forecast, intake rhythm */}
        <div className="grid gap-3 sm:grid-cols-4">
          <div className={CARD} style={CARD_STYLE}>
            <p className={K} style={{ color: "#8A8A82" }}>Cycle time spread</p>
            {cockpit.cycleTime ? (
              <>
                <div className="text-[30px] font-extrabold tabular-nums" style={{ color: "#1D5FCB" }}>{cockpit.cycleTime.p85}d</div>
                <p className="text-[12px]" style={{ color: "#6A6A63" }}>85% finish within · median {cockpit.cycleTime.p50}d (n={cockpit.cycleTime.sampleSize})</p>
              </>
            ) : (
              <p className="text-[12.5px]" style={{ color: "#A0A099" }}>Too few recent completions.</p>
            )}
          </div>
          <div className={CARD} style={CARD_STYLE}>
            <p className={K} style={{ color: "#8A8A82" }}>Rework</p>
            {cockpit.rework ? (
              <>
                <div className="text-[30px] font-extrabold tabular-nums" style={{ color: ragColor(cockpit.rework.pct, 15) }}>{cockpit.rework.pct}%</div>
                <p className="text-[12px]" style={{ color: "#6A6A63" }}>{cockpit.rework.bounced} of {cockpit.rework.sample} proofs bounced back</p>
              </>
            ) : (
              <p className="text-[12.5px]" style={{ color: "#A0A099" }}>Too few proofs observed.</p>
            )}
          </div>
          <div className={CARD} style={CARD_STYLE}>
            <p className={K} style={{ color: "#8A8A82" }}>4-week outlook</p>
            <div className="text-[30px] font-extrabold tabular-nums" style={{ color: cockpit.forecast.weeklyNet > 0 ? "#B4670C" : "#12833B" }}>
              {cockpit.forecast.seasonal?.inFourWeeks ?? cockpit.forecast.inFourWeeks}
            </div>
            <p className="text-[12px]" style={{ color: "#6A6A63" }}>
              {cockpit.forecast.seasonal ? (
                <>
                  seasonal ({cockpit.forecast.seasonal.years} yr history):{" "}
                  <b style={{ color: cockpit.forecast.seasonal.pctChange > 0 ? "#B4670C" : "#12833B" }}>
                    {cockpit.forecast.seasonal.pctChange >= 0 ? "+" : ""}
                    {cockpit.forecast.seasonal.pctChange}% intake
                  </b>{" "}
                  → ~{cockpit.forecast.seasonal.expectedIntake} new · {cockpit.forecast.inFourWeeks} at flat pace
                </>
              ) : (
                <>active at current pace ({cockpit.forecast.weeklyNet >= 0 ? "+" : ""}{cockpit.forecast.weeklyNet}/wk)</>
              )}
            </p>
          </div>
          <div className={CARD} style={CARD_STYLE}>
            <p className={K} style={{ color: "#8A8A82" }}>Intake by weekday</p>
            <div className="mt-1 flex items-end gap-1" style={{ height: 44 }}>
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
            <p className="mt-1 text-[11px]" style={{ color: "#A0A099" }}>last 8 weeks</p>
          </div>
        </div>

        {/* flow health: aging buckets + cumulative flow */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className={CARD} style={CARD_STYLE}>
            <p className={`${K} mb-3`} style={{ color: "#8A8A82" }}>Aging — days in current stage <span style={{ color: "#A0A099" }}>(0–7 / 8–14 / 15–30 / 30+)</span></p>
            <div className="flex flex-col gap-3">
              {cockpit.agingBuckets.map((s) => {
                const total = Math.max(1, s.buckets[0] + s.buckets[1] + s.buckets[2] + s.buckets[3]);
                const shades = [0.35, 0.55, 0.75, 1];
                return (
                  <div key={s.stage}>
                    <div className="mb-1 flex justify-between text-[12px]">
                      <span style={{ color: "#3A3A34" }}>{s.stage}</span>
                      <span className="tabular-nums" style={{ color: "#8A8A82" }}>{s.buckets.join(" / ")}</span>
                    </div>
                    <div className="flex h-3 overflow-hidden rounded-full" style={{ background: "#EDEDE8" }}>
                      {s.buckets.map((n, i) => (
                        <div key={i} style={{ width: `${(n / total) * 100}%`, background: STAGE_FILL[s.stage], opacity: shades[i] }} title={`${n}`} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[11px]" style={{ color: "#A0A099" }}>darker = older — a right-heavy bar is stuck work</p>
          </div>
          <div className={CARD} style={CARD_STYLE}>
            <p className={`${K} mb-3`} style={{ color: "#8A8A82" }}>Cumulative flow — stage bands over time</p>
            <Cfd trend={trend} />
            {cockpit.stageTime.length > 0 && (
              <p className="mt-3 text-[12px]" style={{ color: "#6A6A63" }}>
                Where time goes (recent moves):{" "}
                {cockpit.stageTime.map((s, i) => (
                  <span key={s.stage}>
                    {i > 0 && " · "}
                    <b style={{ color: STAGE_FILL[s.stage] }}>{s.stage}</b> ~{s.avgDays}d
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>

        {/* needs attention — longest in current stage */}
        {cockpit.agedItems.length > 0 && (
          <div className={CARD} style={CARD_STYLE}>
            <p className={`${K} mb-3 flex items-center gap-1.5`} style={{ color: "#8A8A82" }}>
              <Hourglass size={13} aria-hidden="true" /> Needs attention — longest in current stage
            </p>
            <div className="flex flex-col">
              {cockpit.agedItems.map((it, i) => (
                <div
                  key={`${it.name}-${i}`}
                  className="flex items-center gap-3 py-2 text-[13px]"
                  style={i > 0 ? { borderTop: "1px solid #EDEDE8" } : undefined}
                >
                  <span className="flex-1 truncate font-semibold" style={{ color: "#131311" }}>{it.name}</span>
                  <span className="hidden w-40 truncate text-[12px] sm:block" style={{ color: "#8A8A82" }}>{it.department}</span>
                  <span className="w-28 text-[12px]" style={{ color: "#6A6A63" }}>{it.stage}</span>
                  <span className="w-16 text-right font-bold tabular-nums" style={{ color: it.days > 30 ? "#DB3B3B" : "#B4670C" }}>{it.days}d</span>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  <Bar
                    key={d.name}
                    label={d.name}
                    value={d.waiting}
                    max={cockpit.missingInfoByDept[0].waiting}
                    sub={`/${d.active}`}
                    color="#B4670C"
                  />
                ))}
              </div>
              <p className="mt-2 text-[11px]" style={{ color: "#A0A099" }}>waiting / their active total — ammunition for the nudge</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
