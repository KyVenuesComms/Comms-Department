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

export function showBySlug(slug: string, shows: ShowConfig[] = SHOWS): ShowConfig | null {
  return shows.find((s) => s.slug === slug) ?? null;
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
  shows: ShowConfig[] = SHOWS,
): string | null {
  const fields = [name, parseShowEvent(desc) ?? ""].map((s) => s.toLowerCase());
  for (const show of shows) {
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

// ── CMS helpers (pure) — used by the /manager show editor ──────────────────

/** Valid URL slug: lowercase words joined by single hyphens. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A strict YYYY-MM-DD that is also a real calendar date. */
function isYmd(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00-04:00`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Turn a comma/newline-separated string into clean, de-duped lowercase keywords. */
export function parseKeywords(input: string): string[] {
  const seen = new Set<string>();
  for (const raw of input.split(/[,\n]/)) {
    const k = raw.trim().toLowerCase();
    if (k) seen.add(k);
  }
  return [...seen];
}

/**
 * Validate a show for the editor. Returns a list of plain-English problems —
 * empty means it's good to save. `others` is the rest of the list (for slug
 * uniqueness); pass the full list minus the one being edited.
 */
export function validateShow(show: ShowConfig, others: ShowConfig[]): string[] {
  const errors: string[] = [];
  if (!SLUG_RE.test(show.slug)) {
    errors.push("Slug must be lowercase letters, numbers, and single hyphens (e.g. kentucky-state-fair).");
  } else if (others.some((s) => s.slug === show.slug)) {
    errors.push(`Another show already uses the slug “${show.slug}”.`);
  }
  if (!show.name.trim()) errors.push("Name is required.");
  if (!isYmd(show.start)) errors.push("Start date must be a real date in YYYY-MM-DD form.");
  if (!isYmd(show.end)) errors.push("End date must be a real date in YYYY-MM-DD form.");
  if (isYmd(show.start) && isYmd(show.end) && show.end < show.start) {
    errors.push("End date can’t be before the start date.");
  }
  if (show.lastCall && !isYmd(show.lastCall)) {
    errors.push("Last-call date must be a real date in YYYY-MM-DD form (or left blank).");
  }
  if (show.keywords.length === 0) {
    errors.push("Add at least one keyword so cards can match this show.");
  }
  return errors;
}

/** Insert or replace a show by slug. `originalSlug` handles renames. */
export function upsertShow(
  list: ShowConfig[],
  show: ShowConfig,
  originalSlug?: string,
): ShowConfig[] {
  const key = originalSlug ?? show.slug;
  const idx = list.findIndex((s) => s.slug === key);
  if (idx === -1) return [...list, show];
  const next = [...list];
  next[idx] = show;
  return next;
}

/** Drop a show by slug. */
export function removeShow(list: ShowConfig[], slug: string): ShowConfig[] {
  return list.filter((s) => s.slug !== slug);
}
