import { Link } from "react-router-dom";
import { ArrowRight, FolderOpen, MapPin } from "lucide-react";
import type { Project, ProjectStage } from "../../features/projects/project.types";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { ProjectThumb } from "./ProjectThumb";
import { formatSiteArea } from "../../features/projects/project.service";
import { ProgressBar } from "./ProgressBar";
import { ProjectStatusBadge } from "./ProjectStatusBadge";
import { WorkflowStages } from "./WorkflowStages";
import { Reveal } from "../landing/Reveal";

interface ContinueWorkingProps {
  project: Project;
  stages: ProjectStage[];
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-faint">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-ink">{value}</p>
    </div>
  );
}

export function ContinueWorking({ project, stages }: ContinueWorkingProps) {
  return (
    <Reveal>
      <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
        <div className="grid lg:grid-cols-[1.5fr_1fr]">
          {/* visual-dominant project preview */}
          <div className="group relative min-h-[240px] bg-surface-2">
            <ProjectThumb
              variant={project.thumbVariant}
              label={`${project.name} site preview`}
              className="h-full w-full"
            />
            <div className="absolute left-4 top-4 flex items-center gap-2">
              <Badge tone="blue" className="bg-surface/90 backdrop-blur">
                Continue Working
              </Badge>
              <ProjectStatusBadge status={project.status} />
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 rounded-2xl bg-surface/85 px-3 py-2 backdrop-blur">
              <MapPin size={16} className="shrink-0 text-primary" />
              <p className="truncate text-sm font-bold text-ink">{project.location}</p>
            </div>
          </div>

          {/* details */}
          <div className="flex flex-col gap-5 p-6 sm:p-7">
            <div>
              <h3 className="text-xl font-extrabold leading-snug tracking-tight text-ink sm:text-2xl">
                {project.name}
              </h3>
              <p className="mt-1 text-sm text-muted">Last edited {project.updatedAt}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Meta label="Site Area" value={formatSiteArea(project.siteAreaHa)} />
              <Meta label="Progress" value={`${project.progress}%`} />
              <Meta label="Env. Score" value={`${project.env.score} / 100`} />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-[12px]">
                <span className="font-semibold text-muted">Current stage</span>
                <span className="font-bold text-primary">{project.stage}</span>
              </div>
              <ProgressBar value={project.progress} label={project.stage} />
            </div>

            <div className="mt-auto flex flex-wrap gap-2">
              <Link to={`/app/planning?projectId=${encodeURIComponent(project.id)}`}>
                <Button size="sm">
                  Continue Planning <ArrowRight size={16} />
                </Button>
              </Link>
              <Link to="/app/projects">
                <Button size="sm" variant="secondary">
                  <FolderOpen size={16} /> Open Project
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* planning workflow */}
        <div className="border-t border-line bg-surface px-5 py-4 sm:px-7">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-faint">
            Planning progress
          </p>
          <WorkflowStages stages={stages} />
        </div>
      </div>
    </Reveal>
  );
}
