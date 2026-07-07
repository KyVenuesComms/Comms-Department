// Pure mapping logic: Trello shapes -> the board's shapes. No I/O here.
import { defaultMapping, flagByLabel, statusByList, typeByLabel } from "./mapping";
import { parseDepartment } from "./departments";
import { matchShow, type ShowConfig } from "./shows";
import type { Flag, Project, ProjectType, RawCard, Status, TrelloMapping } from "./types";

/** Normalize a name for comparison: trim + lowercase. */
function norm(s: string): string {
  return s.trim().toLowerCase();
}

// Reverse lookups. Seeded from the built-in default; the snapshot build swaps
// in the stored mapping via setTrelloMapping() before mapping any cards.
const DEFAULT = defaultMapping();
let STATUS_BY_LIST = statusByList(DEFAULT);
let FLAG_BY_NORM = flagByLabel(DEFAULT);
let TYPE_BY_NORM = typeByLabel(DEFAULT);

/** Swap in the active Trello mapping (called once per snapshot build). */
export function setTrelloMapping(m: TrelloMapping): void {
  STATUS_BY_LIST = statusByList(m);
  FLAG_BY_NORM = flagByLabel(m);
  TYPE_BY_NORM = typeByLabel(m);
}

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
export function toProject(card: RawCard, shows?: ShowConfig[]): Project {
  const flags: Flag[] = [];
  let type: ProjectType | null = null;

  // Labels carry flags + type. Department now comes from the description.
  for (const label of card.labels) {
    const key = norm(label.name);
    const flag = FLAG_BY_NORM.get(key);
    const t = TYPE_BY_NORM.get(key);
    if (flag) flags.push(flag);
    else if (t) type = type ?? t;
  }

  const dept = parseDepartment(card.desc);

  return {
    id: card.id,
    name: card.name,
    status: statusForList(card.listName),
    departments: dept ? [dept] : [],
    flags,
    type,
    url: card.url,
    createdAt: cardCreatedAt(card.id),
    enteredStageAt: null,
    dueAt: card.due ?? null,
    dueComplete: card.dueComplete ?? false,
    assignee: card.assignee ?? null,
    show: matchShow(card.name, card.desc, shows),
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
