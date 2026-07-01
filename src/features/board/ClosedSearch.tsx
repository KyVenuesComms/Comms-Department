"use client";

import { useEffect, useRef, useState } from "react";

interface ClosedResult {
  id: string;
  name: string;
  departments: string[];
}

export function ClosedSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClosedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Clean up any pending search when the component unmounts.
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
        const res = await fetch(`/api/closed?q=${encodeURIComponent(q)}`);
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
    <section className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
      <label
        htmlFor="closed-search"
        className="mb-2 block text-sm font-medium text-zinc-600 dark:text-zinc-400"
      >
        Search closed jobs
      </label>
      <input
        id="closed-search"
        type="search"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search a closed job by name…"
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />
      <div className="mt-3 space-y-1.5" aria-live="polite">
        {loading && <p className="text-sm text-zinc-400">Searching…</p>}
        {!loading &&
          results.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
            >
              <span className="text-sm text-zinc-800 dark:text-zinc-200">
                {r.name}
              </span>
              {r.departments.length > 0 && (
                <span className="shrink-0 text-xs text-zinc-500">
                  {r.departments.join(", ")}
                </span>
              )}
            </div>
          ))}
        {!loading && searched && results.length === 0 && (
          <p className="text-sm text-zinc-400">No matching closed jobs.</p>
        )}
      </div>
    </section>
  );
}
