import { Link } from "react-router-dom";
import { ArrowLeft, FolderSearch, RotateCw, SearchX } from "lucide-react";
import { Button } from "../../../components/ui/Button";

const block = "rounded-2xl bg-surface-2";

/** Skeleton mirroring the details layout so nothing jumps when data arrives. */
export function ProjectDetailSkeleton() {
  return (
    <div role="status" aria-label="Loading project" className="animate-pulse space-y-8">
      <div className="space-y-3">
        <div className={`h-4 w-40 ${block}`} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className={`h-8 w-64 ${block}`} />
            <div className={`h-4 w-48 ${block}`} />
          </div>
          <div className={`h-11 w-52 ${block}`} />
        </div>
      </div>
      <div className="grid overflow-hidden rounded-3xl border border-line bg-white lg:grid-cols-[1.15fr_1fr]">
        <div className="h-56 bg-surface-2 lg:h-72" />
        <div className="space-y-3 p-6">
          <div className={`h-5 w-28 ${block}`} />
          <div className={`h-7 w-3/4 ${block}`} />
          <div className={`h-4 w-full ${block}`} />
          <div className={`h-4 w-5/6 ${block}`} />
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className={`h-12 ${block}`} />
            <div className={`h-12 ${block}`} />
            <div className={`h-12 ${block}`} />
            <div className={`h-12 ${block}`} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`h-28 ${block}`} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className={`h-72 ${block}`} />
        <div className={`h-72 ${block}`} />
      </div>
      <span className="sr-only">Loading project…</span>
    </div>
  );
}

/** Professional not-found state with a way back. */
export function ProjectNotFound({ projectId }: { projectId?: string }) {
  return (
    <div className="grid place-items-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-line bg-white p-10 text-center shadow-card">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-primary ring-1 ring-primary/15">
          <SearchX size={26} />
        </span>
        <h2 className="mt-5 text-xl font-extrabold tracking-tight text-ink">Project not found</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          {projectId ? (
            <>
              No project exists with the ID <span className="font-mono font-semibold text-ink">{projectId}</span>. It
              may have been removed or the link is incorrect.
            </>
          ) : (
            "The project you are looking for does not exist."
          )}
        </p>
        <Link to="/app/projects" className="mt-6 inline-block">
          <Button>
            <ArrowLeft size={16} /> Return to Projects
          </Button>
        </Link>
      </div>
    </div>
  );
}

/** Inline error with retry — never a browser alert. */
export function ProjectDetailError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid place-items-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-line bg-white p-10 text-center shadow-card">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-danger/10 text-danger">
          <FolderSearch size={26} />
        </span>
        <h2 className="mt-5 text-xl font-extrabold tracking-tight text-ink">Unable to load this project.</h2>
        <p className="mt-2 text-[15px] text-muted">Please try again.</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button onClick={onRetry}>
            <RotateCw size={16} /> Retry
          </Button>
          <Link to="/app/projects">
            <Button variant="secondary">
              <ArrowLeft size={16} /> Return to Projects
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
