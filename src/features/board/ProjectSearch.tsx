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
  url?: string;
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
        size={17}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
        style={{ color: "#9A9A92" }}
        aria-hidden="true"
      />
      <input
        type="search"
        value={query}
        onChange={(e) => run(e.target.value)}
        aria-label="Find any project"
        placeholder="Find any project…"
        style={{ background: "#F5F5F2", borderColor: "#E6E6E1", color: "#1B1B19" }}
        className="w-full rounded-[10px] border py-2.5 pl-10 pr-9 text-[15px] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
      />
      {query && (
        <button
          type="button"
          onClick={() => run("")}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#9A9A92] hover:text-[#4A4A44]"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}

      {open && (
        <div
          className="absolute z-30 mt-1.5 max-h-96 w-full overflow-auto rounded-xl border bg-white p-1 shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
          style={{ borderColor: "#E6E6E1" }}
          aria-live="polite"
        >
          {loading && (
            <p className="px-2.5 py-2 text-sm" style={{ color: "#9A9A92" }}>
              Searching…
            </p>
          )}
          {!loading &&
            results.map((r) => {
              const meta = STAGE_META[r.status];
              const StatusIcon = meta.Icon;
              const inner = (
                <>
                  <span
                    className="text-sm"
                    style={{ color: "#1B1B19" }}
                  >
                    {r.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {r.departments.length > 0 && (
                      <span className="text-xs" style={{ color: "#9A9A92" }}>
                        {r.departments.join(", ")}
                      </span>
                    )}
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{ background: meta.tint, color: meta.darkText }}
                    >
                      <StatusIcon size={12} aria-hidden="true" />
                      {meta.label}
                    </span>
                  </span>
                </>
              );
              return r.url ? (
                <a
                  key={r.id}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 no-underline hover:bg-[#F5F5F2]"
                >
                  {inner}
                </a>
              ) : (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-2"
                >
                  {inner}
                </div>
              );
            })}
          {!loading && searched && results.length === 0 && (
            <p className="px-2.5 py-2 text-sm" style={{ color: "#9A9A92" }}>
              No matching projects.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
