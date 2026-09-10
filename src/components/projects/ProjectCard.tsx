import { Link } from "react-router-dom";
import { MapPin, FolderOpen } from "lucide-react";
import type { Project } from "../../features/projects/project.types";
import { formatSiteArea } from "../../features/projects/project.service";
import { ProjectThumb } from "../dashboard/ProjectThumb";
import { ProgressBar } from "../dashboard/ProgressBar";
import { ProjectStatusBadge } from "../dashboard/ProjectStatusBadge";
import { Badge } from "../ui/Badge";
import { ProjectCardMenu } from "./ProjectCardMenu";

const openLinkClass =
  "inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-primary shadow-soft transition-all hover:border-primary hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20";

/** Grid project card — visual preview (~40%) then details. */
export function ProjectCard({
  project,
  onArchive,
}: {
  project: Project;
  onArchive: (id: string) => void;
}) {
  const detail = `/app/projects/${project.id}`;

  return (
    // No `overflow-hidden` on the card itself — it would clip the ⋯ menu. The
    // thumbnail link clips its own image instead. Hover uses shadow/border only
    // (no transform) so an open menu is never trapped under a neighbouring card.
    <article className="group relative flex h-full flex-col rounded-3xl border border-line bg-white shadow-soft transition-[border-color,box-shadow] duration-300 hover:border-primary/30 hover:shadow-card focus-within:z-10 hover:z-10">
      <Link
        to={detail}
        aria-label={`Open ${project.name}`}
        className="relative block aspect-[240/150] overflow-hidden rounded-t-3xl bg-surface-2"
      >
        <ProjectThumb
          variant={project.thumbVariant}
          label={`${project.name} site preview`}
          className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute right-3 top-3">
          <ProjectStatusBadge status={project.status} />
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <h3 className="text-[15px] font-extrabold leading-snug text-ink">
          <Link to={detail} className="transition-colors hover:text-primary">
            {project.name}
          </Link>
        </h3>
        <p className="flex items-center gap-1.5 text-[13px] text-muted">
          <MapPin size={14} className="shrink-0 text-faint" />
          <span className="truncate">{project.location}</span>
          <span className="text-line-strong">·</span>
          <span className="shrink-0">{formatSiteArea(project.siteAreaHa)}</span>
        </p>
        <div>
          <Badge tone="neutral">{project.type}</Badge>
        </div>

        <div className="mt-auto space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[12px] font-semibold">
            <span className="text-muted">Planning progress</span>
            <span className="text-ink">{project.progress}%</span>
          </div>
          <ProgressBar value={project.progress} label={`${project.name} progress`} />
          <p className="pt-0.5 text-[12px] text-faint">Updated {project.updatedAt}</p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <Link to={detail} className={openLinkClass}>
            <FolderOpen size={15} /> Open Project
          </Link>
          <ProjectCardMenu project={project} onArchive={onArchive} />
        </div>
      </div>
    </article>
  );
}
