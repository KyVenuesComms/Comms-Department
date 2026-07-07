// Durable Trello→board mapping: reads/writes the editable rules in KV, falling
// back to the built-in default until an edit is saved. I/O lives here; the
// lookup/validation logic in ./mapping stays pure.
import "server-only";
import { readMappingRaw, writeMappingRaw } from "../store/store";
import { defaultMapping, validateMapping } from "./mapping";
import type { TrelloMapping } from "./types";

/** The live mapping — stored edits if any, else the built-in default. */
export async function getTrelloMapping(): Promise<TrelloMapping> {
  const stored = await readMappingRaw().catch(() => null);
  return stored ?? defaultMapping();
}

export interface SaveResult {
  ok: boolean;
  errors: string[];
}

/** Validate then persist a mapping. */
export async function saveTrelloMapping(mapping: TrelloMapping): Promise<SaveResult> {
  const errors = validateMapping(mapping);
  if (errors.length > 0) return { ok: false, errors };
  await writeMappingRaw(mapping);
  return { ok: true, errors: [] };
}
