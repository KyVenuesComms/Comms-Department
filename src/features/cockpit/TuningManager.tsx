"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Gauge } from "lucide-react";
import { saveTuningAction, type TuningFormState } from "@/app/manager/tuning-actions";
import type { Tuning } from "@/lib/queue/types";

const CARD = "rounded-2xl border bg-white p-4 sm:p-5";
const CARD_STYLE = { borderColor: "#E4E4DF" } as const;
const K = "text-[11px] font-bold uppercase tracking-[0.09em]";
const INPUT = "w-24 rounded-lg border bg-white px-3 py-2 text-[15px] tabular-nums outline-none focus:border-[#2563EB]";
const INPUT_STYLE = { borderColor: "#D9D9D2", color: "#131311" } as const;

const INIT: TuningFormState = { ok: false, errors: [] };

function Row({
  label,
  name,
  value,
  suffix,
  hint,
}: {
  label: string;
  name: keyof Tuning;
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
        <span className="w-20 text-[13px]" style={{ color: "#8A8A82" }}>{suffix}</span>
      </div>
      <p className="text-[12px]" style={{ color: "#8A8A82" }}>{hint}</p>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={CARD} style={CARD_STYLE}>
      <p className={`${K} mb-1`} style={{ color: "#8A8A82" }}>{title}</p>
      {children}
    </div>
  );
}

export function TuningManager({ tuning }: { tuning: Tuning }) {
  const [state, action, pending] = useActionState(saveTuningAction, INIT);

  return (
    <div className="min-h-screen px-4 py-8 sm:px-8" style={{ background: "#E7E7E2" }}>
      <div className="mx-auto flex max-w-[640px] flex-col gap-3">
        <header>
          <div className={K} style={{ color: "#2563EB" }}>
            <Link href="/manager/settings" className="no-underline" style={{ color: "#2563EB" }}>
              ← Manage
            </Link>
          </div>
          <h1 className="mt-1 flex items-center gap-2 text-[28px] font-extrabold tracking-[-0.015em]" style={{ color: "#131311" }}>
            <Gauge size={24} aria-hidden="true" style={{ color: "#2563EB" }} /> Refresh &amp; tuning
          </h1>
          <p className="mt-0.5 text-[14px]" style={{ color: "#6A6A63" }}>
            How often the board re-reads Trello and the windows behind its computed numbers. Defaults
            are sensible — change these only if you know why. Saving rebuilds right away.
          </p>
        </header>

        <form action={action} className="flex flex-col gap-3">
          <Group title="Data refresh">
            <Row
              label="Refresh interval"
              name="refreshMinutes"
              value={tuning.refreshMinutes}
              suffix="minutes"
              hint="How often to re-read Trello. Minimum 5 minutes — polling faster is a cost trap."
            />
          </Group>

          <Group title="Turnaround quote">
            <Row label="Look-back window" name="turnaroundWindowDays" value={tuning.turnaroundWindowDays} suffix="days" hint="Only approvals from the last N days feed the quoted turnaround." />
            <Row label="Minimum samples" name="turnaroundMinSamples" value={tuning.turnaroundMinSamples} suffix="jobs" hint="Don't quote a turnaround until at least this many approvals are in the window." />
            <Row label="Buffer" name="turnaroundBufferDays" value={tuning.turnaroundBufferDays} suffix="days" hint="Added to the median so quotes stay realistic during busy stretches." />
          </Group>

          <Group title="Recently shipped list">
            <Row label="Window" name="recentlyCompletedDays" value={tuning.recentlyCompletedDays} suffix="days" hint="Show jobs closed within this many days." />
            <Row label="Max shown" name="recentlyCompletedMax" value={tuning.recentlyCompletedMax} suffix="jobs" hint="Cap on how many recent completions to list." />
          </Group>

          <Group title="Workload comparison (busier / quieter)">
            <Row label="Comparison window" name="trendWindowDays" value={tuning.trendWindowDays} suffix="days" hint="Compare today's load against the median of the prior N days." />
            <Row label="Minimum history" name="trendMinDays" value={tuning.trendMinDays} suffix="days" hint="Don't show a workload read until this many days are banked." />
            <Row label="Band" name="workloadBandPct" value={tuning.workloadBandPct} suffix="percent" hint="How far from typical counts as busier/quieter (e.g. 15 = ±15%)." />
          </Group>

          {state.errors.length > 0 && (
            <ul className={`${CARD} text-[13px]`} style={{ ...CARD_STYLE, background: "#F4E4E4", color: "#B23A3A" }}>
              {state.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {state.ok && (
            <p className={`${CARD} text-[13px]`} style={{ ...CARD_STYLE, background: "#E7F6ED", color: "#12833B" }}>
              Saved — rebuilt with the new settings.
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
              style={{ background: "#2563EB" }}
            >
              {pending ? "Saving & rebuilding…" : "Save settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
