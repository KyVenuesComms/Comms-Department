"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthed, MGR_COOKIE } from "@/lib/auth";
import { parseKeywords, type ShowConfig } from "@/lib/queue/shows";
import { deleteShow, saveShow } from "@/lib/queue/shows-store";

/** Result surfaced back to the editor form (via useActionState). */
export interface ShowFormState {
  ok: boolean;
  errors: string[];
}

/** Fail closed: only a signed-in manager may edit shows. */
async function requireManager(): Promise<void> {
  const store = await cookies();
  if (!isAuthed(store.get(MGR_COOKIE)?.value)) redirect("/manager");
}

function field(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

/** Repaint every page that reads the show list. */
function revalidateShows(slug: string, originalSlug?: string): void {
  revalidatePath("/manager/shows");
  revalidatePath("/shows");
  revalidatePath("/");
  revalidatePath(`/shows/${slug}`);
  if (originalSlug && originalSlug !== slug) revalidatePath(`/shows/${originalSlug}`);
}

/** Create or update a show from the editor form. */
export async function saveShowAction(_prev: ShowFormState, fd: FormData): Promise<ShowFormState> {
  await requireManager();

  const originalSlug = field(fd, "originalSlug");
  const show: ShowConfig = {
    slug: field(fd, "slug").toLowerCase(),
    name: field(fd, "name"),
    start: field(fd, "start"),
    end: field(fd, "end"),
    keywords: parseKeywords(field(fd, "keywords")),
  };
  const tagline = field(fd, "tagline");
  if (tagline) show.tagline = tagline;
  const lastCall = field(fd, "lastCall");
  if (lastCall) show.lastCall = lastCall;

  const res = await saveShow(show, originalSlug || undefined);
  if (!res.ok) return { ok: false, errors: res.errors };
  revalidateShows(show.slug, originalSlug || undefined);
  return { ok: true, errors: [] };
}

/** Delete a show; its page 404s afterward. */
export async function deleteShowAction(fd: FormData): Promise<void> {
  await requireManager();
  const slug = field(fd, "slug");
  if (slug) {
    await deleteShow(slug);
    revalidateShows(slug);
  }
  redirect("/manager/shows");
}
