// Durable shows config: reads/writes the editable show list in the KV store,
// falling back to the built-in SHOWS seed until an edit is saved. All I/O lives
// here; the matching/validation logic in ./shows stays pure.
import "server-only";
import { readShowsRaw, writeShowsRaw } from "../store/store";
import { removeShow, SHOWS, upsertShow, validateShow, type ShowConfig } from "./shows";

/** The live show list — stored edits if any, else the built-in seed. */
export async function getShows(): Promise<ShowConfig[]> {
  const stored = await readShowsRaw().catch(() => null);
  return stored ?? SHOWS;
}

export interface SaveResult {
  ok: boolean;
  errors: string[];
}

/**
 * Create or update a show. `originalSlug` identifies the row being edited (so a
 * rename works); omit it to add a new show. Validates before writing.
 */
export async function saveShow(show: ShowConfig, originalSlug?: string): Promise<SaveResult> {
  const list = await getShows();
  const others = list.filter((s) => s.slug !== (originalSlug ?? show.slug));
  const errors = validateShow(show, others);
  if (errors.length > 0) return { ok: false, errors };
  await writeShowsRaw(upsertShow(list, show, originalSlug));
  return { ok: true, errors: [] };
}

/** Delete a show by slug. Its page 404s once it's gone. */
export async function deleteShow(slug: string): Promise<void> {
  const list = await getShows();
  await writeShowsRaw(removeShow(list, slug));
}
