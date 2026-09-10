import { Link } from "react-router-dom";
import { MapPin, FolderOpen } from "lucide-react";
import type { Project } from "../../features/projects/project.types";
import { formatSiteArea } from "../../features/projects/project.service";
import { ProjectThumb } from "../dashboard/ProjectThumb";
import { ProgressBar } from "../dashboard/ProgressBar";
import { ProjectStatusBadge } from "../dashboard/ProjectStatusBadge";
import { ProjectCardMenu } from "./ProjectCardMenu";

const openLinkClass =
  "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-primary shadow-soft transition-all hover:border-primary hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20";

/** Compact horizontal list row for the list view. */
export function ProjectRow({
  project,
  onArchive,
}: {
  project: Project;
  onArchive: (id: string) => void;
}) {
  const detail = `/app/projects/${project.id}`;

  return (
    // Hover uses shadow/border only (no transform) so the ⋯ menu of an open row
    // is never trapped beneath the following row.
    <article className="group relative grid grid-cols-[1fr] items-center gap-4 rounded-3xl border border-line bg-white p-3 shadow-soft transition-[border-color,box-shadow] duration-300 hover:border-primary/30 hover:shadow-card focus-within:z-10 hover:z-10 sm:grid-cols-[180px_1.6fr_1.2fr_auto] sm:gap-5 sm:p-4">
      {/* thumb */}
      <Link
        to={detail}
        aria-label={`Open ${project.name}`}
        className="block h-28 overflow-hidden rounded-2xl bg-surface-2 sm:h-24"
      >
        <ProjectThumb
          variant={project.thumbVariant}
          label={`${project.name} site preview`}
          className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </Link>

      {/* identity */}
      <div className="min-w-0 px-1 sm:px-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[15px] font-extrabold leading-snug text-ink">
            <Link to={detail} className="transition-colors hover:text-primary">
              {project.name}
            </Link>
          </h3>
          <ProjectStatusBadge status={project.status} />
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
          <MapPin size={14} className="shrink-0 text-faint" />
          <span className="truncate">{project.location}</span>
          <span className="text-line-strong">·</span>
          <span className="shrink-0">{formatSiteArea(project.siteAreaHa)}</span>
          <span className="text-line-strong">·</span>
          <span className="shrink-0">{project.type}</span>
        </p>
        <p className="mt-1 line-clamp-1 text-[12.5px] text-faint">{project.description}</p>
      </div>

      {/* progress */}
      <div className="min-w-0 px-1 sm:px-0">
        <div className="flex items-center justify-between text-[12px] font-semibold">
          <span className="text-muted">Progress</span>
          <span className="text-ink">{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} label={`${project.name} progress`} />
        <p className="mt-1.5 text-[12px] text-faint">Updated {project.updatedAt}</p>
      </div>

      {/* actions */}
      <div className="flex items-center justify-between gap-2 px-1 sm:px-0">
        <Link to={detail} className={openLinkClass}>
          <FolderOpen size={15} /> Open
        </Link>
        <ProjectCardMenu project={project} onArchive={onArchive} />
      </div>
    </article>
  );
}
