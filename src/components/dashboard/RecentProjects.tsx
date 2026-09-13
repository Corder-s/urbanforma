import { Link } from "react-router-dom";
import { MapPin, ArrowUpRight } from "lucide-react";
import type { Project } from "../../features/projects/project.types";
import { Reveal } from "../landing/Reveal";
import { SectionHeading } from "./SectionHeading";
import { ProjectThumb } from "./ProjectThumb";
import { ProgressBar } from "./ProgressBar";
import { ProjectStatusBadge } from "./ProjectStatusBadge";
import { formatSiteArea } from "../../features/projects/project.service";

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to="/app/projects"
      aria-label={`Open ${project.name}`}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-soft transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
    >
      <div className="relative aspect-[240/150] overflow-hidden bg-surface-2">
        <ProjectThumb
          variant={project.thumbVariant}
          label={`${project.name} site preview`}
          className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute right-3 top-3">
          <ProjectStatusBadge status={project.status} />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-extrabold leading-snug text-ink group-hover:text-primary">
            {project.name}
          </h3>
          <ArrowUpRight
            size={18}
            className="mt-0.5 shrink-0 text-faint transition-colors group-hover:text-primary"
          />
        </div>

        <p className="flex items-center gap-1.5 text-[13px] text-muted">
          <MapPin size={14} className="text-faint" /> {project.location}
          <span className="text-line-strong">·</span> {formatSiteArea(project.siteAreaHa)}
        </p>

        <div className="mt-auto space-y-1.5">
          <div className="flex items-center justify-between text-[12px] font-semibold">
            <span className="text-muted">{project.status}</span>
            <span className="text-ink">{project.progress}%</span>
          </div>
          <ProgressBar value={project.progress} label={`${project.name} progress`} />
          <p className="pt-1 text-[12px] text-faint">Updated {project.updatedAt}</p>
        </div>
      </div>
    </Link>
  );
}

/** Responsive grid of recent projects — each card is a single keyboard link. */
export function RecentProjects({ projects }: { projects: Project[] }) {
  return (
    <section aria-labelledby="recent-title">
      <SectionHeading id="recent-title" title="Recent Projects" hint="Pick up where you left off" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {projects.map((p, i) => (
          <Reveal key={p.id} delay={(i % 4) * 70} className="h-full">
            <ProjectCard project={p} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
