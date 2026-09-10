import { useId } from "react";
import { Calendar, Layers, MapPin, Ruler } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ProjectDetail } from "../project.types";
import { formatSiteArea } from "../project.service";
import { ProjectThumb } from "../../../components/dashboard/ProjectThumb";
import { ProgressBar } from "../../../components/dashboard/ProgressBar";
import { ProjectStatusBadge } from "../../../components/dashboard/ProjectStatusBadge";

function Fact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-primary">
        <Icon size={17} />
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-bold uppercase tracking-widest text-faint">{label}</dt>
        <dd className="mt-0.5 break-words text-[15px] font-bold leading-snug text-ink">{value}</dd>
      </div>
    </div>
  );
}

/** Large overview card: site visual on the left, essentials on the right. */
export function ProjectOverview({ project }: { project: ProjectDetail }) {
  const gridId = useId();
  const currentStage = project.stages.find((s) => s.key === project.currentStage);
  return (
    <section aria-labelledby="overview-title" className="rounded-3xl border border-line bg-white shadow-card">
      <h2 id="overview-title" className="sr-only">
        Project overview
      </h2>
      <div className="grid lg:grid-cols-[1.15fr_1fr]">
        {/* visual */}
        <div className="relative min-h-[220px] overflow-hidden rounded-t-3xl bg-surface-2 lg:min-h-[300px] lg:rounded-l-3xl lg:rounded-tr-none">
          <ProjectThumb
            variant={project.thumbVariant}
            label={`${project.name} site preview`}
            className="h-full w-full"
          />
          {/* subtle GIS-style grid + frame (decorative) */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full text-primary/15"
            preserveAspectRatio="none"
          >
            <defs>
              <pattern id={gridId} width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M32 0H0V32" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${gridId})`} />
          </svg>
          <div className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-xl border border-line bg-white/95 px-3 py-1.5 text-[12px] font-bold text-ink">
            <MapPin size={14} className="text-primary" aria-hidden="true" />
            {project.location}
          </div>
        </div>

        {/* details */}
        <div className="flex flex-col gap-5 p-6 sm:p-7">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <ProjectStatusBadge status={project.status} />
              <span className="text-[13px] font-semibold text-muted">{project.progress}% complete</span>
            </div>
            <h3 className="mt-3 text-xl font-extrabold leading-snug tracking-tight text-ink sm:text-2xl">
              {project.name}
            </h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{project.description}</p>
          </div>

          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Fact icon={MapPin} label="Location" value={project.location} />
            <Fact icon={Ruler} label="Site Area" value={formatSiteArea(project.siteAreaHa)} />
            <Fact icon={Layers} label="Project Type" value={project.type} />
            <Fact icon={Calendar} label="Last Updated" value={project.updatedAt} />
          </dl>

          <div className="mt-auto">
            <div className="mb-1.5 flex items-center justify-between text-[12px]">
              <span className="font-semibold text-muted">Current stage</span>
              <span className="font-bold text-primary">{currentStage?.label ?? project.stage}</span>
            </div>
            <ProgressBar value={project.progress} label={`${project.name} overall progress`} />
          </div>
        </div>
      </div>
    </section>
  );
}
