import { Link } from "react-router-dom";
import { Plus, RotateCw, FolderSearch, FolderPlus } from "lucide-react";
import { Button } from "../ui/Button";
import { ProjectThumb } from "../dashboard/ProjectThumb";

/** Card-shaped skeletons shown while projects load. */
export function ProjectsSkeleton() {
  const block = "animate-pulse bg-surface-2";
  return (
    <div
      role="status"
      aria-label="Loading projects"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={`flex flex-col gap-3 rounded-3xl border border-line bg-white p-3 shadow-soft`}
        >
          <div className={`h-36 rounded-2xl ${block}`} />
          <div className="h-4 w-2/3 rounded-lg bg-surface-2" />
          <div className="h-3 w-1/2 rounded-lg bg-surface-2" />
          <div className="h-2 w-full rounded-full bg-surface-2" />
          <div className="h-9 rounded-xl bg-surface-2" />
        </div>
      ))}
      <span className="sr-only">Loading projects…</span>
    </div>
  );
}

/** Error state — inline retry, never an alert. */
export function ProjectsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid place-items-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-line bg-white p-10 text-center shadow-card">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-danger/10 text-danger">
          <FolderSearch size={26} />
        </span>
        <h2 className="mt-5 text-xl font-extrabold tracking-tight text-ink">
          Unable to load projects.
        </h2>
        <p className="mt-2 text-[15px] text-muted">Please try again.</p>
        <Button className="mt-6" onClick={onRetry}>
          <RotateCw size={16} /> Retry
        </Button>
      </div>
    </div>
  );
}

/** No projects at all (first run / ?demo=empty). */
export function ProjectsEmpty() {
  return (
    <div className="grid place-items-center px-6 py-14">
      <div className="w-full max-w-md text-center">
        <div className="relative mx-auto aspect-[240/150] w-full max-w-sm overflow-hidden rounded-3xl border border-line bg-surface-2 shadow-soft">
          <ProjectThumb variant={3} label="Empty projects illustration" className="h-full w-full opacity-90" />
        </div>
        <h2 className="mt-7 text-2xl font-extrabold tracking-tight text-ink">
          Your projects will appear here.
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-muted">
          Start your first urban planning project.
        </p>
        <Link to="/app/projects/new" className="mt-6 inline-block">
          <Button size="lg">
            <Plus size={18} /> Create Project
          </Button>
        </Link>
      </div>
    </div>
  );
}

/** Search/filter returned nothing. */
export function ProjectsNoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="grid place-items-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-line bg-white p-10 text-center shadow-soft">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <FolderPlus size={26} />
        </span>
        <h2 className="mt-5 text-xl font-extrabold tracking-tight text-ink">
          No projects found.
        </h2>
        <p className="mt-2 text-[15px] text-muted">
          Try another search or change your filters.
        </p>
        <Button variant="secondary" className="mt-6" onClick={onClear}>
          Clear Filters
        </Button>
      </div>
    </div>
  );
}
