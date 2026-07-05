import type { Project, QueueMetrics } from "../queue/types";

export interface QueueSnapshot {
  requested: Project[];
  inProgress: Project[];
  outForApproval: Project[];
  /** Closed jobs — searchable, not shown as a live column. */
  closed: Project[];
  /** Active work = requested + in progress + out for approval. The headline. */
  activeTotal: number;
  /** Computed board-wide numbers (turnaround, recently completed, per-dept). */
  metrics: QueueMetrics;
  /** When this data was read from Trello (ISO string). */
  updatedAt: string;
  /** True when Trello was unreachable and we're serving the last good copy. */
  stale: boolean;
}
