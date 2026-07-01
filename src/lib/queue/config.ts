// The single source of truth for how Trello maps onto the board.
// Change a Trello list name here (one place) and the whole app follows.
import type { Flag, ProjectType, Status } from "./types";

/**
 * Trello list names grouped by the status a department sees.
 * Any list NOT listed here maps to "hidden" by default — so internal lists
 * (Sent to Printer, GPS Ownership, On Hold, or any brand-new list) never leak.
 */
export const LISTS_BY_STATUS: Record<Exclude<Status, "hidden">, string[]> = {
  requested: [
    "Work Order Queue",
    "2026 KSF & WCHS",
    "KSF Merch Store",
    "Jansen Story",
    "Outsourced",
    "Up Next",
  ],
  "in-progress": ["In Progress", "Department Review"],
  closed: ["Closed Jobs"],
};

/** Attention-flag labels (closed set) — everything here renders as a badge. */
export const FLAG_LABELS: Flag[] = [
  "High-Priority",
  "Submitted Past Deadline",
  "Waiting for Info",
];

/** Project-type labels (closed set). Any other label is treated as a department. */
export const TYPE_LABELS: ProjectType[] = ["Print", "Signage", "Digital"];
