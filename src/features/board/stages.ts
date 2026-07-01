import { CircleCheck, Eye, Inbox, PencilRuler, type LucideIcon } from "lucide-react";
import type { Status } from "@/lib/queue/types";

export interface StageMeta {
  label: string;
  Icon: LucideIcon;
  /** Tailwind classes for the emphasized column/stepper header. */
  headerBg: string;
  headerText: string;
  chipBg: string;
  /** Tailwind classes for the status badge in search results. */
  badge: string;
  dot: string;
}

export const STAGE_META: Record<Exclude<Status, "hidden">, StageMeta> = {
  requested: {
    label: "Requested",
    Icon: Inbox,
    headerBg: "bg-sky-50 dark:bg-sky-950/40",
    headerText: "text-sky-800 dark:text-sky-300",
    chipBg: "bg-sky-600",
    badge: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  "in-progress": {
    label: "In progress",
    Icon: PencilRuler,
    headerBg: "bg-amber-50 dark:bg-amber-950/40",
    headerText: "text-amber-800 dark:text-amber-300",
    chipBg: "bg-amber-600",
    badge: "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  "out-for-approval": {
    label: "Out for approval",
    Icon: Eye,
    headerBg: "bg-emerald-50 dark:bg-emerald-950/40",
    headerText: "text-emerald-800 dark:text-emerald-300",
    chipBg: "bg-emerald-600",
    badge:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  closed: {
    label: "Closed",
    Icon: CircleCheck,
    headerBg: "bg-zinc-100 dark:bg-zinc-800",
    headerText: "text-zinc-600 dark:text-zinc-300",
    chipBg: "bg-zinc-500",
    badge: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
    dot: "bg-zinc-400",
  },
};

/** The three live stages, in flow order. */
export const LIVE_STAGES = [
  "requested",
  "in-progress",
  "out-for-approval",
] as const;
