"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Status } from "@/lib/queue/types";
import { STAGE_META } from "./stages";

interface SearchResult {
  id: string;
  name: string;
  status: Exclude<Status, "hidden">;
  departments: string[];
}

export function ProjectSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(debounce.current), []);

  function onChange(value: string) {
    setQuery(value);
    clearTimeout(debounce.current);
    const q = value.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
        setSearched(true);
      }
    }, 250);
  }

  return (
    <section className="rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <label
        htmlFor="project-search"
        className="mb-2 flex items-center gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200"
      >
        <Search size={15} aria-hidden="true" />
        Find any project
      </label>
      <input
        id="project-search"
        type="search"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search any project — requested, in progress, out for approval, or closed…"
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      />
      <div className="mt-3 space-y-1.5" aria-live="polite">
        {loading && <p className="text-sm text-zinc-400">Searching…</p>}
        {!loading &&
          results.map((r) => {
            const meta = STAGE_META[r.status];
            const StatusIcon = meta.Icon;
            return (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <span className="text-sm text-zinc-800 dark:text-zinc-200">
                  {r.name}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {r.departments.length > 0 && (
                    <span className="text-xs text-zinc-500">
                      {r.departments.join(", ")}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}
                  >
                    <StatusIcon size={12} aria-hidden="true" />
                    {meta.label}
                  </span>
                </span>
              </div>
            );
          })}
        {!loading && searched && results.length === 0 && (
          <p className="text-sm text-zinc-400">No matching projects.</p>
        )}
      </div>
    </section>
  );
}
