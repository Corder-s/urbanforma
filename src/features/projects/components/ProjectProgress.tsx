import { Check, CircleDashed, Loader } from "lucide-react";
import type { PlanningStage, ProjectDetail, StageStatus } from "../project.types";
import { ProgressBar } from "../../../components/dashboard/ProgressBar";
import { SectionHeading } from "../../../components/dashboard/SectionHeading";

const STATUS_STYLE: Record<StageStatus, { pill: string; ring: string }> = {
  Completed: { pill: "bg-success/10 text-success ring-success/20", ring: "bg-success/10 text-success ring-success/30" },
  "In Progress": { pill: "bg-primary/10 text-primary ring-primary/20", ring: "bg-primary text-white ring-primary" },
  "Not Started": { pill: "bg-surface-2 text-muted ring-line", ring: "bg-white text-faint ring-line-strong" },
};

function StageIcon({ status }: { status: StageStatus }) {
  if (status === "Completed") return <Check size={14} strokeWidth={3} />;
  if (status === "In Progress") return <Loader size={14} strokeWidth={3} className="animate-spin motion-reduce:animate-none" />;
  return <CircleDashed size={14} strokeWidth={2.5} />;
}

function StageRow({ stage, index, isCurrent }: { stage: PlanningStage; index: number; isCurrent: boolean }) {
  const style = STATUS_STYLE[stage.status];
  return (
    <li
      aria-current={isCurrent ? "step" : undefined}
      className={[
        "grid grid-cols-[auto_1fr] items-start gap-3 rounded-2xl px-3 py-3 xl:grid-cols-[auto_1fr_auto_minmax(120px,150px)] xl:items-center xl:gap-4",
        isCurrent ? "bg-primary/5 ring-1 ring-primary/15" : "",
      ].join(" ")}
    >
      <span className={`grid h-8 w-8 place-items-center rounded-full ring-1 ${style.ring}`}>
        <StageIcon status={stage.status} />
      </span>

      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-extrabold text-ink">
          <span className="text-faint">{String(index + 1).padStart(2, "0")}</span>
          {stage.label}
          {isCurrent && (
            <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Current
            </span>
          )}
        </p>
        <p className="mt-0.5 text-[12.5px] text-muted">{stage.summary}</p>
      </div>

      <span className={`col-start-2 inline-flex w-fit rounded-full px-2.5 py-1 text-[11.5px] font-bold ring-1 xl:col-start-auto ${style.pill}`}>
        {stage.status}
      </span>

      <div className="col-start-2 flex items-center gap-3 xl:col-start-auto">
        <ProgressBar value={stage.progress} label={`${stage.label} stage`} />
        <span className="w-10 shrink-0 text-right text-[12px] font-bold text-ink">{stage.progress}%</span>
      </div>
    </li>
  );
}

/** "Planning Progress" — overall bar plus the six planning stages. */
export function ProjectProgress({ project }: { project: ProjectDetail }) {
  const completed = project.stages.filter((s) => s.status === "Completed").length;
  return (
    <section aria-labelledby="progress-title">
      <SectionHeading
        id="progress-title" title="Planning Progress"
        hint={`${completed} of ${project.stages.length} stages completed`}
      />
      <div className="rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-6">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-muted">Overall Progress</p>
          <p className="text-lg font-extrabold text-ink">{project.progress}%</p>
        </div>
        <ProgressBar value={project.progress} label="Overall progress" />

        <ol className="mt-5 space-y-1.5 border-t border-line pt-4" aria-label="Planning stages">
          {project.stages.map((s, i) => (
            <StageRow key={s.key} stage={s} index={i} isCurrent={s.key === project.currentStage} />
          ))}
        </ol>
      </div>
    </section>
  );
}
