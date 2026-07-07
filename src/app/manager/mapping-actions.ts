"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthed, MGR_COOKIE } from "@/lib/auth";
import { defaultMapping, LIST_STATUSES, parseAliases } from "@/lib/queue/mapping";
import { saveTrelloMapping } from "@/lib/queue/mapping-store";
import { refreshQueue } from "@/lib/trello/snapshot";
import type { Flag, ListStatus, ProjectType, TrelloMapping } from "@/lib/queue/types";

/** Result surfaced back to the editor form (via useActionState). */
export interface MappingFormState {
  ok: boolean;
  errors: string[];
}

/** Fail closed: only a signed-in manager may edit the mapping. */
async function requireManager(): Promise<void> {
  const store = await cookies();
  if (!isAuthed(store.get(MGR_COOKIE)?.value)) redirect("/manager");
}

export async function saveMappingAction(_prev: MappingFormState, fd: FormData): Promise<MappingFormState> {
  await requireManager();
  const def = defaultMapping();
  const valid = new Set<string>(LIST_STATUSES);

  // List rows arrive as `list:<name>` = <status>. "hidden" (or anything not a
  // real stage) is simply omitted — that IS hidden, and keeps internal lists off
  // the board by default.
  const lists: TrelloMapping["lists"] = [];
  for (const [key, val] of fd.entries()) {
    if (!key.startsWith("list:")) continue;
    const status = String(val);
    if (valid.has(status)) lists.push({ list: key.slice(5), status: status as ListStatus });
  }

  const flagAliases = {} as Record<Flag, string[]>;
  for (const flag of Object.keys(def.flagAliases) as Flag[]) {
    flagAliases[flag] = parseAliases(String(fd.get(`flag:${flag}`) ?? ""));
  }
  const typeAliases = {} as Record<ProjectType, string[]>;
  for (const type of Object.keys(def.typeAliases) as ProjectType[]) {
    typeAliases[type] = parseAliases(String(fd.get(`type:${type}`) ?? ""));
  }

  const res = await saveTrelloMapping({ lists, flagAliases, typeAliases });
  if (!res.ok) return { ok: false, errors: res.errors };

  // Rebuild now so the change is visible immediately; if Trello is momentarily
  // down the mapping is still saved and applies on the next refresh.
  await refreshQueue().catch(() => {});
  revalidatePath("/manager/mapping");
  revalidatePath("/");
  return { ok: true, errors: [] };
}
