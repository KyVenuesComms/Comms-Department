"use client";

import { ChevronDown, CircleCheck, Clock, Flag, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Project, ProjectType, QueueMetrics } from "@/lib/queue/types";
import { fmtDate } from "./format";
import { ProjectCard } from "./ProjectCard";
import { ProjectSearch } from "./ProjectSearch";
import { LIVE_STAGES, STAGE_META } from "./stages";

const UI_REFRESH_MS = 5 * 60 * 1000;
const TICK_MS = 30 * 1000;
const INITIAL_CAP = 25;
const TYPES: (ProjectType | "all")[] = ["all", "Print", "Signage", "Digital"];

const RULES = [
  { n: "CEO & Chief of Staff requests", d: " jump the line — and shift the deadlines of everything else." },
  { n: "High Priority", d: " set by your Executive Director jumps ahead within your department." },
  { n: "Earliest deadline", d: " comes next." },
  { n: "Print & signage", d: " before digital when timing is otherwise equal." },
  { n: "Missing info goes to the back", d: " until you send what’s needed." },
];

function agoLabel(updatedAt: string, now: number): string {
  const min = Math.floor(Math.max(0, now - new Date(updatedAt).getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  return `${Math.floor(min / 60)} hr ago`;
}

function heroValue(quotedDays: number): string {
  if (quotedDays >= 14) return `≈ ${Math.round(quotedDays / 7)} weeks`;
  return `≈ ${quotedDays} days`;
}

interface BoardProps {
  requested: Project[];
  inProgress: Project[];
  outForApproval: Project[];
  closedCount: number;
  activeTotal: number;
  metrics: QueueMetrics;
  updatedAt: string;
  stale: boolean;
}

export function Board(props: BoardProps) {
  const { requested, inProgress, outForApproval, closedCount, activeTotal, metrics, updatedAt, stale } = props;
  const router = useRouter();
  const [dept, setDept] = useState<"all" | "Expositions">("all");
  const [type, setType] = useState<ProjectType | "all">("all");
  const [now, setNow] = useState(() => new Date(updatedAt).getTime());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), TICK_MS);
    const refresh = setInterval(() => router.refresh(), UI_REFRESH_MS);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [router]);

  const byStage = useMemo(() => {
    const pass = (p: Project) =>
      (dept === "all" || p.departments.includes(dept)) &&
      (type === "all" || p.type === type);
    return {
      requested: requested.filter(pass),
      "in-progress": inProgress.filter(pass),
      "out-for-approval": outForApproval.filter(pass),
    };
  }, [requested, inProgress, outForApproval, dept, type]);

  const statRows = [
    { label: "Active projects", value: activeTotal, color: "#1B1B19", dot: null },
    { label: "In Queue", value: requested.length, color: STAGE_META.requested.accent, dot: STAGE_META.requested.dot },
    { label: "In Progress", value: inProgress.length, color: STAGE_META["in-progress"].accent, dot: STAGE_META["in-progress"].dot },
    { label: "Out for Approval", value: outForApproval.length, color: STAGE_META["out-for-approval"].accent, dot: STAGE_META["out-for-approval"].dot },
    { label: "Closed all-time", value: closedCount, color: "#A0A099", dot: null, muted: true },
  ];
  const recent = metrics.recentlyCompleted.slice(0, 3);

  return (
    <div className="min-h-full" style={{ background: "#E7E7E2" }}>
      <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-8 sm:py-10">
        <div
          style={{ border: "1px solid #E4E4DF", borderRadius: 20, boxShadow: "0 1px 3px rgba(0,0,0,.05),0 18px 44px rgba(0,0,0,.08)" }}
          className="bg-white"
        >
          {/* HEADER ZONE */}
          <div className="rounded-t-[20px] px-5 pb-6 pt-6 sm:px-[30px] sm:pt-7">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.015em] sm:text-[32px]" style={{ color: "#131311" }}>
                Kentucky Venues Work Order Status
              </h1>
              <p className="flex flex-none items-center gap-1.5 pt-2 text-[13px] font-medium" style={{ color: "#A0A099" }}>
                <RefreshCw size={14} aria-hidden="true" />
                {stale ? "Last good data" : `Updated ${agoLabel(updatedAt, now)}`}
              </p>
            </div>

            <div className="my-[22px] h-px" style={{ background: "#EDEDE8" }} />

            <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.55fr_1fr] md:gap-0">
              {/* LEFT: expectations */}
              <div className="md:pr-[34px]">
                <div className="text-[12.5px] font-bold uppercase tracking-[0.08em]" style={{ color: "#2563EB" }}>
                  Current turnaround time on complete work orders
                </div>
                <div className="mt-3 flex items-center gap-3.5">
                  <div className="flex h-[50px] w-[50px] flex-none items-center justify-center rounded-[13px]" style={{ background: "#EAF1FD", color: "#1D5FCB" }}>
                    <Clock size={25} aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-[30px] font-extrabold leading-none" style={{ color: "#1D5FCB" }}>
                      {metrics.turnaround ? heroValue(metrics.turnaround.quotedDays) : "—"}
                    </div>
                    <div className="mt-1 text-[13.5px] leading-snug" style={{ color: "#6A6A63" }}>
                      for a new request to reach approval today. Busy periods run longer.
                    </div>
                  </div>
                </div>

                <div className="my-5 h-px" style={{ background: "#EDEDE8" }} />

                <div className="mb-3 text-[15.5px] font-bold" style={{ color: "#1B1B19" }}>
                  How we prioritize your work
                </div>
                <ol className="flex list-decimal flex-col gap-2.5 pl-[22px]">
                  {RULES.map((r) => (
                    <li key={r.n} className="text-[14px] leading-[1.45]" style={{ color: "#4A4A44" }}>
                      <b className="font-bold" style={{ color: "#1B1B19" }}>{r.n}</b>
                      {r.d}
                    </li>
                  ))}
                </ol>

                <div className="mt-4 flex gap-2.5 rounded-[11px] px-4 py-3" style={{ background: "#FBF1DC" }}>
                  <Flag size={15} className="mt-px flex-none" style={{ color: "#B4670C" }} aria-hidden="true" />
                  <div className="text-[13px] leading-[1.45]" style={{ color: "#8A5A12" }}>
                    <b className="font-bold">Submitted after the deadline?</b> If a request arrives after Communications&rsquo; last call, we&rsquo;ll do our best — but it isn&rsquo;t guaranteed, and it&rsquo;s worked in normal order.
                  </div>
                </div>
              </div>

              {/* RIGHT: the board right now */}
              <div className="md:border-l md:pl-[34px]" style={{ borderColor: "#EDEDE8" }}>
                <div className="text-[12.5px] font-bold uppercase tracking-[0.08em]" style={{ color: "#8A8A82" }}>
                  The board right now
                </div>
                <div className="mt-3 flex flex-col">
                  {statRows.map((row, i) => (
                    <div
                      key={row.label}
                      className="flex items-baseline justify-between py-2.5"
                      style={i < statRows.length - 1 ? { borderBottom: "1px solid #EDEDE8" } : undefined}
                    >
                      <span className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: row.muted ? "#8A8A82" : "#3A3A34" }}>
                        {row.dot && <span className="h-[9px] w-[9px] rounded-[3px]" style={{ background: row.dot }} />}
                        {row.label}
                      </span>
                      <span className="text-[23px] font-extrabold tabular-nums" style={{ color: row.color }}>
                        {row.value.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {recent.length > 0 && (
                  <>
                    <div className="mb-[9px] mt-3.5 h-px" style={{ background: "#EDEDE8" }} />
                    <div className="mb-2.5 flex items-center gap-1.5" style={{ color: "#12833B" }}>
                      <CircleCheck size={14} aria-hidden="true" />
                      <span className="text-[12px] font-bold uppercase tracking-[0.05em]">Recently shipped</span>
                    </div>
                    <div className="flex flex-col gap-[7px]">
                      {recent.map((r) => (
                        <div key={r.id} className="flex items-baseline justify-between gap-2.5">
                          <span className="text-[13px] font-medium leading-tight" style={{ color: "#4A4A44" }}>{r.name}</span>
                          <span className="flex-none text-[12px]" style={{ color: "#A0A099" }}>{fmtDate(r.at)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* SEARCH ZONE (sticky) */}
          <div className="sticky top-0 z-20 bg-white px-5 py-[15px] sm:px-[30px]" style={{ borderTop: "1px solid #EDEDE8" }}>
            <div className="flex flex-wrap items-center gap-3">
              <ProjectSearch />
              <select
                aria-label="Filter by department"
                value={dept}
                onChange={(e) => setDept(e.target.value as "all" | "Expositions")}
                style={{ background: "#fff", borderColor: "#E6E6E1", color: "#3A3A34" }}
                className="rounded-[10px] border px-3.5 py-2.5 text-[15px] font-semibold"
              >
                <option value="all">All departments</option>
                <option value="Expositions">Expositions</option>
              </select>
              <span className="text-[14px] font-medium" style={{ color: "#9A9A92" }}>type</span>
              {TYPES.map((t) => {
                const active = type === t;
                return (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    style={
                      active
                        ? { background: "#1B1B19", color: "#fff", borderColor: "#1B1B19" }
                        : { background: "#fff", color: "#4A4A44", borderColor: "#E6E6E1" }
                    }
                    className="rounded-full border px-[15px] py-[7px] text-[14px] font-semibold"
                  >
                    {t === "all" ? "All" : t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* QUEUE ZONE */}
          <div className="relative rounded-b-[20px] px-5 pb-[30px] pt-[22px] sm:px-[30px]" style={{ background: "#F7F7F4", borderTop: "1px solid #EDEDE8" }}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {LIVE_STAGES.map((key) => (
                <Column key={key} stageKey={key} items={byStage[key]} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Column({
  stageKey,
  items,
}: {
  stageKey: (typeof LIVE_STAGES)[number];
  items: Project[];
}) {
  const [showAll, setShowAll] = useState(false);
  const m = STAGE_META[stageKey];
  const Icon = m.Icon;
  const visible = showAll ? items : items.slice(0, INITIAL_CAP);
  const more = items.length - visible.length;

  return (
    <div className="flex flex-col gap-[11px]">
      <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5" style={{ background: m.tint }}>
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] text-white" style={{ background: m.accent }}>
          <Icon size={17} aria-hidden="true" />
        </span>
        <span className="flex-1 text-[16px] font-bold" style={{ color: m.accent }}>{m.label}</span>
        <span className="rounded-full bg-white px-3 py-[3px] text-[13.5px] font-bold tabular-nums" style={{ color: m.accent }}>
          {items.length}
        </span>
      </div>
      <div className="flex flex-col gap-[9px]">
        {visible.length === 0 ? (
          <p className="px-1 py-2 text-sm" style={{ color: "#9A9A92" }}>Nothing here.</p>
        ) : (
          visible.map((p) => <ProjectCard key={p.id} project={p} />)
        )}
        {more > 0 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            style={{ borderColor: "#E4E4DE", color: "#5A5A54" }}
            className="flex items-center justify-center gap-1.5 rounded-[9px] border bg-white py-2.5 text-[13px] font-bold transition-colors hover:bg-[#F1F1EC] hover:text-[#3A3A34]"
          >
            +{more} more
            <ChevronDown size={14} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
