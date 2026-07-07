"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Building2, Plus, X } from "lucide-react";
import { saveDepartmentsAction, type DeptFormState } from "@/app/manager/departments-actions";
import type { DepartmentConfig } from "@/lib/queue/types";

const CARD = "rounded-2xl border bg-white p-4 sm:p-5";
const CARD_STYLE = { borderColor: "#E4E4DF" } as const;
const K = "text-[11px] font-bold uppercase tracking-[0.09em]";
const INPUT = "w-full rounded-lg border bg-white px-3 py-2 text-[14px] outline-none focus:border-[#2563EB]";
const INPUT_STYLE = { borderColor: "#D9D9D2", color: "#131311" } as const;

const INIT: DeptFormState = { ok: false, errors: [] };

interface Row {
  name: string;
  aliases: string;
}

export function DepartmentsManager({ departments }: { departments: DepartmentConfig[] }) {
  const [rows, setRows] = useState<Row[]>(
    departments.map((d) => ({ name: d.name, aliases: d.aliases.join(", ") })),
  );
  const [state, action, pending] = useActionState(saveDepartmentsAction, INIT);

  const set = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => setRows((rs) => rs.filter((_, j) => j !== i));
  const add = () => setRows((rs) => [...rs, { name: "", aliases: "" }]);

  return (
    <div className="min-h-screen px-4 py-8 sm:px-8" style={{ background: "#E7E7E2" }}>
      <div className="mx-auto flex max-w-[760px] flex-col gap-3">
        <header>
          <div className={K} style={{ color: "#2563EB" }}>
            <Link href="/manager/settings" className="no-underline" style={{ color: "#2563EB" }}>
              ← Manage
            </Link>
          </div>
          <h1 className="mt-1 flex items-center gap-2 text-[28px] font-extrabold tracking-[-0.015em]" style={{ color: "#131311" }}>
            <Building2 size={24} aria-hidden="true" style={{ color: "#2563EB" }} /> Departments
          </h1>
          <p className="mt-0.5 text-[14px]" style={{ color: "#6A6A63" }}>
            The canonical departments behind the board&rsquo;s filter and the cockpit&rsquo;s by-department
            view. Aliases catch messy free-text in a card&rsquo;s &ldquo;Department:&rdquo; field (e.g.
            <b> comm</b> → Communications). Saving rebuilds the board right away.
          </p>
        </header>

        <form action={action} className={CARD} style={CARD_STYLE}>
          <input type="hidden" name="payload" value={JSON.stringify(rows)} />

          <div className="flex items-center gap-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: "#A0A099" }}>
            <span className="flex-1">Department</span>
            <span className="flex-1">Aliases (comma-separated)</span>
            <span className="w-6" />
          </div>

          <div className="flex flex-col">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5" style={i > 0 ? { borderTop: "1px solid #EDEDE8" } : undefined}>
                <input
                  className={`${INPUT} flex-1`}
                  style={INPUT_STYLE}
                  value={r.name}
                  onChange={(e) => set(i, { name: e.target.value })}
                  placeholder="Department name"
                  aria-label={`Department ${i + 1} name`}
                />
                <input
                  className={`${INPUT} flex-1`}
                  style={INPUT_STYLE}
                  value={r.aliases}
                  onChange={(e) => set(i, { aliases: e.target.value })}
                  placeholder="comm, communications dept"
                  aria-label={`Department ${i + 1} aliases`}
                />
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="flex h-8 w-6 items-center justify-center rounded-md"
                  style={{ color: "#B23A3A" }}
                  aria-label={`Remove ${r.name || "department"}`}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={add}
            className="mt-3 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-semibold"
            style={{ borderColor: "#D9D9D2", color: "#2563EB" }}
          >
            <Plus size={14} aria-hidden="true" /> Add department
          </button>

          {state.errors.length > 0 && (
            <ul className="mt-3 rounded-lg px-3 py-2 text-[13px]" style={{ background: "#F4E4E4", color: "#B23A3A" }}>
              {state.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {state.ok && (
            <p className="mt-3 rounded-lg px-3 py-2 text-[13px]" style={{ background: "#E7F6ED", color: "#12833B" }}>
              Saved — the board has been rebuilt with the new department list.
            </p>
          )}

          <div className="mt-4">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
              style={{ background: "#2563EB" }}
            >
              {pending ? "Saving & rebuilding…" : "Save departments"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
