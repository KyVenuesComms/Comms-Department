// Durable refresh + metric tuning: reads/writes the editable config in KV,
// falling back to the built-in defaults until an edit is saved.
import "server-only";
import { readTuningRaw, writeTuningRaw } from "../store/store";
import { defaultTuning, validateTuning } from "./config";
import type { Tuning } from "./types";

/** The live tuning — stored edits if any, else the built-in defaults. Merged
 *  over the defaults so a config saved before a new field was added stays whole. */
export async function getTuning(): Promise<Tuning> {
  const stored = await readTuningRaw().catch(() => null);
  return stored ? { ...defaultTuning(), ...stored } : defaultTuning();
}

export interface SaveResult {
  ok: boolean;
  errors: string[];
}

/** Validate then persist tuning. */
export async function saveTuning(tuning: Tuning): Promise<SaveResult> {
  const errors = validateTuning(tuning);
  if (errors.length > 0) return { ok: false, errors };
  await writeTuningRaw(tuning);
  return { ok: true, errors: [] };
}
