import { Link } from "react-router-dom";
import { ArrowLeft, FilePlus2, FileWarning, FolderOpen, Inbox, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { REPORT_TYPES } from "../data/report.catalog";
import type { ReportType } from "../types/report.types";

/** Skeleton for the whole workspace (list + document) while sources load. */
export function ReportsSkeleton() {
  const bar = "animate-pulse rounded-lg bg-surface-2";
  return (
    <div role="status" aria-label="Loading reports" className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
            <div className={`${bar} h-4 w-2/3`} />
            <div className={`${bar} mt-2 h-3 w-1/3`} />
            <div className={`${bar} mt-4 h-2 w-full rounded-full`} />
          </div>
        ))}
      </div>
      <div className="rounded-3xl border border-line bg-surface p-8 shadow-card">
        <div className={`${bar} h-6 w-1/2`} />
        <div className={`${bar} mt-3 h-3 w-1/4`} />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`${bar} h-3 w-full`} style={{ opacity: 1 - i * 0.12 }} />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading reports…</span>
    </div>
  );
}

/** Skeleton of the document body while the five sources are read. */
export function DocumentLoading({ generating = false }: { generating?: boolean }) {
  return (
    <div role="status" aria-live="polite" className="grid min-h-[420px] place-items-center rounded-3xl border border-line bg-surface p-8 text-center shadow-card">
      <div className="max-w-sm">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary ring-1 ring-primary/15">
          <svg className="h-6 w-6 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
          </svg>
        </span>
        <p className="mt-4 text-sm font-bold text-ink">{generating ? "Generating report…" : "Reading project data…"}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          Project, planning, analysis, optimization and visualization are read live so the document always matches the
          workspace.
        </p>
      </div>
    </div>
  );
}

export function DocumentError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="grid min-h-[420px] place-items-center rounded-3xl border border-line bg-surface p-8 text-center shadow-card">
      <div className="max-w-md">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-danger/10 text-danger">
          <FileWarning size={26} />
        </span>
        <h2 className="mt-5 text-xl font-extrabold tracking-tight text-ink">The report could not be generated</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">{message}</p>
        <Button className="mt-6" onClick={onRetry}>
          <RefreshCw size={16} /> Try again
        </Button>
      </div>
    </div>
  );
}

/** No report selected (or all deleted) — offer every report type. */
export function ReportsEmpty({ onCreate, full }: { onCreate: (type: ReportType) => void; full: boolean }) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-surface/70 p-8 text-center shadow-soft">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary ring-1 ring-primary/15">
        <Inbox size={26} />
      </span>
      <h2 className="mt-5 text-lg font-extrabold tracking-tight text-ink">No reports yet</h2>
      <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-relaxed text-muted">
        Create a report to turn this project's planning, analysis and optimization work into a document you can print or
        save as PDF.
      </p>
      {full ? (
        <p className="mt-4 text-[13px] font-semibold text-warning">This project has reached its report limit.</p>
      ) : (
        <ul className="mx-auto mt-6 grid max-w-2xl gap-2 sm:grid-cols-2" aria-label="Report types">
          {REPORT_TYPES.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onCreate(t.id)}
                className="flex w-full items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-primary hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
              >
                <FilePlus2 size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-ink">{t.label}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{t.description}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** No project could be resolved (e.g. an id in the URL that no longer exists). */
export function NoProjectAvailable({ projects, onOpen }: { projects: { id: string; name: string; location: string }[]; onOpen: (id: string) => void }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-line bg-surface p-8 text-center shadow-card">
      <div className="w-full max-w-lg">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary ring-1 ring-primary/15">
          <FolderOpen size={26} />
        </span>
        <h2 className="mt-5 text-xl font-extrabold tracking-tight text-ink">No project selected</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Reports are written for one project at a time. Pick a project to continue.
        </p>
        {projects.length > 0 && (
          <ul className="mt-5 grid gap-2 text-left" aria-label="Available projects">
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

export function ProjectsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-line bg-surface p-10 text-center shadow-card">
      <div className="max-w-md">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-danger/10 text-danger">
          <TriangleAlert size={26} />
        </span>
        <h2 className="mt-5 text-xl font-extrabold tracking-tight text-ink">Unable to load projects</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">{message}</p>
        <Button className="mt-6" onClick={onRetry}>
          <RefreshCw size={16} /> Retry
        </Button>
      </div>
    </div>
  );
}

/** Shown inside a section whose source did not respond — never a blank block. */
export function SectionUnavailable({ label, hint }: { label: string; hint?: string }) {
  return (
    <p className="report-block rounded-xl border border-dashed border-line bg-surface-2/60 px-4 py-3 text-[12.5px] leading-relaxed text-muted">
      <strong className="font-bold text-ink">{label} is not available for this project.</strong>{" "}
      {hint ?? "Open the module in the workspace to create it, then generate the report again."}
    </p>
  );
}

/** Every section disabled in the configuration panel. */
export function PreviewEmpty() {
  return (
    <div className="grid min-h-[320px] place-items-center rounded-2xl border border-dashed border-line bg-surface-2/40 p-8 text-center">
      <div className="max-w-sm">
        <Inbox size={24} className="mx-auto text-faint" aria-hidden="true" />
        <p className="mt-3 text-sm font-bold text-ink">No sections enabled</p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          Turn on at least one section in the report configuration to build the document.
        </p>
      </div>
    </div>
  );
}
