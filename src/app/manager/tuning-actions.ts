"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthed, MGR_COOKIE } from "@/lib/auth";
import { saveTuning } from "@/lib/queue/tuning-store";
import { refreshQueue } from "@/lib/trello/snapshot";
import type { Tuning } from "@/lib/queue/types";

export interface TuningFormState {
  ok: boolean;
  errors: string[];
}

const FIELDS: (keyof Tuning)[] = [
  "refreshMinutes",
  "turnaroundWindowDays",
  "turnaroundMinSamples",
  "turnaroundBufferDays",
  "recentlyCompletedDays",
  "recentlyCompletedMax",
  "trendWindowDays",
  "trendMinDays",
  "workloadBandPct",
];

async function requireManager(): Promise<void> {
  const store = await cookies();
  if (!isAuthed(store.get(MGR_COOKIE)?.value)) redirect("/manager");
}

export async function saveTuningAction(_prev: TuningFormState, fd: FormData): Promise<TuningFormState> {
  await requireManager();
  const tuning = {} as Tuning;
  for (const f of FIELDS) tuning[f] = Number(fd.get(f));

  const res = await saveTuning(tuning);
  if (!res.ok) return { ok: false, errors: res.errors };

  // Rebuild so metric windows + the refresh cadence take effect immediately.
  await refreshQueue().catch(() => {});
  revalidatePath("/manager/tuning");
  revalidatePath("/manager");
  revalidatePath("/");
  return { ok: true, errors: [] };
}
