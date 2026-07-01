import {
  CalendarClock,
  CircleHelp,
  Flame,
  Monitor,
  Printer,
  Signpost,
  type LucideIcon,
} from "lucide-react";
import type { Flag, Project, ProjectType } from "@/lib/queue/types";

// Flags always carry text + icon + color (never color alone — accessibility).
const FLAG_STYLE: Record<Flag, { cls: string; Icon: LucideIcon }> = {
  "High Priority": {
    cls: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
    Icon: Flame,
  },
  "Submitted Past Deadline": {
    cls: "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
    Icon: CalendarClock,
  },
  "Waiting for Info": {
    cls: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
    Icon: CircleHelp,
  },
};

const TYPE_ICON: Record<ProjectType, LucideIcon> = {
  Print: Printer,
  Signage: Signpost,
  Digital: Monitor,
};

export function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">
        {project.name}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {project.departments.map((d) => (
          <span
            key={d}
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          >
            <span
              className="h-2 w-2 rounded-full bg-violet-500"
              aria-hidden="true"
            />
            {d}
          </span>
        ))}
        {project.type && (
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {(() => {
              const Icon = TYPE_ICON[project.type];
              return <Icon size={12} aria-hidden="true" />;
            })()}
            {project.type}
          </span>
        )}
        {project.flags.map((f) => {
          const { cls, Icon } = FLAG_STYLE[f];
          return (
            <span
              key={f}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
            >
              <Icon size={12} aria-hidden="true" />
              {f}
            </span>
          );
        })}
      </div>
    </div>
  );
}
