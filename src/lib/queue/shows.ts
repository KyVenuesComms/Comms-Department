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
}

export const SHOWS: ShowConfig[] = [
  {
    slug: "kentucky-state-fair",
    name: "Kentucky State Fair",
    start: "2026-08-20",
    end: "2026-08-30",
    keywords: ["ksf", "kentucky state fair", "state fair"],
    tagline: "Aug 20–30 · Kentucky Exposition Center",
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
