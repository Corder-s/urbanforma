import { lazy, Suspense } from "react";
import { SpatialLoading } from "../../visualization/components/VisualizationStates";
import type { MapViewApi } from "../../visualization/hooks/useMapView";
import { TYPE_LABEL } from "../../visualization/lib/spatial";
import type { CameraPreset, SpatialDataset, SpatialObject } from "../../visualization/types/visualization.types";
import { CHANGE_LEGEND } from "../data/optimization.data";
import type { DerivedSpatialState, ScenarioViewMode, SpatialChangeKind } from "../types/optimization.types";
import { ScenarioMap } from "./ScenarioMap";

/** Three.js is only downloaded when the 3D preview is first opened. */
const ScenarioCityPreview = lazy(() => import("./ScenarioCityPreview").then((m) => ({ default: m.ScenarioCityPreview })));

interface ScenarioVisualizationProps {
  current: SpatialDataset;
  derived: DerivedSpatialState | null;
  scenarioName: string | null;
  viewMode: ScenarioViewMode;
  map: MapViewApi;
  camera: { preset: CameraPreset; token: number };
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

/**
 * Centre visualization: current spatial state → scenario spatial state →
 * 2D map or lazy 3D preview (same Step 12 renderers as Visualization/Analysis).
 */
export function ScenarioVisualization({ current, derived, scenarioName, viewMode, map, camera, selectedId, onSelect }: ScenarioVisualizationProps) {
  if (viewMode === "3d") {
    return (
      <Suspense fallback={<SpatialLoading label="Loading 3D preview…" />}>
        <ScenarioCityPreview current={current} derived={derived} scenarioName={scenarioName} camera={camera} selectedId={selectedId} onSelect={onSelect} />
      </Suspense>
    );
  }
  return <ScenarioMap current={current} derived={derived} scenarioName={scenarioName} map={map} camera={camera} selectedId={selectedId} onSelect={onSelect} />;
}

// ---------------------------------------------------------------------------
// Legend + selected-object chip (shared by desktop overlay and mobile strip)
// ---------------------------------------------------------------------------

export function ChangeLegend({ derived, compact = false, className = "" }: { derived: DerivedSpatialState | null; compact?: boolean; className?: string }) {
  const counts: Record<SpatialChangeKind, number> = { added: 0, modified: 0, removed: 0, unchanged: 0 };
  if (derived) {
    for (const [id, kind] of derived.changeOf) {
      const o = derived.dataset.objects.find((x) => x.id === id);
      if (o && o.type !== "tree") counts[kind]++;
    }
    counts.removed = derived.removed.filter((o) => o.type !== "tree").length;
    counts.unchanged = derived.dataset.objects.filter((o) => o.type !== "tree" && o.type !== "terrain" && o.type !== "context-building" && !derived.changeOf.has(o.id) && !o.id.startsWith("ctx-")).length;
  }
  return (
    <div className={`rounded-2xl border border-line bg-white/95 shadow-soft ${compact ? "px-3 py-2" : "p-3"} ${className}`} role="group" aria-label="Scenario change legend">
      {!compact && <h4 className="text-[11px] font-bold uppercase tracking-widest text-faint">{derived ? "Changes vs current plan" : "Legend"}</h4>}
      <ul className={`${compact ? "flex flex-wrap gap-x-3 gap-y-1" : "mt-2 grid gap-1.5"}`}>
        {CHANGE_LEGEND.map((l) => (
          <li key={l.kind} className="flex items-center gap-2 text-[11.5px]">
            <span className="grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border-2 text-[9px] font-extrabold leading-none" style={{ borderColor: l.stroke, backgroundColor: `${l.fill}55`, color: l.stroke }} aria-hidden="true">
              {l.kind === "added" ? "+" : l.kind === "modified" ? "~" : l.kind === "removed" ? "×" : ""}
            </span>
            <span className="font-bold text-ink">{l.label}</span>
            {derived && <span className="tabular-nums text-muted">{counts[l.kind]}</span>}
            {!compact && <span className="ml-auto hidden text-[10.5px] text-faint xl:inline">{l.description}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SelectedObjectChip({ object, kind, note, onClear }: { object: SpatialObject; kind: SpatialChangeKind | undefined; note: string | undefined; onClear: () => void }) {
  const legend = CHANGE_LEGEND.find((l) => l.kind === (kind ?? "unchanged"));
  const details =
    object.type === "building"
      ? `${object.properties.landUse} · ${object.properties.floors} floors · ${object.properties.populationCapacity.toLocaleString("en-US")} people`
      : object.type === "road" || object.type === "path"
        ? `${object.properties.roadClass} · ${object.geometry.width} m wide · ${object.properties.lengthM.toLocaleString("en-US")} m`
        : object.type === "green" || object.type === "block" || object.type === "water" || object.type === "parking"
          ? `${object.properties.category} · ${(object.properties.areaM2 / 10000).toFixed(2)} ha`
          : TYPE_LABEL[object.type];
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-line bg-white/95 p-3 shadow-soft" role="status">
      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[6px] border-2 text-[10px] font-extrabold" style={{ borderColor: legend?.stroke, backgroundColor: `${legend?.fill}55`, color: legend?.stroke }} aria-hidden="true">
        {kind === "added" ? "+" : kind === "modified" ? "~" : kind === "removed" ? "×" : "="}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-extrabold text-ink">
          {object.name} <span className="font-semibold text-muted">· {legend?.label}</span>
        </p>
        <p className="truncate text-[11px] text-muted">{details}</p>
        {note && <p className="mt-0.5 text-[11px] leading-snug text-ink/80">{note}</p>}
      </div>
      <button type="button" onClick={onClear} aria-label="Clear selection" className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
        ×
      </button>
    </div>
  );
}
