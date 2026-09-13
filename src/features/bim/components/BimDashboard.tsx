import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Box,
  Boxes,
  ClipboardCheck,
  FileText,
  Flag,
  Info,
  Layers3,
  Map as MapIcon,
  SlidersHorizontal,
  UploadCloud,
} from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { formatDate } from "../../projects/project.service";
import type { BimIndex, BimQuantities } from "../lib/bimModel";
import { CATEGORY_ICON, COORDINATION_META, ISSUE_STATUS_META, MODEL_STATUS_META, SEVERITY_META, formatArea, formatBytes, relativeTime } from "../data/bim.data";
import type { BimElement, BimIssue, BimModel, CoordinationCheck } from "../types/bim.types";
import { DemoModelNote } from "./BimStates";
import { MetricsCards } from "./MetricsCards";

interface BimDashboardProps {
  projectId: string | null;
  projectName: string;
  model: BimModel | null;
  models: BimModel[];
  quantities: BimQuantities | null;
  index: BimIndex | null;
  tree: { element: BimElement; descendants: number }[];
  issues: BimIssue[];
  issueCounts: { open: number; inReview: number; resolved: number; total: number };
  checks: CoordinationCheck[];
  datasetObjects: number;
  datasetSource: string;
  siteAreaHa: number;
  onOpenMode: (mode: "model" | "coordination" | "issues") => void;
  onSelectElement: (elementId: string) => void;
  /** Activate a model record from the "Recent models" list. */
  onSelectModel: (modelId: string) => void;
  onImport: () => void;
  onSync: () => void;
  syncing: boolean;
}

/**
 * BIM overview (§22) — one screen that answers: what model is loaded, how big is
 * it, what does it agree with, and what is outstanding. Every card links into the
 * mode that owns the detail; nothing here duplicates another module's work.
 */
export function BimDashboard({
  projectId,
  projectName,
  model,
  models,
  quantities,
  index,
  tree,
  issues,
  issueCounts,
  checks,
  datasetObjects,
  datasetSource,
  siteAreaHa,
  onOpenMode,
  onSelectElement,
  onSelectModel,
  onImport,
  onSync,
  syncing,
}: BimDashboardProps) {
  const statusMeta = model ? MODEL_STATUS_META[model.status] : null;
  const ready = checks.filter((c) => c.status === "ready").length;
  const missing = checks.filter((c) => c.status === "missing").length;
  const warnings = checks.filter((c) => c.status === "warning").length;
  const recentModels = [...models].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 4);
  const topIssues = [...issues]
    .sort((a, b) => SEVERITY_META[a.severity].rank - SEVERITY_META[b.severity].rank || Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 4);

  return (
    <div className="h-full min-h-0 flex-1 overflow-y-auto overscroll-contain bg-canvas">
      <div className="mx-auto grid max-w-6xl gap-3 p-3">
        {/* model header */}
        <section aria-labelledby="bim-overview-model" className="rounded-3xl border border-line bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true">
              <Box size={21} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="bim-overview-model" className="truncate text-[17px] font-extrabold tracking-tight text-ink">
                {model?.name ?? "No model"}
              </h2>
              <p className="mt-0.5 truncate text-[12.5px] text-muted">
                {projectName || "Select a project"}
                {model && <> · {model.fileName} · v{model.version} · updated {relativeTime(model.updatedAt)}</>}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {model && statusMeta && (
                  <Badge tone={statusMeta.tone} dot>
                    {statusMeta.label}
                  </Badge>
                )}
                {model && <Badge tone="neutral">{model.format} · {model.schema}</Badge>}
                {model && <Badge tone={model.source === "demo" ? "blue" : "amber"}>{model.source === "demo" ? "Derived demo model" : "Local upload"}</Badge>}
                {models.length > 1 && <Badge tone="neutral">{models.length} model records</Badge>}
                {quantities && <Badge tone="green">{quantities.elements.toLocaleString("en-US")} elements</Badge>}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1.5">
              <Button size="sm" onClick={() => onOpenMode("model")} disabled={!model}>
                <Layers3 size={15} aria-hidden="true" /> Open model
              </Button>
              <Button size="sm" variant="secondary" onClick={onSync} loading={syncing} disabled={!model || syncing}>
                {!syncing && <BarChart3 size={15} aria-hidden="true" />} Re-derive
              </Button>
              <Button size="sm" variant="ghost" onClick={onImport}>
                <UploadCloud size={15} aria-hidden="true" /> Import
              </Button>
            </div>
          </div>

          {model && model.source === "demo" && (
            <DemoModelNote model={model} elementCount={quantities?.elements ?? 0} className="mt-3" />
          )}

          {model?.statusNote && (
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-[12px] leading-relaxed text-ink">
              <Info size={14} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
              {model.statusNote}
            </p>
          )}
        </section>

        {/* quantities */}
        <MetricsCards quantities={quantities} model={model} openIssues={issueCounts.open + issueCounts.inReview} modelCount={models.length} />

        <div className="grid gap-3 lg:grid-cols-2">
          {/* structure */}
          <section aria-labelledby="bim-overview-structure" className="rounded-3xl border border-line bg-white p-4 shadow-soft">
            <div className="flex items-center gap-2">
              <Layers3 size={15} className="shrink-0 text-primary" aria-hidden="true" />
              <h3 id="bim-overview-structure" className="min-w-0 flex-1 text-[13.5px] font-extrabold text-ink">
                Model structure
              </h3>
              <button
                type="button"
                onClick={() => onOpenMode("model")}
                className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-bold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
              >
                Open tree <ArrowRight size={12} aria-hidden="true" />
              </button>
            </div>
            <ul className="mt-2.5 grid gap-1">
              {tree.map((node) => {
                const Icon = CATEGORY_ICON[node.element.category];
                return (
                  <li key={node.element.id}>
                    <button
                      type="button"
                      onClick={() => onSelectElement(node.element.id)}
                      className="flex w-full items-center gap-2.5 rounded-xl border border-line px-2.5 py-2 text-left transition-colors hover:border-primary hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/20"
                    >
                      <Icon size={15} className="shrink-0 text-faint" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-bold text-ink">{node.element.name}</span>
                        <span className="block truncate text-[11px] text-muted">
                          {node.element.category} · {node.descendants.toLocaleString("en-US")} element{node.descendants === 1 ? "" : "s"} below
                        </span>
                      </span>
                      <ArrowRight size={14} className="shrink-0 text-faint" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
              {tree.length === 0 && <li className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-[12px] text-muted">No model structure yet.</li>}
            </ul>
            {index && (
              <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted">
                {index.facets.categories.length} element categories · {index.facets.levels.length} levels · {index.facets.materials.length} materials ·{" "}
                {index.planningIds.size} planning objects mapped
              </p>
            )}
          </section>

          {/* coordination summary */}
          <section aria-labelledby="bim-overview-coordination" className="rounded-3xl border border-line bg-white p-4 shadow-soft">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={15} className="shrink-0 text-primary" aria-hidden="true" />
              <h3 id="bim-overview-coordination" className="min-w-0 flex-1 text-[13.5px] font-extrabold text-ink">
                Coordination
              </h3>
              <button
                type="button"
                onClick={() => onOpenMode("coordination")}
                className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-bold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
              >
                Details <ArrowRight size={12} aria-hidden="true" />
              </button>
            </div>
            <p className="mt-1 text-[11.5px] text-muted" role="status" aria-live="polite">
              {checks.length === 0 ? "Reading the other modules…" : `${ready} ready · ${warnings} warning${warnings === 1 ? "" : "s"} · ${missing} not available yet`}
            </p>
            <ul className="mt-2 grid gap-1">
              {checks.slice(0, 6).map((c) => {
                const meta = COORDINATION_META[c.status];
                return (
                  <li key={c.id} className="flex items-start gap-2 rounded-xl border border-line bg-surface-2 px-2.5 py-1.5">
                    <span className="mt-0.5 shrink-0 text-[12px] font-extrabold" aria-hidden="true">
                      {meta.glyph}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-bold text-ink">
                        {c.label} <span className="font-semibold text-muted">· {meta.label}</span>
                      </span>
                      <span className="block truncate text-[11px] text-muted" title={c.detail}>
                        {c.detail}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* recent models */}
          <section aria-labelledby="bim-overview-models" className="rounded-3xl border border-line bg-white p-4 shadow-soft">
            <div className="flex items-center gap-2">
              <Boxes size={15} className="shrink-0 text-primary" aria-hidden="true" />
              <h3 id="bim-overview-models" className="min-w-0 flex-1 text-[13.5px] font-extrabold text-ink">
                Recent models
              </h3>
              <button
                type="button"
                onClick={() => onOpenMode("coordination")}
                className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-bold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
              >
                Versions <ArrowRight size={12} aria-hidden="true" />
              </button>
            </div>
            <ul className="mt-2 grid gap-1">
              {recentModels.map((m) => {
                const meta = MODEL_STATUS_META[m.status];
                const active = m.id === model?.id;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => onSelectModel(m.id)}
                      disabled={active}
                      aria-current={active ? "true" : undefined}
                      className="flex w-full items-start gap-2 rounded-xl border border-line px-2.5 py-1.5 text-left transition-colors enabled:hover:border-primary enabled:hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/20 disabled:cursor-default disabled:bg-surface-2"
                    >
                      <Badge tone={meta.tone} className="mt-px shrink-0">
                        {meta.label}
                      </Badge>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-bold text-ink">
                          {m.name}
                          {active && <span className="ml-1.5 font-semibold text-primary">· active</span>}
                        </span>
                        <span className="block truncate text-[11px] text-muted">
                          {m.format} · {m.schema} · v{m.version} · {formatBytes(m.sizeBytes)} · {relativeTime(m.updatedAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" onClick={onImport}>
                <UploadCloud size={14} aria-hidden="true" /> Import a model
              </Button>
              <p className="text-[11px] leading-snug text-muted">
                Records are stored locally; file processing needs the BIM backend, so uploads report their real state.
              </p>
            </div>
          </section>

          {/* issues */}
          <section aria-labelledby="bim-overview-issues" className="rounded-3xl border border-line bg-white p-4 shadow-soft">
            <div className="flex items-center gap-2">
              <Flag size={15} className="shrink-0 text-primary" aria-hidden="true" />
              <h3 id="bim-overview-issues" className="min-w-0 flex-1 text-[13.5px] font-extrabold text-ink">
                Coordination issues
              </h3>
              <button
                type="button"
                onClick={() => onOpenMode("issues")}
                className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-bold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
              >
                All issues <ArrowRight size={12} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge tone="neutral">{issueCounts.open} open</Badge>
              <Badge tone="blue">{issueCounts.inReview} in review</Badge>
              <Badge tone="green">{issueCounts.resolved} resolved</Badge>
            </div>
            <ul className="mt-2 grid gap-1">
              {topIssues.map((issue) => (
                <li key={issue.id}>
                  <button
                    type="button"
                    onClick={() => onOpenMode("issues")}
                    className="flex w-full items-start gap-2 rounded-xl border border-line px-2.5 py-1.5 text-left transition-colors hover:border-primary hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/20"
                  >
                    <Badge tone={SEVERITY_META[issue.severity].tone} className="mt-px shrink-0">
                      {SEVERITY_META[issue.severity].label}
                    </Badge>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-bold text-ink">{issue.title}</span>
                      <span className="block truncate text-[11px] text-muted">
                        {issue.location || "No location"} · {ISSUE_STATUS_META[issue.status].label} · {relativeTime(issue.updatedAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {issues.length === 0 && (
                <li className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-[12px] text-muted">
                  No issues recorded for this project.
                </li>
              )}
            </ul>
          </section>

          {/* provenance */}
          <section aria-labelledby="bim-overview-source" className="rounded-3xl border border-line bg-white p-4 shadow-soft">
            <div className="flex items-center gap-2">
              <Info size={15} className="shrink-0 text-primary" aria-hidden="true" />
              <h3 id="bim-overview-source" className="min-w-0 flex-1 text-[13.5px] font-extrabold text-ink">
                Where this model comes from
              </h3>
            </div>
            <dl className="mt-2 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
              <Cell label="Geometry source" value={`${datasetObjects} spatial objects · ${datasetSource}`} />
              <Cell label="Site area" value={formatArea(siteAreaHa * 10_000)} />
              <Cell label="Model record" value={model ? `${formatBytes(model.sizeBytes)} · ${model.versions.length} revisions` : "—"} />
              <Cell label="Derived" value={model ? formatDate(model.updatedAt) : "—"} />
            </dl>
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted">
              Elements are derived in the browser from the same geometry the Planning Studio, GIS visualization and analysis modules use —
              one source of truth, no copied datasets. A real import pipeline (Java / Spring → BIM processing service → IFC engine → object
              storage) replaces the derivation without changing this interface.
            </p>
            {projectId && (
              <nav aria-label="Related modules" className="mt-3 flex flex-wrap gap-1.5">
                {[
                  { to: `/app/planning?projectId=${projectId}`, label: "Planning Studio", icon: SlidersHorizontal },
                  { to: `/app/visualization?projectId=${projectId}`, label: "GIS & 3D", icon: MapIcon },
                  { to: `/app/analysis?projectId=${projectId}`, label: "Analysis", icon: BarChart3 },
                  { to: `/app/reports?projectId=${projectId}`, label: "Reports", icon: FileText },
                ].map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12px] font-bold text-muted shadow-soft transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                  >
                    <l.icon size={13} aria-hidden="true" />
                    {l.label}
                  </Link>
                ))}
              </nav>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-2.5 py-1.5">
      <dt className="text-[10.5px] font-bold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-[12px] font-bold text-ink" title={value}>
        {value}
      </dd>
    </div>
  );
}
