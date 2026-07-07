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

/** The stages a Trello list can map to (everything else is hidden). */
export type ListStatus = Exclude<Status, "hidden">;

/** Leadership thresholds the cockpit grades against and alerts on. Editable in KV. */
export interface Targets {
  /** Quoted turnaround should stay at or under this many days. */
  turnaroundDays: number;
  /** Overdue active projects should stay under this. */
  overdue: number;
  /** Alert when the backlog grows faster than this per week (avg). */
  weeklyNetGrowth: number;
}

/** One canonical department + the free-text aliases that normalize to it. Editable in KV. */
export interface DepartmentConfig {
  name: string;
  /** Extra lowercase strings in the card's "Department:" field that map here. */
  aliases: string[];
}

/** Editable rules for how Trello converts onto the board. Stored in KV. */
export interface TrelloMapping {
  /** Each Trello list → the stage it becomes. Lists not here are hidden. */
  lists: { list: string; status: ListStatus }[];
  /** Trello label texts that count as each flag (lowercase). */
  flagAliases: Record<Flag, string[]>;
  /** Trello label texts that count as each project type (lowercase). */
  typeAliases: Record<ProjectType, string[]>;
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
  /** Raw card description (parsed for department, then discarded). */
  desc?: string;
  /** Trello due date (ISO) and whether it's marked complete. */
  due?: string | null;
  dueComplete?: boolean;
  /** Primary assigned team member's name, if any. */
  assignee?: string | null;
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
  /** Trello due date (ISO), and whether it's checked off. */
  dueAt: string | null;
  dueComplete: boolean;
  /** Assigned team member's name, or null. */
  assignee: string | null;
  /** Show slug this card belongs to (matched by name/Show-Event), or null. */
  show: string | null;
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
  /** Risk metrics (added later — absent on older banked points). */
  overdue?: number;
  waitingForInfo?: number;
}

/** How today's active load compares to a typical recent day. */
export interface WorkloadContext {
  level: "busier" | "typical" | "quieter";
  /** Percent above/below the typical (median) day. */
  pct: number;
  /** How many prior days the comparison is based on. */
  sampleDays: number;
}

/** Leadership cockpit numbers — computed once per refresh, read by /manager. */
export interface CockpitData {
  /** Intake vs output this week — the "are we keeping up?" signal.
   *  prev* = the week before, for Shopify-style vs-last-week deltas. */
  netFlow: {
    intakeWeek: number;
    shippedWeek: number;
    net: number;
    prevIntakeWeek: number;
    prevShippedWeek: number;
  };
  /** Oldest active work (by time in current stage) — the attention list. */
  agedItems: {
    name: string;
    department: string;
    stage: string;
    days: number;
    assignee: string | null;
    /** Open due date (ISO), if one is set and not checked off. */
    dueAt: string | null;
  }[];
  /** Active work due within the next 10 days, soonest first. */
  dueSoon: {
    name: string;
    department: string;
    stage: string;
    dueInDays: number;
    dueAt: string;
    assignee: string | null;
  }[];
  /** New requests per week, oldest → newest (same window as shippedPerWeek). */
  intakePerWeek: number[];
  overdue: number;
  dueThisWeek: number;
  waitingForInfo: number;
  byDepartment: { name: string; active: number; newThisWeek: number }[];
  byAssignee: { name: string; active: number }[];
  /** Closed per week, oldest → newest (last 6 weeks). */
  shippedPerWeek: number[];
  workMix: { Print: number; Signage: number; Digital: number };
  /** Grove's limiting step: the stage with the most aged work, or null. */
  bottleneck: { stage: string; reason: string } | null;
  /** The single highest-leverage move right now, in plain English. */
  leverage: string;
  /** Completed-work speed spread: "85% finish within p85 days". Null if thin. */
  cycleTime: { p50: number; p85: number; sampleSize: number } | null;
  /** Cards bounced backward from approval — first-time-right quality. */
  rework: { bounced: number; sample: number; pct: number } | null;
  /** Departments whose requests are stuck waiting on info (top offenders). */
  missingInfoByDept: { name: string; waiting: number; active: number }[];
  /** Backlog projection at the recent average net flow. */
  forecast: {
    weeklyNet: number;
    inFourWeeks: number;
    /** History-based seasonal read (closed + archived cards), when solid. */
    seasonal: {
      /** % intake change history predicts for the next 4 weeks vs the last 4. */
      pctChange: number;
      /** Expected requests in the next 4 weeks (recent intake × ramp ratio). */
      expectedIntake: number;
      /** Intake seen in the last 4 weeks. */
      recentIntake: number;
      /** Seasonally-adjusted active total in 4 weeks. */
      inFourWeeks: number;
      /** How many prior years the ratio is drawn from. */
      years: number;
    } | null;
  };
  /** Intake by weekday (Mon..Sun), last 8 weeks. */
  intakeByDay: number[];
  /** Active work per stage bucketed by age: [0–7, 8–14, 15–30, 30+] days. */
  agingBuckets: { stage: string; buckets: [number, number, number, number] }[];
  /** Avg days spent per stage, from recently observed stage transitions. */
  stageTime: { stage: string; avgDays: number; sample: number }[];
  /** Triggered threshold alerts (vs targets), plain English. */
  alerts: string[];
  /** The thresholds these numbers were graded against (for the UI's RAG + labels). */
  targets: Targets;
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
