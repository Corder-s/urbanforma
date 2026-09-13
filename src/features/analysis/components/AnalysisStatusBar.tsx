import type { MapViewApi } from "../../visualization/hooks/useMapView";
import { getCategory } from "../data/analysis.data";
import type { AnalysisState } from "../hooks/useAnalysisState";

function Item({ label, value, className = "" }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex min-w-0 items-baseline gap-1.5 ${className}`}>
      <span className="text-[10.5px] font-bold uppercase tracking-wider text-faint">{label}</span>
      <span className="truncate text-[12px] font-semibold text-ink">{value}</span>
    </span>
  );
}

const STATUS_LABEL = { idle: "Idle", running: "Running…", complete: "Complete", error: "Error" } as const;
const STATUS_DOT = { idle: "bg-faint", running: "bg-primary", complete: "bg-success", error: "bg-danger" } as const;

/** Compact module status bar (never in the global shell). */
export function AnalysisStatusBar({ state, map }: { state: AnalysisState; map: MapViewApi }) {
  const { analysisStatus, activeCategory, selectedArea, selectedZone, selectedBuilding, lastRun, viewMode, result } = state;
  const selected = selectedZone ? selectedZone.label : selectedBuilding ? (selectedBuilding.type === "building" ? `Building ${selectedBuilding.name}` : selectedBuilding.name) : selectedArea ?? "None";
  const lastRunLabel = lastRun ? new Date(lastRun).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Not run yet";
  return (
    <div className="flex h-8 shrink-0 items-center gap-4 overflow-hidden border-t border-line bg-surface px-3 text-xs sm:gap-5" aria-label="Analysis status">
      <span className="inline-flex shrink-0 items-center gap-1.5" role="status" aria-live="polite">
        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[analysisStatus]} ${analysisStatus === "running" ? "animate-pulse motion-reduce:animate-none" : ""}`} aria-hidden="true" />
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-faint">Analysis</span>
        <span className="text-[12px] font-semibold text-ink">{STATUS_LABEL[analysisStatus]}</span>
      </span>
      <Item label="View" value={getCategory(activeCategory).label} className="hidden sm:inline-flex" />
      <Item label="Selected" value={selected} className="min-w-0 max-w-[36%] shrink" />
      {viewMode === "2d" && <Item label="Scale" value={map.scaleLabel} className="hidden md:inline-flex" />}
      <Item label="Last run" value={lastRunLabel} className="hidden lg:inline-flex" />
      <Item label="Engine" value={result ? `Demo ${result.engine.version}` : "Demo"} className="ml-auto hidden sm:inline-flex" />
    </div>
  );
}
