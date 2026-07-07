"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthed, MGR_COOKIE } from "@/lib/auth";
import { saveDepartments } from "@/lib/queue/departments-store";
import { parseAliases } from "@/lib/queue/mapping";
import { refreshQueue } from "@/lib/trello/snapshot";
import type { DepartmentConfig } from "@/lib/queue/types";

export interface DeptFormState {
  ok: boolean;
  errors: string[];
}

async function requireManager(): Promise<void> {
  const store = await cookies();
  if (!isAuthed(store.get(MGR_COOKIE)?.value)) redirect("/manager");
}

export async function saveDepartmentsAction(_prev: DeptFormState, fd: FormData): Promise<DeptFormState> {
  await requireManager();

  // The editor submits the whole list as one JSON field, so add/remove is robust.
  let rows: { name: string; aliases: string }[];
  try {
    rows = JSON.parse(String(fd.get("payload") ?? "[]"));
  } catch {
    return { ok: false, errors: ["Couldn't read the form — reload and try again."] };
  }

  const list: DepartmentConfig[] = rows
    .map((r) => ({ name: (r.name ?? "").trim(), aliases: parseAliases(r.aliases ?? "") }))
    .filter((d) => d.name);

  const res = await saveDepartments(list);
  if (!res.ok) return { ok: false, errors: res.errors };

  // Rebuild so the board filter + cockpit by-department reflect the change now.
  await refreshQueue().catch(() => {});
  revalidatePath("/manager/departments");
  revalidatePath("/");
  revalidatePath("/manager");
  return { ok: true, errors: [] };
}
