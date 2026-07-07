// Durable leadership targets: reads/writes the editable thresholds in KV,
// falling back to the built-in defaults until an edit is saved.
import "server-only";
import { readTargetsRaw, writeTargetsRaw } from "../store/store";
import { TARGETS, validateTargets } from "./config";
import type { Targets } from "./types";

/** The live targets — stored edits if any, else the built-in defaults. */
export async function getTargets(): Promise<Targets> {
  const stored = await readTargetsRaw().catch(() => null);
  return stored ?? TARGETS;
}

export interface SaveResult {
  ok: boolean;
  errors: string[];
}

/** Validate (positive whole numbers) then persist targets. */
export async function saveTargets(targets: Targets): Promise<SaveResult> {
  const errors = validateTargets(targets);
  if (errors.length > 0) return { ok: false, errors };
  await writeTargetsRaw(targets);
  return { ok: true, errors: [] };
}
