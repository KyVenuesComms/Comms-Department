"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthed, MGR_COOKIE } from "@/lib/auth";
import { saveTargets } from "@/lib/queue/targets-store";
import { refreshQueue } from "@/lib/trello/snapshot";
import type { Targets } from "@/lib/queue/types";

export interface TargetsFormState {
  ok: boolean;
  errors: string[];
}

async function requireManager(): Promise<void> {
  const store = await cookies();
  if (!isAuthed(store.get(MGR_COOKIE)?.value)) redirect("/manager");
}

export async function saveTargetsAction(_prev: TargetsFormState, fd: FormData): Promise<TargetsFormState> {
  await requireManager();
  const targets: Targets = {
    turnaroundDays: Number(fd.get("turnaroundDays")),
    overdue: Number(fd.get("overdue")),
    weeklyNetGrowth: Number(fd.get("weeklyNetGrowth")),
  };
  const res = await saveTargets(targets);
  if (!res.ok) return { ok: false, errors: res.errors };

  // Rebuild so the cockpit's RAG + alerts reflect the new targets immediately.
  await refreshQueue().catch(() => {});
  revalidatePath("/manager");
  revalidatePath("/manager/targets");
  return { ok: true, errors: [] };
}
