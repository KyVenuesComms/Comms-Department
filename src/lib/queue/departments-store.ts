// Durable canonical departments: reads/writes the editable list in KV, falling
// back to the built-in default until an edit is saved. I/O lives here; the
// matching/validation logic in ./departments stays pure.
import "server-only";
import { readDepartmentsRaw, writeDepartmentsRaw } from "../store/store";
import { defaultDepartments, validateDepartments } from "./departments";
import type { DepartmentConfig } from "./types";

/** The live department list — stored edits if any, else the built-in default. */
export async function getDepartments(): Promise<DepartmentConfig[]> {
  const stored = await readDepartmentsRaw().catch(() => null);
  return stored ?? defaultDepartments();
}

export interface SaveResult {
  ok: boolean;
  errors: string[];
}

/** Validate then persist the department list. */
export async function saveDepartments(list: DepartmentConfig[]): Promise<SaveResult> {
  const errors = validateDepartments(list);
  if (errors.length > 0) return { ok: false, errors };
  await writeDepartmentsRaw(list);
  return { ok: true, errors: [] };
}
