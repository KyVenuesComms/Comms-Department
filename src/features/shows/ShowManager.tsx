"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { deleteShowAction, saveShowAction, type ShowFormState } from "@/app/manager/shows-actions";
import type { ShowConfig } from "@/lib/queue/shows";

const CARD = "rounded-2xl border bg-white p-4 sm:p-5";
const CARD_STYLE = { borderColor: "#E4E4DF" } as const;
const K = "text-[11px] font-bold uppercase tracking-[0.09em]";
const LABEL = "text-[12px] font-semibold";
const INPUT =
  "mt-1 w-full rounded-lg border bg-white px-3 py-2 text-[14px] outline-none focus:border-[#2563EB]";
const INPUT_STYLE = { borderColor: "#D9D9D2", color: "#131311" } as const;

const INIT: ShowFormState = { ok: false, errors: [] };

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className={LABEL} style={{ color: "#3A3A34" }}>
        {label}
        {required && <span style={{ color: "#B23A3A" }}> *</span>}
      </span>
      <input
        className={INPUT}
        style={INPUT_STYLE}
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
      {hint && (
        <span className="mt-1 block text-[11.5px]" style={{ color: "#8A8A82" }}>
          {hint}
        </span>
      )}
    </label>
  );
}

/** Add form (no `show`) or edit form (with `show`). */
function ShowForm({ show }: { show?: ShowConfig }) {
  const [state, action, pending] = useActionState(saveShowAction, INIT);
  const editing = !!show;

  return (
    <form action={action} className="flex flex-col gap-3">
      {editing && <input type="hidden" name="originalSlug" value={show.slug} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Show name" name="name" defaultValue={show?.name} placeholder="Kentucky State Fair & WCHS" required />
        <Field
          label="URL slug"
          name="slug"
          defaultValue={show?.slug}
          placeholder="kentucky-state-fair"
          required
          hint="Lives at /shows/<slug>. Lowercase, hyphens."
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Start date" name="start" type="date" defaultValue={show?.start} required />
        <Field label="End date" name="end" type="date" defaultValue={show?.end} required />
        <Field
          label="Work-order last call"
          name="lastCall"
          type="date"
          defaultValue={show?.lastCall}
          hint="Optional — drives the last-call banner."
        />
      </div>

      <Field
        label="Tagline"
        name="tagline"
        defaultValue={show?.tagline}
        placeholder="Aug 20–30 · Kentucky Exposition Center"
        hint="Optional — shown under the show name."
      />

      <label className="block">
        <span className={LABEL} style={{ color: "#3A3A34" }}>
          Match keywords <span style={{ color: "#B23A3A" }}>*</span>
        </span>
        <textarea
          className={INPUT}
          style={{ ...INPUT_STYLE, minHeight: 64 }}
          name="keywords"
          defaultValue={show?.keywords.join(", ")}
          placeholder="ksf, kentucky state fair, state fair, wchs"
        />
        <span className="mt-1 block text-[11.5px]" style={{ color: "#8A8A82" }}>
          Comma-separated. A card joins this show when any keyword appears in its title or its
          &ldquo;Show/Event:&rdquo; field. Card matching updates on the next refresh (~15 min).
        </span>
      </label>

      {state.errors.length > 0 && (
        <ul className="rounded-lg px-3 py-2 text-[13px]" style={{ background: "#F4E4E4", color: "#B23A3A" }}>
          {state.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {state.ok && (
        <p className="rounded-lg px-3 py-2 text-[13px]" style={{ background: "#E7F6ED", color: "#12833B" }}>
          Saved.
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
          style={{ background: "#2563EB" }}
        >
          {pending ? "Saving…" : editing ? "Save changes" : "Add show"}
        </button>
      </div>
    </form>
  );
}

function DeleteForm({ show }: { show: ShowConfig }) {
  return (
    <form
      action={deleteShowAction}
      onSubmit={(e) => {
        if (!confirm(`Delete “${show.name}”? Its page will stop working.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="slug" value={show.slug} />
      <button
        type="submit"
        className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-semibold"
        style={{ borderColor: "#E3B9B9", color: "#B23A3A" }}
      >
        <Trash2 size={14} aria-hidden="true" /> Delete
      </button>
    </form>
  );
}

export function ShowManager({ shows }: { shows: ShowConfig[] }) {
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
            Manage show pages
          </h1>
          <p className="mt-0.5 text-[14px]" style={{ color: "#6A6A63" }}>
            Add, edit, or remove the countdown pages under <b>/shows</b>. Changes are live immediately.
          </p>
        </header>

        <details className={CARD} style={CARD_STYLE}>
          <summary className="flex cursor-pointer items-center gap-2 text-[15px] font-bold" style={{ color: "#131311" }}>
            <Plus size={16} aria-hidden="true" style={{ color: "#2563EB" }} /> Add a show
          </summary>
          <div className="mt-4">
            <ShowForm />
          </div>
        </details>

        {shows.length === 0 ? (
          <div className={CARD} style={CARD_STYLE}>
            <p className="text-[14px]" style={{ color: "#6A6A63" }}>
              No shows yet. Use &ldquo;Add a show&rdquo; above to create the first one.
            </p>
          </div>
        ) : (
          shows.map((show) => (
            <div key={show.slug} className={CARD} style={CARD_STYLE}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[17px] font-extrabold" style={{ color: "#131311" }}>
                    {show.name}
                  </h2>
                  <Link
                    href={`/shows/${show.slug}`}
                    className="mt-0.5 flex items-center gap-1.5 text-[12.5px] no-underline"
                    style={{ color: "#6A6A63" }}
                  >
                    <CalendarDays size={13} aria-hidden="true" /> /shows/{show.slug}
                  </Link>
                </div>
                <DeleteForm show={show} />
              </div>
              <ShowForm show={show} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
