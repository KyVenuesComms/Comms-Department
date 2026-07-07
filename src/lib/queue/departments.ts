// The department lives in the card description ("Department: …"). This parses it
// and matches to the canonical list (the submission dropdown's options). Old
// cards are messy free-text (e.g. "Comm"); the dropdown makes new ones exact.
// The canonical list + aliases are editable via /manager (hydrated per build).
import type { DepartmentConfig } from "./types";

/** The built-in canonical departments — the default until an edit is saved. */
export const DEPARTMENTS = [
  "Communications",
  "Event Services - Access Control",
  "Event Services - KEC Event Coordination",
  "Event Services - KICC Event Coordination",
  "Event Services - Ticket Office",
  "Event Services - Venue Services",
  "Executive Office",
  "Expositions Division",
  "Finance",
  "Human Resources",
  "Information Technologies",
  "Legal",
  "Operations - KEC",
  "Operations - KICC",
  "Sales - KEC",
  "Sales - KICC",
  "Security - KEC",
  "Security - KICC",
] as const;

/** The built-in list as editable configs (no extra aliases by default). */
export function defaultDepartments(): DepartmentConfig[] {
  return DEPARTMENTS.map((name) => ({ name, aliases: [] }));
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// Active list + reverse lookup. Seeded from the built-in default; the snapshot
// build swaps in the stored list via setDepartments() before mapping cards.
let DEPT_LIST: DepartmentConfig[] = defaultDepartments();
let NORM_TO_DEPT = buildLookup(DEPT_LIST);

function buildLookup(list: DepartmentConfig[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const d of list) {
    map.set(norm(d.name), d.name);
    for (const a of d.aliases) map.set(norm(a), d.name);
  }
  return map;
}

/** Swap in the active department list (called once per snapshot build). */
export function setDepartments(list: DepartmentConfig[]): void {
  DEPT_LIST = list;
  NORM_TO_DEPT = buildLookup(list);
}

/** The active canonical names, in order — feeds the board's filter dropdown. */
export function departmentNames(): string[] {
  return DEPT_LIST.map((d) => d.name);
}

/** Match a raw department value to a canonical department, or null if unclear. */
export function matchDepartment(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = norm(value);
  if (!v) return null;
  const exact = NORM_TO_DEPT.get(v);
  if (exact) return exact;
  // Prefix either direction: "comm" → Communications, "expositions" → Expositions Division.
  for (const d of DEPT_LIST) {
    const dn = norm(d.name);
    if (dn.startsWith(v) || v.startsWith(dn)) return d.name;
  }
  return null;
}

/** Pull the "Department:" value out of a Trello card description. */
export function parseDepartment(desc: string | null | undefined): string | null {
  if (!desc) return null;
  // "Department:" then the next non-empty line (value may be on the same or next line).
  const m = desc.match(/Department:[^\S\n]*\n*[^\S\n]*([^\n]+)/i);
  return matchDepartment(m?.[1]?.trim() ?? null);
}

/** Plain-English problems with a department list — empty means good to save. */
export function validateDepartments(list: DepartmentConfig[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const d of list) {
    if (!d.name.trim()) {
      errors.push("Every department needs a name.");
      continue;
    }
    const key = norm(d.name);
    if (seen.has(key)) errors.push(`“${d.name}” is listed more than once.`);
    seen.add(key);
  }
  return errors;
}
