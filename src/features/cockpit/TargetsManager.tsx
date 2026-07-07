"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Target } from "lucide-react";
import { saveTargetsAction, type TargetsFormState } from "@/app/manager/targets-actions";
import type { Targets } from "@/lib/queue/types";

const CARD = "rounded-2xl border bg-white p-4 sm:p-5";
const CARD_STYLE = { borderColor: "#E4E4DF" } as const;
const K = "text-[11px] font-bold uppercase tracking-[0.09em]";
const INPUT = "mt-1 w-28 rounded-lg border bg-white px-3 py-2 text-[15px] tabular-nums outline-none focus:border-[#2563EB]";
const INPUT_STYLE = { borderColor: "#D9D9D2", color: "#131311" } as const;

const INIT: TargetsFormState = { ok: false, errors: [] };

function Row({
  label,
  name,
  value,
  suffix,
  hint,
}: {
  label: string;
  name: string;
  value: number;
  suffix: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-1 py-3" style={{ borderTop: "1px solid #EDEDE8" }}>
      <div className="flex items-center gap-3">
        <label className="flex-1 text-[14px] font-semibold" style={{ color: "#131311" }} htmlFor={name}>
          {label}
        </label>
        <input id={name} className={INPUT} style={INPUT_STYLE} type="number" name={name} defaultValue={value} min={1} step={1} />
        <span className="w-16 text-[13px]" style={{ color: "#8A8A82" }}>{suffix}</span>
      </div>
      <p className="text-[12px]" style={{ color: "#8A8A82" }}>{hint}</p>
    </div>
  );
}

export function TargetsManager({ targets }: { targets: Targets }) {
  const [state, action, pending] = useActionState(saveTargetsAction, INIT);

  return (
    <div className="min-h-screen px-4 py-8 sm:px-8" style={{ background: "#E7E7E2" }}>
      <div className="mx-auto flex max-w-[620px] flex-col gap-3">
        <header>
          <div className={K} style={{ color: "#2563EB" }}>
            <Link href="/manager/settings" className="no-underline" style={{ color: "#2563EB" }}>
              ← Manage
            </Link>
          </div>
          <h1 className="mt-1 flex items-center gap-2 text-[28px] font-extrabold tracking-[-0.015em]" style={{ color: "#131311" }}>
            <Target size={24} aria-hidden="true" style={{ color: "#2563EB" }} /> Leadership targets
          </h1>
          <p className="mt-0.5 text-[14px]" style={{ color: "#6A6A63" }}>
            The thresholds the cockpit grades against (red/amber/green) and raises alerts on. Saving
            recomputes the cockpit right away.
          </p>
        </header>

        <form action={action} className={CARD} style={CARD_STYLE}>
          <Row
            label="Turnaround target"
            name="turnaroundDays"
            value={targets.turnaroundDays}
            suffix="days"
            hint="Quoted request→approval time should stay at or under this. Turns amber/red above it."
          />
          <Row
            label="Overdue limit"
            name="overdue"
            value={targets.overdue}
            suffix="projects"
            hint="Active overdue projects should stay under this. Alerts when exceeded."
          />
          <Row
            label="Weekly net-growth limit"
            name="weeklyNetGrowth"
            value={targets.weeklyNetGrowth}
            suffix="per week"
            hint="Alert when the backlog is growing faster than this (avg new minus shipped per week)."
          />

          {state.errors.length > 0 && (
            <ul className="mt-3 rounded-lg px-3 py-2 text-[13px]" style={{ background: "#F4E4E4", color: "#B23A3A" }}>
              {state.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {state.ok && (
            <p className="mt-3 rounded-lg px-3 py-2 text-[13px]" style={{ background: "#E7F6ED", color: "#12833B" }}>
              Saved — the cockpit has been recomputed with the new targets.
            </p>
          )}

          <div className="mt-4">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
              style={{ background: "#2563EB" }}
            >
              {pending ? "Saving…" : "Save targets"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
