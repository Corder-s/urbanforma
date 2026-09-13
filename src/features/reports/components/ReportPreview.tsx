import { TriangleAlert } from "lucide-react";
import { Logo } from "../../../components/ui/Logo";
import { formatDate, formatSiteArea } from "../../projects/project.service";
import { REPORT_TYPE_META, SECTION_META } from "../data/report.catalog";
import { enabledSections } from "../lib/reportModel";
import type { ReportConfig, ReportModel } from "../types/report.types";
import { ReportSectionBody } from "./ReportSections";
import { PreviewEmpty, SectionUnavailable } from "./ReportStates";

/**
 * The document itself.
 *
 * Rendered as a single A4-proportioned `<article>`: cover block, contents, one
 * numbered `<section>` per enabled report section, then a document-control
 * footer. Everything inside carries the `report-*` classes the print stylesheet
 * uses for page breaks, so the on-screen preview and the printed/PDF output are
 * the same markup — nothing is re-laid-out for print.
 */

const STATUS_LABEL: Record<ReportConfig["status"], string> = {
  draft: "Draft",
  generating: "Generating",
  ready: "Ready",
  failed: "Generation failed",
};

interface ReportPreviewProps {
  report: ReportConfig;
  model: ReportModel;
}

export function ReportPreview({ report, model }: ReportPreviewProps) {
  const sections = enabledSections(report);
  const project = model.project;
  const stamp = report.lastGeneratedAt ?? report.updatedAt;

  return (
    <article
      id="report-document"
      aria-label={`${report.title} — document preview`}
      className="report-document mx-auto w-full max-w-[840px] overflow-hidden rounded-3xl border border-line bg-white text-ink shadow-card"
    >
      {/* ---------- cover ---------- */}
      <header className="report-cover border-b border-line px-7 py-7 sm:px-10 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2.5">
            <Logo size={20} withWordmark={false} />
            <span className="text-[13px] font-extrabold uppercase tracking-[0.2em] text-primary">UrbanForma</span>
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
            {REPORT_TYPE_META[report.type].label}
          </span>
        </div>

        <h1 className="mt-6 text-[25px] font-extrabold leading-[1.15] tracking-tight text-ink sm:text-[30px]">
          {report.title}
        </h1>
        {report.description && (
          <p className="mt-2.5 max-w-2xl text-[13.5px] leading-relaxed text-muted">{report.description}</p>
        )}

        <dl className="report-block mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line/70 pt-4 text-[11.5px] sm:grid-cols-3">
          <div>
            <dt className="text-[10px] font-extrabold uppercase tracking-wide text-muted">Project</dt>
            <dd className="mt-0.5 font-bold text-ink">{project?.name ?? model.projectId}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-extrabold uppercase tracking-wide text-muted">Location</dt>
            <dd className="mt-0.5 font-semibold text-ink">{project?.location ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-extrabold uppercase tracking-wide text-muted">Site area</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-ink">
              {project ? formatSiteArea(project.siteAreaHa) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-extrabold uppercase tracking-wide text-muted">Revision</dt>
            <dd className="mt-0.5 font-semibold text-ink">
              v{report.version} · {STATUS_LABEL[report.status]}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-extrabold uppercase tracking-wide text-muted">
              {report.lastGeneratedAt ? "Generated" : "Last updated"}
            </dt>
            <dd className="mt-0.5 font-semibold text-ink">{formatDate(stamp)}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-extrabold uppercase tracking-wide text-muted">Sections</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-ink">{sections.length}</dd>
          </div>
        </dl>

        {model.missing.length > 0 && (
          <p className="report-block mt-4 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-ink">
            <TriangleAlert size={15} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
            <span>
              <strong className="font-bold">Incomplete sources:</strong> {model.missing.join(", ")}. The sections that
              depend on them say so explicitly instead of printing empty tables.
            </span>
          </p>
        )}
      </header>

      {/* ---------- contents ---------- */}
      {sections.length > 0 && (
        <nav className="report-block border-b border-line px-7 py-5 sm:px-10" aria-label="Report contents">
          <h2 className="text-[10.5px] font-extrabold uppercase tracking-wide text-muted">Contents</h2>
          <ol className="mt-2 grid gap-x-8 gap-y-1 text-[12.5px] sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.id} className="flex items-baseline gap-2">
                <span className="w-5 shrink-0 tabular-nums text-muted">{String(i + 1).padStart(2, "0")}</span>
                <a href={`#section-${s.id}`} className="min-w-0 flex-1 font-semibold text-ink hover:text-primary">
                  {SECTION_META[s.id].label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* ---------- body ---------- */}
      <div className="px-7 py-2 sm:px-10">
        {sections.length === 0 ? (
          <div className="py-6">
            <PreviewEmpty />
          </div>
        ) : (
          sections.map((s, i) => {
            const meta = SECTION_META[s.id];
            const unavailable = meta.needs.filter((n) => model.missing.includes(n));
            return (
              <section
                key={s.id}
                id={`section-${s.id}`}
                aria-labelledby={`section-${s.id}-title`}
                className="report-section border-b border-line/70 py-6 last:border-b-0"
              >
                <div className="report-section-head flex items-baseline gap-3">
                  <span className="text-[12px] font-extrabold tabular-nums text-primary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 id={`section-${s.id}-title`} className="text-[17px] font-extrabold leading-snug tracking-tight text-ink">
                    {meta.label}
                  </h2>
                </div>
                <p className="mt-1 pl-8 text-[11.5px] leading-relaxed text-muted">{meta.blurb}</p>
                <div className="mt-3.5">
                  {unavailable.length === meta.needs.length ? (
                    <SectionUnavailable
                      label={meta.label}
                      hint={`This section reads the ${unavailable.join(" and ")} module${unavailable.length === 1 ? "" : "s"}, which did not respond for this project.`}
                    />
                  ) : (
                    <ReportSectionBody id={s.id} model={model} report={report} />
                  )}
                </div>
              </section>
            );
          })
        )}
      </div>

      {/* ---------- document control ---------- */}
      <footer className="report-footer border-t border-line bg-surface-2/40 px-7 py-5 text-[11px] leading-relaxed text-muted sm:px-10">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
          <span className="font-bold text-ink">
            {report.title} · revision v{report.version}
          </span>
          <span className="tabular-nums">
            {report.lastGeneratedAt ? `Generated ${formatDate(report.lastGeneratedAt)}` : `Draft updated ${formatDate(report.updatedAt)}`}
          </span>
        </div>
        <p className="mt-1.5">
          Report {report.id} · project {model.projectId} · {sections.length} section{sections.length === 1 ? "" : "s"} ·
          prepared with UrbanForma. Figures come from the project's live planning, analysis and optimization records and
          are illustrative demo values, not survey or simulation results.
        </p>
      </footer>
    </article>
  );
}
