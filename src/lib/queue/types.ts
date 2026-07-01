// Shared vocabulary for the queue. Same names everywhere (house rule).

/** The stages a department sees. "hidden" = never shown on the board. */
export type Status = "requested" | "in-progress" | "closed" | "hidden";

/** Project-type labels (closed set). */
export type ProjectType = "Print" | "Signage" | "Digital";

/** Attention-flag labels (closed set). Names match the Trello labels exactly. */
export type Flag =
  | "High Priority"
  | "Submitted Past Deadline"
  | "Waiting for Info";

/** A label as it comes back from the Trello API (only the field we use). */
export interface RawLabel {
  name: string;
}

/** A card as it comes back from the Trello API (only the fields we use). */
export interface RawCard {
  id: string;
  name: string;
  /** Name of the Trello list the card currently sits in. */
  listName: string;
  labels: RawLabel[];
}

/** A card after mapping — the shape the board renders. */
export interface Project {
  id: string;
  name: string;
  status: Status;
  /** Department label names. Empty = unassigned → shows under "All Departments". */
  departments: string[];
  flags: Flag[];
  type: ProjectType | null;
}
