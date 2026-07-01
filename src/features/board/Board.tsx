"use client";

import { CircleCheck, Clock, Flag, ListChecks, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Project, ProjectType, QueueMetrics } from "@/lib/queue/types";
import { fmtDate, turnaroundPhrase } from "./format";
import { ProjectCard } from "./ProjectCard";
import { ProjectSearch } from "./ProjectSearch";
import { LIVE_STAGES, STAGE_META } from "./stages";

const UI_REFRESH_MS = 5 * 60 * 1000; // pull fresh server data every 5 min
const TICK_MS = 30 * 1000; // update "x ago" twice a minute
const INITIAL_CAP = 25; // cards shown per column before "show all"

const TYPES: (ProjectType | "all")[] = ["all", "Print", "Signage", "Digital"];

function agoLabel(updatedAt: string, now: number): string {
  const diff = Math.max(0, now - new Date(updatedAt).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  return `${Math.floor(min / 60)} hr ago`;
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

export function Board({
  requested,
  inProgress,
  outForApproval,
  closedCount,
  activeTotal,
  metrics,
  updatedAt,
  stale,
}: BoardProps) {
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

  const deptSummary = dept !== "all" ? metrics.perDepartment[dept] : null;

  return (
    <div className="min-h-full bg-zinc-50 px-4 py-8 font-sans sm:px-6 dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl">
        {/* Title + workload */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
              Kentucky Venues Work Order Status
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              <span className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                {activeTotal}
              </span>{" "}
              active projects ·{" "}
              <span className="tabular-nums text-sky-700 dark:text-sky-400">
                {requested.length}
              </span>{" "}
              requested ·{" "}
              <span className="tabular-nums text-amber-700 dark:text-amber-500">
                {inProgress.length}
              </span>{" "}
              in progress ·{" "}
              <span className="tabular-nums text-emerald-700 dark:text-emerald-500">
                {outForApproval.length}
              </span>{" "}
              out for approval ·{" "}
              <span className="tabular-nums">{closedCount}</span> closed
            </p>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
            <RefreshCw size={12} aria-hidden="true" />
            {stale
              ? "Showing last good data — Trello was unreachable"
              : `Updated ${agoLabel(updatedAt, now)}`}
          </p>
        </header>

        {/* Turnaround expectation */}
        {metrics.turnaround && (
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-sky-50 px-4 py-2.5 text-sm text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
            <Clock size={16} className="shrink-0 text-sky-600 dark:text-sky-400" aria-hidden="true" />
            <p>
              New requests are currently taking{" "}
              <strong className="font-semibold">
                {turnaroundPhrase(metrics.turnaround.quotedDays)}
              </strong>{" "}
              to reach approval. Busy periods can run longer.
            </p>
          </div>
        )}

        {/* Recently completed */}
        {metrics.recentlyCompleted.length > 0 && (
          <section className="mt-4">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400">
              <CircleCheck size={15} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              Recently completed
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {metrics.recentlyCompleted.map((r) => (
                <div
                  key={r.id}
                  className="shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <p className="max-w-[220px] truncate text-sm text-zinc-800 dark:text-zinc-200">
                    {r.name}
                  </p>
                  <p className="text-xs text-zinc-400">{fmtDate(r.at)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Prioritization explainer — collapsed by default */}
        <details className="mt-6 rounded-xl bg-sky-50 px-4 py-3 dark:bg-sky-950/40">
          <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-sky-800 dark:text-sky-300">
            <ListChecks size={15} aria-hidden="true" />
            How your projects are prioritized
          </summary>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
            <li>
              <strong className="font-medium">
                CEO &amp; Chief of Staff requests
              </strong>{" "}
              jump the line — and shift the deadlines of everything else.
            </li>
            <li>
              <strong className="font-medium">High Priority</strong> set by your
              Executive Director jumps ahead within your department.
            </li>
            <li>
              <strong className="font-medium">Earliest deadline</strong> comes
              next.
            </li>
            <li>
              <strong className="font-medium">Print &amp; signage</strong> before
              digital when timing is otherwise equal.
            </li>
            <li>
              <strong className="font-medium">
                Missing info goes to the back
              </strong>{" "}
              until you send what&rsquo;s needed.
            </li>
          </ol>
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
            <Flag size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>
              <strong className="font-semibold">Submitted after the deadline?</strong>{" "}
              If a request arrives after Communications&rsquo; last call for
              submissions, we&rsquo;ll do our best — but it isn&rsquo;t
              guaranteed, and it&rsquo;s worked in normal order.
            </p>
          </div>
        </details>

        {/* Control bar: search + department + type, together */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <ProjectSearch />
          <select
            aria-label="Filter by department"
            value={dept}
            onChange={(e) => setDept(e.target.value as "all" | "Expositions")}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="all">All departments</option>
            <option value="Expositions">Expositions</option>
          </select>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-400">type:</span>
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={
                  type === t
                    ? "rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }
              >
                {t === "all" ? "All" : t}
              </button>
            ))}
          </div>
        </div>

        {/* Per-department summary (when a department is selected) */}
        {deptSummary && (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {dept}
            </span>
            <span className="text-zinc-600 dark:text-zinc-400">
              {" "}
              — <span className="tabular-nums">{deptSummary.requested}</span>{" "}
              requested ·{" "}
              <span className="tabular-nums">{deptSummary.inProgress}</span> in
              progress ·{" "}
              <span className="tabular-nums">{deptSummary.outForApproval}</span>{" "}
              out for approval{" "}
              <span className="text-zinc-400">
                ({deptSummary.total} active)
              </span>
            </span>
          </div>
        )}

        {/* Three-stage flow columns */}
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {LIVE_STAGES.map((key) => (
            <Column key={key} stageKey={key} items={byStage[key]} />
          ))}
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
  return (
    <section>
      <div
        className={`mb-3 flex items-center gap-2.5 rounded-xl px-3 py-2.5 ${m.headerBg}`}
      >
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg text-white ${m.chipBg}`}
        >
          <Icon size={16} aria-hidden="true" />
        </span>
        <span className={`flex-1 text-base font-semibold ${m.headerText}`}>
          {m.label}
        </span>
        <span
          className={`rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold tabular-nums dark:bg-black/20 ${m.headerText}`}
        >
          {items.length}
        </span>
      </div>
      <div className="space-y-2.5">
        {visible.length === 0 ? (
          <p className="px-1 py-2 text-sm text-zinc-400">Nothing here.</p>
        ) : (
          visible.map((p) => <ProjectCard key={p.id} project={p} />)
        )}
      </div>
      {items.length > INITIAL_CAP && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-3 w-full rounded-lg border border-dashed border-zinc-300 py-2 text-sm text-sky-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-sky-400 dark:hover:bg-zinc-900"
        >
          Show all {items.length}
        </button>
      )}
    </section>
  );
}
