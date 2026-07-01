import { CircleAlert, Flag, Flame, Tag, type LucideIcon } from "lucide-react";
import type { Flag as FlagName, Project } from "@/lib/queue/types";
import { fmtDate } from "./format";
import { STAGE_META } from "./stages";

// Trello labels shown as hover icons (icon + color + accessible label).
const LABEL: Record<
  FlagName,
  { Icon: LucideIcon; bg: string; color: string; tip: string }
> = {
  "High Priority": {
    Icon: Flame,
    bg: "#FBEAEA",
    color: "#DB3B3B",
    tip: "High Priority",
  },
  "Waiting for Info": {
    Icon: CircleAlert,
    bg: "#FBF1DC",
    color: "#B4670C",
    tip: "Missing info: on hold until details arrive",
  },
  "Submitted Past Deadline": {
    Icon: Flag,
    bg: "#FDE8D6",
    color: "#C2410C",
    tip: "Submitted after the deadline",
  },
};

// Fixed display order for the label cluster.
const LABEL_ORDER: FlagName[] = [
  "High Priority",
  "Waiting for Info",
  "Submitted Past Deadline",
];

export function ProjectCard({ project }: { project: Project }) {
  const meta = STAGE_META[project.status as keyof typeof STAGE_META];
  const dateVal =
    project.status === "requested"
      ? project.createdAt
      : (project.enteredStageAt ?? project.createdAt);
  const dateStr = dateVal ? `${meta.dateVerb} ${fmtDate(dateVal)}` : "";
  const flags = LABEL_ORDER.filter((f) => project.flags.includes(f));

  return (
    <a
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ borderColor: "#E9E9E4", boxShadow: "0 1px 2px rgba(0,0,0,.03)" }}
      className="flex flex-col gap-2 rounded-xl border bg-white px-3.5 py-3 no-underline transition-all duration-[120ms] hover:-translate-y-px hover:border-[#C6C6BE] hover:shadow-[0_3px_10px_rgba(0,0,0,0.09)]"
    >
      <div className="flex items-start gap-2.5">
        <span
          className="flex-1 text-[14.5px] font-semibold leading-[1.32]"
          style={{ color: "#1B1B19" }}
        >
          {project.name}
        </span>
        {flags.length > 0 && (
          <span className="mt-px flex flex-none items-center gap-1.5">
            {flags.map((f) => {
              const { Icon, bg, color, tip } = LABEL[f];
              return (
                <span
                  key={f}
                  title={tip}
                  aria-label={tip}
                  className="flex h-[22px] w-[22px] cursor-help items-center justify-center rounded-md"
                  style={{ background: bg, color }}
                >
                  <Icon size={13} aria-hidden="true" />
                </span>
              );
            })}
          </span>
        )}
      </div>
      <div
        className="flex items-center gap-1.5 text-[12.5px] font-medium"
        style={{ color: "#9A9A92" }}
      >
        {project.type && (
          <span className="inline-flex items-center gap-1">
            <Tag size={12} aria-hidden="true" />
            {project.type}
          </span>
        )}
        {project.type && dateStr && <span style={{ color: "#D4D4CC" }}>·</span>}
        {dateStr && <span>{dateStr}</span>}
      </div>
    </a>
  );
}
