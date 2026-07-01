import { CircleCheck, Eye, Inbox, Wrench, type LucideIcon } from "lucide-react";
import type { Status } from "@/lib/queue/types";

export interface StageMeta {
  label: string;
  Icon: LucideIcon;
  /** Strong accent — icon square fill, column title, count pill text. */
  accent: string;
  /** Darker text variant of the accent. */
  darkText: string;
  /** Soft tint — column header bar background. */
  tint: string;
  /** Stat-readout dot color. */
  dot: string;
  /** Card meta date lead-in for this stage. */
  dateVerb: string;
}

export const STAGE_META: Record<Exclude<Status, "hidden">, StageMeta> = {
  requested: {
    label: "In Queue",
    Icon: Inbox,
    accent: "#2563EB",
    darkText: "#1D5FCB",
    tint: "#EAF1FD",
    dot: "#2563EB",
    dateVerb: "Created",
  },
  "in-progress": {
    label: "In Progress",
    Icon: Wrench,
    accent: "#E07C0E",
    darkText: "#B4670C",
    tint: "#FBF1DC",
    dot: "#E07C0E",
    dateVerb: "As of",
  },
  "out-for-approval": {
    label: "Out for Approval",
    Icon: Eye,
    accent: "#17A34A",
    darkText: "#12833B",
    tint: "#E7F6ED",
    dot: "#17A34A",
    dateVerb: "Sent on",
  },
  closed: {
    label: "Closed",
    Icon: CircleCheck,
    accent: "#A0A099",
    darkText: "#8A8A82",
    tint: "#F1F1EC",
    dot: "#A0A099",
    dateVerb: "Closed",
  },
};

/** The three live stages, in flow order. */
export const LIVE_STAGES = [
  "requested",
  "in-progress",
  "out-for-approval",
] as const;
