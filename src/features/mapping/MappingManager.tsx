"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Layers, Tag } from "lucide-react";
import { saveMappingAction, type MappingFormState } from "@/app/manager/mapping-actions";
import { STAGE_META } from "@/features/board/stages";
import type { Flag, ListStatus, ProjectType, TrelloMapping } from "@/lib/queue/types";

const CARD = "rounded-2xl border bg-white p-4 sm:p-5";
const CARD_STYLE = { borderColor: "#E4E4DF" } as const;
const K = "text-[11px] font-bold uppercase tracking-[0.09em]";
const INPUT = "mt-1 w-full rounded-lg border bg-white px-3 py-2 text-[14px] outline-none focus:border-[#2563EB]";
const INPUT_STYLE = { borderColor: "#D9D9D2", color: "#131311" } as const;

const INIT: MappingFormState = { ok: false, errors: [] };
const STAGES: (ListStatus | "hidden")[] = ["requested", "in-progress", "out-for-approval", "closed", "hidden"];

function stageLabel(s: ListStatus | "hidden"): string {
  return s === "hidden" ? "— Hidden —" : STAGE_META[s].label;
}
function stageColor(s: ListStatus | "hidden"): string {
  return s === "hidden" ? "#8A8A82" : STAGE_META[s].accent;
}

export function MappingManager({
  lists,
  labels,
  mapping,
}: {
  lists: string[];
  labels: string[];
  mapping: TrelloMapping;
}) {
  const byList = new Map(mapping.lists.map((e) => [e.list, e.status] as const));
  const initial: Record<string, ListStatus | "hidden"> = {};
  for (const l of lists) initial[l] = byList.get(l) ?? "hidden";

  const [sel, setSel] = useState<Record<string, ListStatus | "hidden">>(initial);
  const [state, action, pending] = useActionState(saveMappingAction, INIT);

  const flags = Object.keys(mapping.flagAliases) as Flag[];
  const types = Object.keys(mapping.typeAliases) as ProjectType[];

  return (
    <div className="min-h-screen px-4 py-8 sm:px-8" style={{ background: "#E7E7E2" }}>
      <div className="mx-auto flex max-w-[820px] flex-col gap-3">
        <header>
          <div className={K} style={{ color: "#2563EB" }}>
            <Link href="/manager/settings" className="no-underline" style={{ color: "#2563EB" }}>
              ← Manage
            </Link>
          </div>
          <h1 className="mt-1 text-[28px] font-extrabold tracking-[-0.015em]" style={{ color: "#131311" }}>
            Trello mapping
          </h1>
          <p className="mt-0.5 text-[14px]" style={{ color: "#6A6A63" }}>
            Control how Trello lists and labels convert onto the board. Saving rebuilds the board right
            away. Any list you don&rsquo;t place stays hidden from departments.
          </p>
        </header>

        <form action={action} className="flex flex-col gap-3">
          {/* Lists → stages */}
          <div className={CARD} style={CARD_STYLE}>
            <p className={`${K} mb-3 flex items-center gap-1.5`} style={{ color: "#8A8A82" }}>
              <Layers size={13} aria-hidden="true" /> Lists → stage
            </p>
            <div className="flex flex-col">
              {lists.map((list, i) => (
                <div
                  key={list}
                  className="flex items-center gap-3 py-2"
                  style={i > 0 ? { borderTop: "1px solid #EDEDE8" } : undefined}
                >
                  <span className="flex-1 truncate text-[14px] font-semibold" style={{ color: "#131311" }}>
                    {list}
                  </span>
                  <select
                    name={`list:${list}`}
                    value={sel[list]}
                    onChange={(e) => setSel((s) => ({ ...s, [list]: e.target.value as ListStatus | "hidden" }))}
                    className="rounded-lg border bg-white px-2.5 py-1.5 text-[13px] font-semibold outline-none focus:border-[#2563EB]"
                    style={{ borderColor: "#D9D9D2", color: stageColor(sel[list]) }}
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s} style={{ color: "#131311" }}>
                        {stageLabel(s)}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* live summary */}
            <div className="mt-4 flex flex-col gap-1.5 rounded-xl px-3 py-3" style={{ background: "#F7F7F4" }}>
              {(STAGES.filter((s) => s !== "hidden") as ListStatus[]).map((stage) => {
                const feeders = lists.filter((l) => sel[l] === stage);
                return (
                  <div key={stage} className="flex gap-2 text-[12.5px]">
                    <span className="w-32 shrink-0 font-bold" style={{ color: stageColor(stage) }}>
                      {stageLabel(stage)}
                    </span>
                    <span style={{ color: feeders.length ? "#3A3A34" : "#B23A3A" }}>
                      {feeders.length ? feeders.join(", ") : "no lists — this stage will be empty"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Labels → flags & types */}
          <div className={CARD} style={CARD_STYLE}>
            <p className={`${K} mb-1 flex items-center gap-1.5`} style={{ color: "#8A8A82" }}>
              <Tag size={13} aria-hidden="true" /> Labels → flags &amp; types
            </p>
            <p className="mb-3 text-[12px]" style={{ color: "#8A8A82" }}>
              Comma-separated Trello label text. A card gets the flag/type when it carries a matching label.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {flags.map((flag) => (
                <label key={flag} className="block">
                  <span className="text-[12px] font-semibold" style={{ color: "#3A3A34" }}>
                    Flag · {flag}
                  </span>
                  <input
                    className={INPUT}
                    style={INPUT_STYLE}
                    name={`flag:${flag}`}
                    defaultValue={mapping.flagAliases[flag].join(", ")}
                    placeholder={flag.toLowerCase()}
                  />
                </label>
              ))}
              {types.map((type) => (
                <label key={type} className="block">
                  <span className="text-[12px] font-semibold" style={{ color: "#3A3A34" }}>
                    Type · {type}
                  </span>
                  <input
                    className={INPUT}
                    style={INPUT_STYLE}
                    name={`type:${type}`}
                    defaultValue={mapping.typeAliases[type].join(", ")}
                    placeholder={type.toLowerCase()}
                  />
                </label>
              ))}
            </div>

            {labels.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[11.5px]" style={{ color: "#8A8A82" }}>Labels on your board:</span>
                {labels.map((l) => (
                  <span
                    key={l}
                    className="rounded-full px-2 py-0.5 text-[11.5px]"
                    style={{ background: "#F1F1EC", color: "#6A6A63" }}
                  >
                    {l}
                  </span>
                ))}
              </div>
            )}
          </div>

          {state.errors.length > 0 && (
            <ul className={`${CARD} text-[13px]`} style={{ ...CARD_STYLE, background: "#F4E4E4", color: "#B23A3A" }}>
              {state.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {state.ok && (
            <p className={`${CARD} text-[13px]`} style={{ ...CARD_STYLE, background: "#E7F6ED", color: "#12833B" }}>
              Saved — the board has been rebuilt with the new mapping.
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
              style={{ background: "#2563EB" }}
            >
              {pending ? "Saving & rebuilding…" : "Save mapping"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
