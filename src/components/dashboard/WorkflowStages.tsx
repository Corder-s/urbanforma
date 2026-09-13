import { Check, Loader } from "lucide-react";
import type { ProjectStage } from "../../features/projects/project.types";

/**
 * Compact planning workflow visualization for the active project:
 * done (check) → current (pulsing dot) → upcoming (empty ring). State is
 * conveyed by shape/icon + label, never by color alone.
 */
export function WorkflowStages({ stages }: { stages: ProjectStage[] }) {
  return (
    <ol
      aria-label="Planning workflow"
      className="flex flex-wrap items-center gap-x-2 gap-y-3"
    >
      {stages.map((s, i) => (
        <li key={s.key} className="flex items-center gap-2">
          <span className="flex items-center gap-2">
            <span
              className={[
                "grid h-6 w-6 place-items-center rounded-full ring-1",
                s.state === "done" && "bg-success/10 text-success ring-success/30",
                s.state === "current" && "bg-primary text-on-brand ring-primary",
                s.state === "upcoming" && "bg-surface text-faint ring-line-strong",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-current={s.state === "current" ? "step" : undefined}
            >
              {s.state === "done" ? (
                <Check size={13} strokeWidth={3} />
              ) : s.state === "current" ? (
                <Loader size={13} className="animate-spin" strokeWidth={3} />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />
              )}
            </span>
            <span
              className={[
                "text-[11px] font-bold uppercase tracking-wide",
                s.state === "done"
                  ? "text-muted"
                  : s.state === "current"
                  ? "text-primary"
                  : "text-faint",
              ].join(" ")}
            >
              {s.label}
            </span>
          </span>
          {i < stages.length - 1 && (
            <span className="h-px w-3 bg-line-strong" aria-hidden="true" />
          )}
        </li>
      ))}
    </ol>
  );
}
