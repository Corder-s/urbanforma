import { Link } from "react-router-dom";
import { ArrowLeft, FolderOpen, Globe, RefreshCw, SearchX, Shapes, TriangleAlert } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import type { VisualizationProjectSummary } from "../services/visualization.service";

/** Full-viewport loading state while the spatial dataset is fetched. */
export function SpatialLoading({ label = "Loading spatial data…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="relative grid h-full min-h-[320px] place-items-center overflow-hidden bg-[#EEF3F9] p-6">
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage: "linear-gradient(to right, #DCE6F2 1px, transparent 1px), linear-gradient(to bottom, #DCE6F2 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
        aria-hidden="true"
      />
      <div className="relative flex flex-col items-center gap-4 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface shadow-soft ring-1 ring-line">
          <svg className="h-6 w-6 animate-spin text-primary motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-bold text-ink">{label}</p>
          <p className="mt-0.5 text-[13px] text-muted">Building the site model for the map and 3D city</p>
        </div>
      </div>
    </div>
  );
}

interface NoProjectProps {
  projects: VisualizationProjectSummary[];
  onOpen: (id: string) => void;
}

/** Route reached without ?projectId — offer the demo projects. */
export function NoProjectSelected({ projects, onOpen }: NoProjectProps) {
  return (
    <div className="grid h-full min-h-[360px] place-items-center overflow-y-auto bg-canvas p-6">
      <div className="w-full max-w-lg rounded-3xl border border-line bg-surface p-6 text-center shadow-card sm:p-8">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary ring-1 ring-primary/15">
          <Globe size={26} />
        </span>
        <h2 className="mt-5 text-xl font-extrabold text-ink">No project selected</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">Visualization shows one project's site at a time. Open a project from the Projects page or pick one to start.</p>
        {projects.length > 0 && (
          <ul className="mt-5 grid gap-2 text-left" aria-label="Demo projects">
            {projects.slice(0, 4).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onOpen(p.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-left transition-colors hover:border-primary hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-ink">{p.name}</span>
                    <span className="block truncate text-[12.5px] text-muted">{p.location}</span>
                  </span>
                  <FolderOpen size={16} className="shrink-0 text-primary" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <Link to="/app/projects" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-dark">
          <ArrowLeft size={16} /> Go to Projects
        </Link>
      </div>
    </div>
  );
}

export function ProjectNotFound({ projectId }: { projectId: string }) {
  return (
    <div className="grid h-full min-h-[360px] place-items-center bg-canvas p-6">
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 text-center shadow-card sm:p-8">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-warning/10 text-warning ring-1 ring-warning/20">
          <SearchX size={26} />
        </span>
        <h2 className="mt-5 text-xl font-extrabold text-ink">Project not found</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          No project with the id <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[13px] text-ink">{projectId}</code> exists in this workspace.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Link to="/app/projects">
            <Button fullWidth>
              <ArrowLeft size={16} /> Return to Projects
            </Button>
          </Link>
          <Link to="/app/visualization">
            <Button variant="secondary" fullWidth>
              Choose a project
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function SpatialError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="grid h-full min-h-[360px] place-items-center bg-canvas p-6">
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 text-center shadow-card sm:p-8">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-danger/10 text-danger ring-1 ring-danger/20">
          <TriangleAlert size={26} />
        </span>
        <h2 className="mt-5 text-xl font-extrabold text-ink">Spatial data error</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">{message}</p>
        <Button className="mt-6" onClick={onRetry}>
          <RefreshCw size={16} /> Try again
        </Button>
      </div>
    </div>
  );
}

/** Dataset loaded but contains nothing to draw (e.g. an emptied local plan). */
export function NoSpatialObjects({ projectId }: { projectId: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
      <div className="pointer-events-auto max-w-sm rounded-2xl border border-line bg-surface/95 p-5 text-center shadow-soft">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Shapes size={20} />
        </span>
        <h3 className="mt-3 text-[15px] font-extrabold text-ink">No spatial objects</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">This project has no buildings, roads or landscape yet. Draw them in Planning Studio and they will appear here.</p>
        <Link to={`/app/planning?projectId=${encodeURIComponent(projectId)}`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary-dark">
          Open Planning Studio <ArrowLeft size={14} className="rotate-180" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
