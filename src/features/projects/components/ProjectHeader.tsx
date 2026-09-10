import { Link } from "react-router-dom";
import { Activity, ChevronRight, DraftingCompass, Globe, MapPin, Workflow } from "lucide-react";
import type { ProjectDetail } from "../project.types";
import { formatSiteArea } from "../project.service";
import { Button } from "../../../components/ui/Button";
import { ProjectStatusBadge } from "../../../components/dashboard/ProjectStatusBadge";
import { ProjectCardMenu } from "../../../components/projects/ProjectCardMenu";

interface ProjectHeaderProps {
  project: ProjectDetail;
  onArchive: (id: string) => void;
}

/**
 * Page header for Project Details: breadcrumb, title, meta line and actions.
 * The primary action opens the (placeholder) Planning Studio route.
 */
export function ProjectHeader({ project, onArchive }: ProjectHeaderProps) {
  return (
    <header className="mb-6">
      <nav aria-label="Breadcrumb" className="mb-3">
        <ol className="flex items-center gap-1.5 text-sm">
          <li>
            <Link
              to="/app/projects"
              className="rounded-md font-semibold text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
            >
              Projects
            </Link>
          </li>
          <li aria-hidden="true" className="text-line-strong">
            <ChevronRight size={15} />
          </li>
          <li className="min-w-0">
            <span aria-current="page" className="block truncate font-bold text-ink">
              {project.name}
            </span>
          </li>
        </ol>
      </nav>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">
              {project.name}
            </h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted sm:text-[15px]">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={15} className="text-faint" aria-hidden="true" />
              {project.location}
            </span>
            <span aria-hidden="true" className="text-line-strong">•</span>
            <span>{project.type}</span>
            <span aria-hidden="true" className="text-line-strong">•</span>
            <span>{formatSiteArea(project.siteAreaHa)}</span>
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link to={`/app/analysis?projectId=${encodeURIComponent(project.id)}`} className="flex-1 sm:flex-none">
            <Button fullWidth variant="secondary">
              <Activity size={18} /> Open Analysis
            </Button>
          </Link>
          <Link to={`/app/optimization?projectId=${encodeURIComponent(project.id)}`} className="flex-1 sm:flex-none">
            <Button fullWidth variant="secondary">
              <Workflow size={18} /> Open Optimization
            </Button>
          </Link>
          <Link to={`/app/visualization?projectId=${encodeURIComponent(project.id)}`} className="flex-1 sm:flex-none">
            <Button fullWidth variant="secondary">
              <Globe size={18} /> Open Visualization
            </Button>
          </Link>
          <Link to={`/app/planning?projectId=${encodeURIComponent(project.id)}`} className="flex-1 sm:flex-none">
            <Button fullWidth>
              <DraftingCompass size={18} /> Open Planning Studio
            </Button>
          </Link>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-white shadow-soft">
            <ProjectCardMenu project={project} onArchive={onArchive} />
          </div>
        </div>
      </div>
    </header>
  );
}
