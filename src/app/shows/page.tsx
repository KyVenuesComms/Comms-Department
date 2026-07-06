import { CalendarDays, ChevronRight } from "lucide-react";
import Link from "next/link";
import { lastCallStatus, SHOWS, showPhase } from "@/lib/queue/shows";
import { getQueueSnapshot } from "@/lib/trello/snapshot";

export const dynamic = "force-dynamic";

export default async function ShowsIndex() {
  let counts = new Map<string, number>();
  try {
    const s = await getQueueSnapshot();
    counts = new Map(
      SHOWS.map((show) => [
        show.slug,
        [...s.requested, ...s.inProgress, ...s.outForApproval].filter((p) => p.show === show.slug).length,
      ]),
    );
  } catch {
    // counts stay empty — page still renders
  }
  // Request-time clock for the countdown chips — this route is force-dynamic,
  // and the chips must work even when the Trello snapshot is unavailable.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();

  return (
    <div className="min-h-screen px-4 py-8 sm:px-8" style={{ background: "#E7E7E2" }}>
      <div className="mx-auto flex max-w-[720px] flex-col gap-3">
        <header>
          <div className="text-[11px] font-bold uppercase tracking-[0.09em]" style={{ color: "#2563EB" }}>
            <Link href="/" className="no-underline" style={{ color: "#2563EB" }}>Kentucky Venues Work Order Status</Link>
          </div>
          <h1 className="mt-1 text-[28px] font-extrabold tracking-[-0.015em]" style={{ color: "#131311" }}>Show pages</h1>
        </header>
        {SHOWS.map((show) => {
          const phase = showPhase(show, nowMs);
          const lastCall = lastCallStatus(show, nowMs);
          const label =
            phase.phase === "before"
              ? `${phase.days} days out`
              : phase.phase === "during"
                ? `LIVE — day ${phase.days}`
                : "wrapped";
          return (
            <Link
              key={show.slug}
              href={`/shows/${show.slug}`}
              className="flex items-center gap-3 rounded-2xl border bg-white p-4 no-underline transition-transform hover:-translate-y-px sm:p-5"
              style={{ borderColor: "#E4E4DF" }}
            >
              <div className="flex-1">
                <div className="text-[17px] font-extrabold" style={{ color: "#131311" }}>{show.name}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px]" style={{ color: "#6A6A63" }}>
                  <CalendarDays size={13} aria-hidden="true" /> {show.tagline ?? `${show.start} – ${show.end}`}
                </div>
                {lastCall && (
                  <div className="mt-1 text-[12px] font-semibold" style={{ color: lastCall.state === "open" ? "#B4670C" : "#B23A3A" }}>
                    {lastCall.state === "open"
                      ? `Work-order last call: ${lastCall.days} ${lastCall.days === 1 ? "day" : "days"} left`
                      : "Work-order last call closed"}
                  </div>
                )}
              </div>
              <span
                className="rounded-full px-3 py-1 text-[12.5px] font-bold"
                style={
                  phase.phase === "during"
                    ? { background: "#E7F6ED", color: "#12833B" }
                    : { background: "#EAF1FD", color: "#1D5FCB" }
                }
              >
                {label}
              </span>
              {counts.get(show.slug) !== undefined && (
                <span className="text-[12.5px] tabular-nums" style={{ color: "#8A8A82" }}>
                  {counts.get(show.slug)} open
                </span>
              )}
              <ChevronRight size={16} style={{ color: "#A0A099" }} aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
