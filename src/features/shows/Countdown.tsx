"use client";

import { useEffect, useState } from "react";

// Live countdown clock for a show page. Days/hours/minutes/seconds until doors,
// day-counter while the show runs, "wrapped" after.
export function Countdown({ startIso, endIso }: { startIso: string; endIso: string }) {
  // Render a stable placeholder until mounted so server/client HTML match.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);

  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();

  if (now === null) {
    return <div className="h-[76px]" aria-hidden="true" />;
  }

  if (now >= start && now <= end) {
    const day = Math.floor((now - start) / 86_400_000) + 1;
    const total = Math.max(1, Math.round((end - start) / 86_400_000));
    return (
      <div className="flex items-baseline gap-3">
        <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[15px] font-extrabold text-white" style={{ background: "#17A34A" }}>
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "#fff" }} />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: "#fff" }} />
          </span>
          LIVE — Day {day} of {total}
        </span>
      </div>
    );
  }

  if (now > end) {
    return (
      <span className="rounded-full px-4 py-1.5 text-[15px] font-bold" style={{ background: "#F1F1EC", color: "#5F5E5A" }}>
        That&rsquo;s a wrap — see you next year
      </span>
    );
  }

  const left = start - now;
  const d = Math.floor(left / 86_400_000);
  const h = Math.floor((left % 86_400_000) / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  const cells = [
    { v: d, l: "days" },
    { v: h, l: "hrs" },
    { v: m, l: "min" },
    { v: s, l: "sec" },
  ];
  return (
    <div className="flex items-end gap-2.5" role="timer" aria-label={`${d} days ${h} hours ${m} minutes until doors open`}>
      {cells.map((c) => (
        <div key={c.l} className="min-w-[64px] rounded-xl bg-white px-3 py-2 text-center" style={{ border: "1px solid #E4E4DF" }}>
          <div className="text-[28px] font-extrabold leading-none tabular-nums" style={{ color: "#131311" }}>
            {String(c.v).padStart(2, "0")}
          </div>
          <div className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.08em]" style={{ color: "#8A8A82" }}>{c.l}</div>
        </div>
      ))}
      <span className="pb-2 text-[13px] font-semibold" style={{ color: "#6A6A63" }}>until doors open</span>
    </div>
  );
}
