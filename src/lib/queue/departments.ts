// The department lives in the card description ("Department: …"). This parses it
// and matches to the canonical list (the submission dropdown's options). Old
// cards are messy free-text (e.g. "Comm"); the dropdown makes new ones exact.

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

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

const NORM_TO_DEPT = new Map(DEPARTMENTS.map((d) => [norm(d), d]));

/** Match a raw department value to a canonical department, or null if unclear. */
export function matchDepartment(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = norm(value);
  if (!v) return null;
  const exact = NORM_TO_DEPT.get(v);
  if (exact) return exact;
  // Prefix either direction: "comm" → Communications, "expositions" → Expositions Division.
  for (const d of DEPARTMENTS) {
    const dn = norm(d);
    if (dn.startsWith(v) || v.startsWith(dn)) return d;
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
