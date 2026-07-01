"use client";

import { Search, X } from "lucide-react";
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

  function run(value: string) {
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

  const open = query.trim().length > 0;

  return (
    <div className="relative min-w-[220px] flex-1">
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
        aria-hidden="true"
      />
      <input
        type="search"
        value={query}
        onChange={(e) => run(e.target.value)}
        aria-label="Find any project"
        placeholder="Find any project…"
        className="w-full rounded-lg border border-zinc-300 bg-white py-1.5 pl-9 pr-8 text-sm text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />
      {query && (
        <button
          type="button"
          onClick={() => run("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          <X size={15} aria-hidden="true" />
        </button>
      )}

      {open && (
        <div
          className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          aria-live="polite"
        >
          {loading && (
            <p className="px-2 py-2 text-sm text-zinc-400">Searching…</p>
          )}
          {!loading &&
            results.map((r) => {
              const meta = STAGE_META[r.status];
              const StatusIcon = meta.Icon;
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800"
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
            <p className="px-2 py-2 text-sm text-zinc-400">
              No matching projects.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
