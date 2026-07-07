// Pure logic for the Trello→board mapping: the built-in default (seed), the
// lookup tables the mapper reads, and validation. No I/O — the store layer
// (mapping-store.ts) and the mapper (map.ts) consume these.
import { FLAG_LABELS, LISTS_BY_STATUS, TYPE_LABELS } from "./config";
import type { Flag, ListStatus, ProjectType, Status, TrelloMapping } from "./types";

/** The four stages a list can feed, in flow order. */
export const LIST_STATUSES: ListStatus[] = [
  "requested",
  "in-progress",
  "out-for-approval",
  "closed",
];

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** The built-in mapping — today's hardcoded config, used until an edit is saved. */
export function defaultMapping(): TrelloMapping {
  const lists: TrelloMapping["lists"] = [];
  for (const status of LIST_STATUSES) {
    for (const list of LISTS_BY_STATUS[status]) lists.push({ list, status });
  }
  const flagAliases = Object.fromEntries(
    FLAG_LABELS.map((f) => [f, [f.toLowerCase()]]),
  ) as Record<Flag, string[]>;
  const typeAliases = Object.fromEntries(
    TYPE_LABELS.map((t) => [t, [t.toLowerCase()]]),
  ) as Record<ProjectType, string[]>;
  return { lists, flagAliases, typeAliases };
}

/** Split a comma/newline-separated string into clean, de-duped lowercase aliases. */
export function parseAliases(input: string): string[] {
  const seen = new Set<string>();
  for (const raw of input.split(/[,\n]/)) {
    const a = raw.trim().toLowerCase();
    if (a) seen.add(a);
  }
  return [...seen];
}

/** Normalized-list-name → status. Lists absent here fall through to "hidden". */
export function statusByList(m: TrelloMapping): Map<string, Status> {
  const map = new Map<string, Status>();
  for (const { list, status } of m.lists) map.set(norm(list), status);
  return map;
}

/** Normalized-label-text → flag. */
export function flagByLabel(m: TrelloMapping): Map<string, Flag> {
  const map = new Map<string, Flag>();
  for (const flag of Object.keys(m.flagAliases) as Flag[]) {
    for (const alias of m.flagAliases[flag]) map.set(norm(alias), flag);
  }
  return map;
}

/** Normalized-label-text → project type. */
export function typeByLabel(m: TrelloMapping): Map<string, ProjectType> {
  const map = new Map<string, ProjectType>();
  for (const type of Object.keys(m.typeAliases) as ProjectType[]) {
    for (const alias of m.typeAliases[type]) map.set(norm(alias), type);
  }
  return map;
}

/** Plain-English problems with a mapping — empty means good to save. */
export function validateMapping(m: TrelloMapping): string[] {
  const errors: string[] = [];
  const valid = new Set<string>(LIST_STATUSES);
  const seen = new Set<string>();
  for (const { list, status } of m.lists) {
    if (!valid.has(status)) errors.push(`“${list}” has an unknown stage.`);
    const key = norm(list);
    if (seen.has(key)) errors.push(`“${list}” is mapped more than once.`);
    seen.add(key);
  }
  return errors;
}
