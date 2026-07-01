// Pure mapping logic: Trello shapes -> the board's shapes. No I/O here.
import {
  DEPARTMENT_LABELS,
  FLAG_LABELS,
  LISTS_BY_STATUS,
  TYPE_LABELS,
} from "./config";
import type { Flag, Project, ProjectType, RawCard, Status } from "./types";

/** Normalize a name for comparison: trim + lowercase. */
function norm(s: string): string {
  return s.trim().toLowerCase();
}

// Reverse lookups, built once from the config.
const STATUS_BY_LIST = new Map<string, Status>();
for (const [status, lists] of Object.entries(LISTS_BY_STATUS)) {
  for (const list of lists) STATUS_BY_LIST.set(norm(list), status as Status);
}
const FLAG_BY_NORM = new Map<string, Flag>(FLAG_LABELS.map((f) => [norm(f), f]));
const TYPE_BY_NORM = new Map<string, ProjectType>(
  TYPE_LABELS.map((t) => [norm(t), t]),
);
const DEPARTMENT_BY_NORM = new Map<string, string>(
  DEPARTMENT_LABELS.map((d) => [norm(d), d]),
);

/** Which status a Trello list maps to. Unknown lists are hidden by default. */
export function statusForList(listName: string): Status {
  return STATUS_BY_LIST.get(norm(listName)) ?? "hidden";
}

/** A Trello card's creation time is encoded in the first 8 hex chars of its id. */
export function cardCreatedAt(id: string): string {
  const seconds = parseInt(id.substring(0, 8), 16);
  return new Date(seconds * 1000).toISOString();
}

/** Turn a raw Trello card into a mapped Project. */
export function toProject(card: RawCard): Project {
  const flags: Flag[] = [];
  const departments: string[] = [];
  let type: ProjectType | null = null;

  for (const label of card.labels) {
    const key = norm(label.name);
    const flag = FLAG_BY_NORM.get(key);
    const t = TYPE_BY_NORM.get(key);
    const dept = DEPARTMENT_BY_NORM.get(key);
    if (flag) {
      flags.push(flag);
    } else if (t) {
      type = type ?? t;
    } else if (dept) {
      departments.push(dept);
    }
    // Any other label (people, vendors, events, categories) is ignored.
  }

  return {
    id: card.id,
    name: card.name,
    status: statusForList(card.listName),
    departments,
    flags,
    type,
    url: card.url,
    createdAt: cardCreatedAt(card.id),
    enteredStageAt: null,
  };
}

/**
 * Priority score for ordering within a column; higher sorts first.
 * High-Priority floats up, Waiting-for-Info sinks, Print/Signage edge out
 * Digital, and Submitted-Past-Deadline is neutral (never reorders).
 */
export function priorityScore(p: Project): number {
  let score = 0;
  if (p.flags.includes("High Priority")) score += 3;
  if (p.flags.includes("Waiting for Info")) score -= 3;
  if (p.type === "Print" || p.type === "Signage") score += 0.5;
  return score;
}

/** Sort projects by priority. Ties keep their original (Trello) order. */
export function sortProjects(projects: Project[]): Project[] {
  return projects
    .map((p, i) => [p, i] as const)
    .sort((a, b) => priorityScore(b[0]) - priorityScore(a[0]) || a[1] - b[1])
    .map(([p]) => p);
}
