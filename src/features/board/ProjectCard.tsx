import type { Flag, Project } from "@/lib/queue/types";

// Flags always carry text + color (never color alone — accessibility house rule).
const FLAG_STYLE: Record<Flag, string> = {
  "High Priority":
    "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  "Submitted Past Deadline":
    "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  "Waiting for Info":
    "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
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
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {project.type}
          </span>
        )}
        {project.flags.map((f) => (
          <span
            key={f}
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${FLAG_STYLE[f]}`}
          >
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}
