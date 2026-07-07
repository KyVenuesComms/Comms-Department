import { Building2, CalendarCog, ChevronRight, SlidersHorizontal, Target } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { ManagerLogin } from "@/features/cockpit/ManagerLogin";
import { MGR_COOKIE, isAuthed, managerConfigured } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TOOLS = [
  {
    href: "/manager/shows",
    Icon: CalendarCog,
    title: "Show pages",
    body: "Add, edit, or remove the countdown pages under /shows.",
  },
  {
    href: "/manager/mapping",
    Icon: SlidersHorizontal,
    title: "Trello mapping",
    body: "Which lists become which stage, and which labels count as flags/types.",
  },
  {
    href: "/manager/targets",
    Icon: Target,
    title: "Leadership targets",
    body: "The thresholds the cockpit grades against and alerts on.",
  },
  {
    href: "/manager/departments",
    Icon: Building2,
    title: "Departments",
    body: "The canonical department list and the aliases that normalize card text.",
  },
];

export default async function SettingsHub() {
  if (!managerConfigured()) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "#E7E7E2" }}>
        <div className="max-w-md rounded-2xl border bg-white px-6 py-5 text-center" style={{ borderColor: "#E4E4DF" }}>
          <p className="font-semibold" style={{ color: "#131311" }}>Not set up yet</p>
          <p className="mt-1 text-sm" style={{ color: "#6A6A63" }}>Set MANAGER_PASSWORD in the environment to manage settings.</p>
        </div>
      </div>
    );
  }
  const store = await cookies();
  if (!isAuthed(store.get(MGR_COOKIE)?.value)) {
    return <ManagerLogin />;
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-8" style={{ background: "#E7E7E2" }}>
      <div className="mx-auto flex max-w-[720px] flex-col gap-3">
        <header>
          <div className="text-[11px] font-bold uppercase tracking-[0.09em]" style={{ color: "#2563EB" }}>
            <Link href="/manager" className="no-underline" style={{ color: "#2563EB" }}>
              ← Leadership cockpit
            </Link>
          </div>
          <h1 className="mt-1 text-[28px] font-extrabold tracking-[-0.015em]" style={{ color: "#131311" }}>Manage</h1>
          <p className="mt-0.5 text-[14px]" style={{ color: "#6A6A63" }}>
            Everything that shapes what the board and cockpit show — no code, no deploy.
          </p>
        </header>

        {TOOLS.map(({ href, Icon, title, body }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 rounded-2xl border bg-white p-4 no-underline transition-transform hover:-translate-y-px sm:p-5"
            style={{ borderColor: "#E4E4DF" }}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "#EAF1FD" }}>
              <Icon size={20} aria-hidden="true" style={{ color: "#2563EB" }} />
            </span>
            <div className="flex-1">
              <div className="text-[16px] font-extrabold" style={{ color: "#131311" }}>{title}</div>
              <div className="mt-0.5 text-[13px]" style={{ color: "#6A6A63" }}>{body}</div>
            </div>
            <ChevronRight size={18} style={{ color: "#A0A099" }} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </div>
  );
}
