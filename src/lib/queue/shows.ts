// Show/event pages: which shows exist and how cards match to them. One home —
// add a show here and its page, board chip, and stats all light up.

export interface ShowConfig {
  /** URL slug: /shows/<slug> */
  slug: string;
  name: string;
  /** First and last day of the show (YYYY-MM-DD, local/Eastern). */
  start: string;
  end: string;
  /** Lowercase keywords matched against card names + the "Show/Event:" field. */
  keywords: string[];
  /** Short tagline for the show page header. */
  tagline?: string;
  /** Last day to submit work orders for this show (YYYY-MM-DD, Eastern). */
  lastCall?: string;
}

export const SHOWS: ShowConfig[] = [
  {
    slug: "kentucky-state-fair",
    name: "Kentucky State Fair & WCHS",
    start: "2026-08-20",
    end: "2026-08-30",
    lastCall: "2026-06-26",
    keywords: [
      "ksf",
      "kentucky state fair",
      "state fair",
      "wchs",
      "world's championship horse show",
      "world championship horse show",
    ],
    tagline: "Aug 20–30 · Kentucky Exposition Center · with the World's Championship Horse Show",
  },
];

export function showBySlug(slug: string): ShowConfig | null {
  return SHOWS.find((s) => s.slug === slug) ?? null;
}

/** Pull the "Show/Event:" value out of a card description, if present. */
export function parseShowEvent(desc: string | null | undefined): string | null {
  if (!desc) return null;
  const m = desc.match(/Show\/Event:[^\S\n]*\n*[^\S\n]*([^\n]+)/i);
  return m?.[1]?.trim() ?? null;
}

/** Does this keyword appear as a word (not inside another word)? */
function hasKeyword(haystack: string, keyword: string): boolean {
  const esc = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, "i").test(haystack);
}

/** Match a card to a show slug via its name or Show/Event field, else null. */
export function matchShow(
  name: string,
  desc?: string | null,
): string | null {
  const fields = [name, parseShowEvent(desc) ?? ""].map((s) => s.toLowerCase());
  for (const show of SHOWS) {
    for (const field of fields) {
      if (!field) continue;
      if (show.keywords.some((k) => hasKeyword(field, k))) return show.slug;
    }
  }
  return null;
}

/** Countdown phase for a show at a given time. */
export function showPhase(
  show: ShowConfig,
  nowMs: number,
): { phase: "before" | "during" | "after"; days: number } {
  const start = new Date(`${show.start}T00:00:00-04:00`).getTime();
  const endExclusive = new Date(`${show.end}T23:59:59-04:00`).getTime();
  if (nowMs < start) {
    return { phase: "before", days: Math.ceil((start - nowMs) / 86_400_000) };
  }
  if (nowMs <= endExclusive) {
    return {
      phase: "during",
      days: Math.floor((nowMs - start) / 86_400_000) + 1,
    };
  }
  return { phase: "after", days: 0 };
}

/**
 * Work-order last-call status for a show. `open` before the cutoff (days = days
 * left), `passed` after (days = days since). Null if the show has no last call.
 */
export function lastCallStatus(
  show: ShowConfig,
  nowMs: number,
): { state: "open" | "passed"; days: number; date: string } | null {
  if (!show.lastCall) return null;
  const cutoff = new Date(`${show.lastCall}T23:59:59-04:00`).getTime();
  if (nowMs <= cutoff) {
    return { state: "open", days: Math.ceil((cutoff - nowMs) / 86_400_000), date: show.lastCall };
  }
  return { state: "passed", days: Math.floor((nowMs - cutoff) / 86_400_000), date: show.lastCall };
}
