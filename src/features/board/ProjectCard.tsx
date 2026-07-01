import {
  CircleAlert,
  Flag,
  Flame,
  Monitor,
  Printer,
  Signpost,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";
import type { Flag as FlagName, Project, ProjectType } from "@/lib/queue/types";
import { fmtDate } from "./format";
import { STAGE_META } from "./stages";

// Trello labels shown as hover icons (icon + color + accessible label).
const LABEL: Record<
  FlagName,
  { Icon: LucideIcon; bg: string; color: string; tip: string }
> = {
  "High Priority": { Icon: Flame, bg: "#FBEAEA", color: "#DB3B3B", tip: "High Priority" },
  "Waiting for Info": { Icon: CircleAlert, bg: "#FBF1DC", color: "#B4670C", tip: "Missing info: on hold until details arrive" },
  "Submitted Past Deadline": { Icon: Flag, bg: "#FDE8D6", color: "#C2410C", tip: "Submitted after the deadline" },
};

const LABEL_ORDER: FlagName[] = [
  "High Priority",
  "Waiting for Info",
  "Submitted Past Deadline",
];

// Work-type icon (the meta-line tag reflects the type).
const TYPE_ICON: Record<ProjectType, LucideIcon> = {
  Print: Printer,
  Signage: Signpost,
  Digital: Monitor,
};

export function ProjectCard({
  project,
  highlighted = false,
}: {
  project: Project;
  highlighted?: boolean;
}) {
  const meta = STAGE_META[project.status as keyof typeof STAGE_META];
  const dateVal =
    project.status === "requested"
      ? project.createdAt
      : (project.enteredStageAt ?? project.createdAt);
  const dateStr = dateVal ? `${meta.dateVerb} ${fmtDate(dateVal)}` : "";
  const flags = LABEL_ORDER.filter((f) => project.flags.includes(f));
  const TypeIcon = project.type ? TYPE_ICON[project.type] : null;

  return (
    <div
      id={`card-${project.id}`}
      style={
        {
          borderColor: "#E9E9E4",
          boxShadow: "0 1px 2px rgba(0,0,0,.03)",
          scrollMarginTop: "96px",
          "--flash": meta.accent,
        } as CSSProperties
      }
      className={`flex scroll-mt-24 flex-col gap-2 rounded-xl border bg-white px-3.5 py-3 ${highlighted ? "card-flash" : ""}`}
    >
      <div className="flex items-start gap-2.5">
        <span className="flex-1 text-[14.5px] font-semibold leading-[1.32]" style={{ color: "#1B1B19" }}>
          {project.name}
        </span>
        {flags.length > 0 && (
          <span className="mt-px flex flex-none items-center gap-1.5">
            {flags.map((f) => {
              const { Icon, bg, color, tip } = LABEL[f];
              return (
                <span key={f} className="group/label relative flex">
                  <span
                    aria-label={tip}
                    tabIndex={0}
                    className="flex h-[22px] w-[22px] cursor-help items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40"
                    style={{ background: bg, color }}
                  >
                    <Icon size={13} aria-hidden="true" />
                  </span>
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-1.5 max-w-[210px] -translate-x-1/2 whitespace-normal rounded-md bg-[#1B1B19] px-2 py-1 text-center text-[11.5px] font-medium leading-snug text-white opacity-0 shadow-md transition-opacity duration-100 group-hover/label:opacity-100 group-focus-within/label:opacity-100"
                  >
                    {tip}
                  </span>
                </span>
              );
            })}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-[12.5px] font-medium" style={{ color: "#9A9A92" }}>
        {TypeIcon && project.type && (
          <span className="inline-flex items-center gap-1">
            <TypeIcon size={12} aria-hidden="true" />
            {project.type}
          </span>
        )}
        {TypeIcon && dateStr && <span style={{ color: "#D4D4CC" }}>·</span>}
        {dateStr && <span>{dateStr}</span>}
      </div>
    </div>
  );
}
