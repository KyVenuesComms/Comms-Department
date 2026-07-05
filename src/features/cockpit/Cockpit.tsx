"use client";

import { AlertTriangle, Lock, RefreshCw, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CockpitData, QueueMetrics } from "@/lib/queue/types";

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
  updatedAt,
  stale,
}: {
  cockpit: CockpitData;
  turnaround: QueueMetrics["turnaround"];
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
          <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "#A0A099" }}>
            <Lock size={12} aria-hidden="true" /> private ·
            <RefreshCw size={12} aria-hidden="true" />
            {stale ? "last good data" : `updated ${agoLabel(updatedAt, now)}`}
          </div>
        </div>

        {/* leverage — Grove's highest-leverage move */}
        <div className={CARD} style={{ ...CARD_STYLE, background: "#131311" }}>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.09em]" style={{ color: "#F5C86B" }}>
            <Zap size={14} aria-hidden="true" /> Highest-leverage move
          </div>
          <p className="mt-1.5 text-[16px] font-semibold text-white">{cockpit.leverage}</p>
        </div>

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
            <div className="text-[13.5px]" style={{ color: "#3A3A34" }}>
              This week:{" "}
              <b style={{ color: "#1D5FCB" }}>+{intakeWeek} in</b> ·{" "}
              <b style={{ color: "#12833B" }}>−{shippedWeek} out</b> ·{" "}
              <b style={{ color: net > 0 ? "#B4670C" : "#12833B" }}>
                net {net >= 0 ? "+" : ""}{net} {net > 0 ? "· backlog growing" : "· holding/shrinking"}
              </b>
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
            <div className="text-[30px] font-extrabold tabular-nums" style={{ color: "#DB3B3B" }}>{cockpit.overdue}</div>
            <p className="text-[12px]" style={{ color: "#6A6A63" }}>{cockpit.dueThisWeek} due this week</p>
          </div>
          <div className={CARD} style={CARD_STYLE}>
            <p className={K} style={{ color: "#8A8A82" }}>Waiting on info</p>
            <div className="text-[30px] font-extrabold tabular-nums" style={{ color: "#B4670C" }}>{cockpit.waitingForInfo}</div>
            <p className="text-[12px]" style={{ color: "#6A6A63" }}>blocked on requesters</p>
          </div>
          <div className={CARD} style={CARD_STYLE}>
            <p className={K} style={{ color: "#8A8A82" }}>Turnaround</p>
            <div className="text-[30px] font-extrabold" style={{ color: "#1D5FCB" }}>{turnWeeks}</div>
            <p className="text-[12px]" style={{ color: "#6A6A63" }}>request → approval</p>
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

        {/* team load */}
        {team.length > 0 && (
          <div className={CARD} style={CARD_STYLE}>
            <p className={`${K} mb-3`} style={{ color: "#8A8A82" }}>Team load — active projects per person</p>
            <div className="flex flex-col gap-2.5">
              {team.map((a) => (
                <Bar key={a.name} label={a.name} value={a.active} max={teamMax} color="#6E56CF" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
