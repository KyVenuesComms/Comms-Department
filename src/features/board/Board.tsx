"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Project, ProjectType } from "@/lib/queue/types";
import { ProjectCard } from "./ProjectCard";
import { ClosedSearch } from "./ClosedSearch";

const UI_REFRESH_MS = 5 * 60 * 1000; // pull fresh server data every 5 min
const TICK_MS = 30 * 1000; // update "x ago" twice a minute
const INITIAL_CAP = 25; // cards shown per column before "show all"

const TYPES: (ProjectType | "all")[] = ["all", "Print", "Signage", "Digital"];

function agoLabel(updatedAt: string, now: number): string {
  const diff = Math.max(0, now - new Date(updatedAt).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  return `${hr} hr ago`;
}

interface BoardProps {
  requested: Project[];
  inProgress: Project[];
  closedCount: number;
  activeTotal: number;
  updatedAt: string;
  stale: boolean;
}

export function Board({
  requested,
  inProgress,
  closedCount,
  activeTotal,
  updatedAt,
  stale,
}: BoardProps) {
  const router = useRouter();
  const [dept, setDept] = useState<"all" | "Expositions">("all");
  const [type, setType] = useState<ProjectType | "all">("all");
  const [now, setNow] = useState(() => new Date(updatedAt).getTime());

  // Keep "updated x ago" ticking, and pull fresh server data periodically.
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), TICK_MS);
    const refresh = setInterval(() => router.refresh(), UI_REFRESH_MS);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [router]);

  const match = useMemo(() => {
    return (p: Project) =>
      (dept === "all" || p.departments.includes(dept)) &&
      (type === "all" || p.type === type);
  }, [dept, type]);

  const req = useMemo(() => requested.filter(match), [requested, match]);
  const prog = useMemo(() => inProgress.filter(match), [inProgress, match]);

  return (
    <div className="min-h-full bg-zinc-50 px-4 py-8 font-sans sm:px-6 dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-400">
              Creative team workload
            </p>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-4xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                {activeTotal}
              </span>
              <span className="text-lg text-zinc-600 dark:text-zinc-400">
                active projects
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              <span className="tabular-nums text-sky-700 dark:text-sky-400">
                {requested.length}
              </span>{" "}
              requested ·{" "}
              <span className="tabular-nums text-amber-700 dark:text-amber-500">
                {inProgress.length}
              </span>{" "}
              in progress ·{" "}
              <span className="tabular-nums">{closedCount}</span> closed
            </p>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            {stale
              ? "Showing last good data — Trello was unreachable"
              : `Updated ${agoLabel(updatedAt, now)}`}
          </p>
        </header>

        {/* Prioritization explainer */}
        <details
          open
          className="mt-6 rounded-xl bg-sky-50 p-4 dark:bg-sky-950/40"
        >
          <summary className="cursor-pointer text-sm font-medium text-sky-800 dark:text-sky-300">
            How your projects are prioritized
          </summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
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
              <strong className="font-medium">Print &amp; signage</strong>{" "}
              before digital when timing is otherwise equal.
            </li>
            <li>
              <strong className="font-medium">Missing info goes to the back</strong>{" "}
              — incomplete requests wait (or aren&rsquo;t accepted) until you
              send what&rsquo;s needed.
            </li>
          </ol>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            “Submitted Past Deadline” means the request arrived after
            Communications&rsquo; last call for submissions — we&rsquo;ll do our
            best, but these aren&rsquo;t guaranteed. They&rsquo;re worked in
            normal order.
          </p>
        </details>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <select
            aria-label="Filter by department"
            value={dept}
            onChange={(e) => setDept(e.target.value as "all" | "Expositions")}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="all">All departments</option>
            <option value="Expositions">Expositions</option>
          </select>
          <span className="text-xs text-zinc-400">type:</span>
          <div className="flex flex-wrap gap-1.5">
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

        {/* Columns */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <Column title="Requested" dotClass="bg-sky-500" items={req} />
          <Column title="In progress" dotClass="bg-amber-500" items={prog} />
        </div>

        <ClosedSearch />
      </div>
    </div>
  );
}

function Column({
  title,
  dotClass,
  items,
}: {
  title: string;
  dotClass: string;
  items: Project[];
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, INITIAL_CAP);
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
        <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} aria-hidden="true" />
        {title}
        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {items.length}
        </span>
      </h2>
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
          Show all {items.length} {title.toLowerCase()}
        </button>
      )}
    </section>
  );
}
