import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { IconButton } from "../../../components/ui/IconButton";
import { DataTable, StatusTag, type DocColumn, type DocTone } from "../../reports/components/ReportTables";
import { COORDINATION_META, formatArea, formatMetres } from "../data/bim.data";
import type { BimCoordinationApi } from "../hooks/useBimCoordination";
import type { BimPlanningLink, CoordinationCheck } from "../types/bim.types";

interface CoordinationPanelProps {
  coordination: BimCoordinationApi;
  projectId: string | null;
  onSelectElement: (elementId: string) => void;
  onClose?: () => void;
}

const TONE: Record<CoordinationCheck["status"], DocTone> = {
  ready: "good",
  warning: "watch",
  missing: "neutral",
  processing: "accent",
};

/**
 * Coordination — what this model agrees with, and what it cannot check yet.
 *
 * Each row carries the evidence behind it (counts, comparisons, module states)
 * and the things a frontend release genuinely cannot do (clash detection, IFC
 * parsing, an authored MEP model) are reported as *missing* with a reason rather
 * than dressed up as a passing check.
 */
export function CoordinationPanel({ coordination, projectId, onSelectElement, onClose }: CoordinationPanelProps) {
  const { checks, links, load, analysisInputs } = coordination;
  const ready = checks.filter((c) => c.status === "ready").length;
  const warnings = checks.filter((c) => c.status === "warning").length;

  const detailed = analysisInputs.filter((i) => i.detailed).length;
  const facadeTotal = analysisInputs.reduce((sum, i) => sum + (i.facadeAreaM2 ?? 0), 0);
  const roofTotal = analysisInputs.reduce((sum, i) => sum + (i.roofAreaM2 ?? 0), 0);

  const rows = useMemo(() => links.map((l) => ({ ...l, id: l.elementId })), [links]);
  const columns: DocColumn<BimPlanningLink & { id: string }>[] = [
    {
      key: "element",
      header: "BIM element",
      render: (row) => (
        <button
          type="button"
          onClick={() => onSelectElement(row.elementId)}
          className="text-left font-bold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          title={`Select ${row.bimName} in the model`}
        >
          {row.bimName}
        </button>
      ),
    },
    {
      key: "planning",
      header: "Planning object",
      render: (row) => (
        <span className="whitespace-nowrap">
          {row.planningName} <span className="font-mono text-[11px] text-muted">{row.planningObjectId}</span>
        </span>
      ),
    },
    { key: "use", header: "Land use", render: (row) => row.landUse },
    { key: "floors", header: "Floors", align: "right", render: (row) => String(row.floors) },
    { key: "height", header: "Height", align: "right", render: (row) => formatMetres(row.heightM) },
    { key: "footprint", header: "Footprint", align: "right", render: (row) => formatArea(row.footprintM2) },
    { key: "gfa", header: "Gross floor area", align: "right", render: (row) => formatArea(row.grossFloorAreaM2) },
    { key: "volume", header: "Volume", align: "right", render: (row) => `${Math.round(row.volumeM3).toLocaleString("en-US")} m³` },
    { key: "street", header: "Nearest street", align: "right", render: (row) => (row.nearestStreetM === null ? "—" : formatMetres(row.nearestStreetM)) },
    { key: "green", header: "Green ≤150 m", align: "right", render: (row) => (row.greenSharePct === null ? "—" : `${row.greenSharePct.toFixed(1)}%`) },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2.5">
        <ShieldCheck size={16} className="shrink-0 text-primary" aria-hidden="true" />
        <h2 className="min-w-0 flex-1 truncate text-[13.5px] font-extrabold text-ink">Coordination</h2>
        <span className="shrink-0 text-[11.5px] text-muted" role="status" aria-live="polite">
          {load.status === "loading"
            ? "Reading the other modules…"
            : `${ready} ready · ${warnings} warning${warnings === 1 ? "" : "s"} · ${Math.max(0, checks.length - ready - warnings)} not available`}
        </span>
        <IconButton icon={RefreshCw} label="Re-read coordination sources" size="sm" onClick={coordination.reload} className="shrink-0" />
        {onClose && (
          <Button size="sm" variant="ghost" onClick={onClose} className="shrink-0">
            Close
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        <section aria-labelledby="bim-checks" className="rounded-2xl border border-line bg-surface p-3 shadow-soft">
          <h3 id="bim-checks" className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-ink">
            <ClipboardCheck size={14} className="text-primary" aria-hidden="true" /> Model checks
          </h3>
          <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
            Evidence from the modules that already exist — planning, analysis, optimization and reports. Nothing here is a substitute for a
            clash engine or a parsed IFC file.
          </p>
          {load.status === "loading" ? (
            <ul className="mt-2.5 grid gap-1.5" aria-busy="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <li key={i} className="h-11 animate-pulse rounded-xl bg-surface-2 motion-reduce:animate-none" />
              ))}
            </ul>
          ) : (
            <ul className="mt-2.5 grid gap-1.5">
              {checks.map((c) => {
                const meta = COORDINATION_META[c.status];
                return (
                  <li key={c.id} className="flex items-start gap-2.5 rounded-xl border border-line bg-surface-2 px-2.5 py-2">
                    <span className="mt-px shrink-0">
                      <StatusTag tone={TONE[c.status]} glyph={meta.glyph}>
                        {meta.label}
                      </StatusTag>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-bold text-ink">{c.label}</p>
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{c.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {analysisInputs.length > 0 && (
            <p className="mt-2.5 rounded-xl border border-line bg-surface-2 px-2.5 py-2 text-[11.5px] leading-relaxed text-muted">
              <strong className="font-extrabold text-ink">BIM → Analysis.</strong> The model exposes height, footprint, floor area and
              volume for {analysisInputs.length} building{analysisInputs.length === 1 ? "" : "s"}
              {detailed > 0
                ? `, plus facade (${formatArea(facadeTotal)}) and roof (${formatArea(roofTotal)}) surfaces for the ${detailed} modelled in detail,`
                : ","}{" "}
              as a typed feed (<code className="font-mono text-[11px] text-ink">getBimAnalysisInputs</code>). The Step 13 engine is
              unchanged and still computes its metrics from planning geometry — nothing is recalculated here.
            </p>
          )}
        </section>

        <section aria-labelledby="bim-links" className="mt-3 rounded-2xl border border-line bg-surface p-3 shadow-soft">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 id="bim-links" className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-ink">
              <ExternalLink size={14} className="text-primary" aria-hidden="true" /> BIM ↔ planning quantities
            </h3>
            <p className="text-[11.5px] text-muted">
              {links.length} modelled building{links.length === 1 ? "" : "s"} · click a name to select it in the model
            </p>
          </div>
          <div className="mt-2">
            <DataTable
              caption="Model quantities next to the planning record and the site context"
              columns={columns}
              rows={rows}
              dense
              empty="No modelled buildings to compare yet."
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            “Green ≤150 m” is the share of green space inside a 150 m radius of the building, computed from the same polygons the analysis
            module uses. “Nearest street” is the distance to the closest road vertex.
          </p>
        </section>

        {projectId && (
          <nav aria-label="Related modules" className="mt-3 flex flex-wrap gap-1.5">
            {[
              { to: `/app/planning?projectId=${projectId}`, label: "Planning Studio" },
              { to: `/app/analysis?projectId=${projectId}`, label: "Analysis" },
              { to: `/app/optimization?projectId=${projectId}`, label: "Optimization" },
              { to: `/app/reports?projectId=${projectId}`, label: "Reports" },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] font-bold text-muted shadow-soft transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
              >
                {l.label}
                <ExternalLink size={12} aria-hidden="true" />
              </Link>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
