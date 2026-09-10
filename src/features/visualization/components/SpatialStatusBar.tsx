import { getBasemap } from "../data/visualization.data";
import type { VisualizationState } from "../hooks/useVisualizationState";
import type { MapViewApi } from "../hooks/useMapView";

function Item({ label, value, className = "" }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex min-w-0 items-baseline gap-1.5 ${className}`}>
      <span className="text-[10.5px] font-bold uppercase tracking-wider text-faint">{label}</span>
      <span className="truncate text-[12px] font-semibold text-ink">{value}</span>
    </span>
  );
}

/** Compact spatial status bar (viewport only, never in the global shell). */
export function SpatialStatusBar({ state, map }: { state: VisualizationState; map: MapViewApi }) {
  const { selectedObject, viewMode, visibleObjects, featureCount, basemap, scenarioLabel } = state;
  const selected = selectedObject ? (selectedObject.type === "building" ? `Building ${selectedObject.name}` : selectedObject.name) : "None";
  const visibleFeatures = visibleObjects.filter((o) => o.selectable && o.type !== "boundary").length;
  return (
    <div className="flex h-8 shrink-0 items-center gap-4 overflow-hidden border-t border-line bg-white px-3 text-xs sm:gap-5" aria-label="Spatial status">
      <Item label="Selected" value={selected} className="min-w-0 max-w-[40%] shrink" />
      <Item label="View" value={viewMode === "2d" ? "2D Map" : "3D City"} />
      <Item label="Scenario" value={scenarioLabel} className="min-w-0 shrink" />
      {viewMode === "2d" && <Item label="Scale" value={map.scaleLabel} className="hidden sm:inline-flex" />}
      <Item label="Features" value={`${visibleFeatures.toLocaleString("en-US")} / ${featureCount.toLocaleString("en-US")}`} className="hidden md:inline-flex" />
      <Item label="Basemap" value={getBasemap(basemap).label} className="hidden lg:inline-flex" />
      <Item label="CRS" value="Local / Demo" className="ml-auto hidden sm:inline-flex" />
    </div>
  );
}
