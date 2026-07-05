// Shared vocabulary for the queue. Same names everywhere (house rule).

/** The stages a department sees. "hidden" = never shown on the board. */
export type Status =
  | "requested"
  | "in-progress"
  | "out-for-approval"
  | "closed"
  | "hidden";

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
  /** Link to the card in Trello. */
  url: string;
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
  /** Link to the card in Trello. */
  url: string;
  /** When the card was created (≈ added to the queue). Derived from the id. */
  createdAt: string;
  /** When the card entered its current stage. Null if unknown (older than history). */
  enteredStageAt: string | null;
}

/** A single list-move from Trello's action history. */
export interface Move {
  cardId: string;
  cardName: string;
  /** Name of the list the card moved into. */
  toList: string;
  /** ISO timestamp of the move. */
  at: string;
}

/** One day's workload counts, banked by the scheduled refresh. */
export interface TrendPoint {
  /** YYYY-MM-DD (Eastern). */
  date: string;
  active: number;
  requested: number;
  inProgress: number;
  outForApproval: number;
}

/** How today's active load compares to a typical recent day. */
export interface WorkloadContext {
  level: "busier" | "typical" | "quieter";
  /** Percent above/below the typical (median) day. */
  pct: number;
  /** How many prior days the comparison is based on. */
  sampleDays: number;
}

/** Computed, board-wide numbers. Built once per refresh, never in the UI. */
export interface QueueMetrics {
  /** Typical time from request to "out for approval," with buffer. Null if too few samples. */
  turnaround: {
    quotedDays: number;
    medianDays: number;
    sampleSize: number;
  } | null;
  /** Jobs that reached Closed recently, newest first. */
  recentlyCompleted: { id: string; name: string; at: string }[];
  /** Per-department stage counts (keyed by department label). */
  perDepartment: Record<
    string,
    { requested: number; inProgress: number; outForApproval: number; total: number }
  >;
}
