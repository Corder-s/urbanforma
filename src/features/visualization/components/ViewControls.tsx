import { Box, Focus, Home, Minus, Plus, Square } from "lucide-react";
import type { VisualizationState } from "../hooks/useVisualizationState";
import type { MapViewApi } from "../hooks/useMapView";

interface ViewControlsProps {
  state: VisualizationState;
  map: MapViewApi;
  /** Compact horizontal layout for the phone bottom bar. */
  compact?: boolean;
}

const btn = "grid h-9 w-9 place-items-center text-muted transition-colors hover:bg-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/20 disabled:opacity-40";

/** Camera controls shared by both renderers (zoom for 2D, presets for both). */
export function ViewControls({ state, map, compact = false }: ViewControlsProps) {
  const is3d = state.viewMode === "3d";
  const groupCls = compact ? "flex items-center divide-x divide-line overflow-hidden rounded-xl border border-line bg-white shadow-soft" : "flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line bg-white shadow-soft";
  return (
    <div className={compact ? "flex items-center gap-2" : "flex flex-col gap-2"} role="group" aria-label="View controls">
      {!is3d && (
        <div className={groupCls}>
          <button type="button" className={btn} onClick={map.zoomIn} aria-label="Zoom in" title="Zoom in (+)">
            <Plus size={17} />
          </button>
          <button type="button" className={btn} onClick={map.zoomOut} aria-label="Zoom out" title="Zoom out (−)">
            <Minus size={17} />
          </button>
        </div>
      )}
      <div className={groupCls}>
        <button type="button" className={btn} onClick={() => state.requestCamera("fit")} aria-label="Fit site" title="Fit Site (F)">
          <Focus size={17} />
        </button>
        {is3d && (
          <>
            <button type="button" className={btn} onClick={() => state.requestCamera("top")} aria-label="Top view" title="Top View (T)">
              <Square size={16} />
            </button>
            <button type="button" className={btn} onClick={() => state.requestCamera("perspective")} aria-label="Perspective view" title="Perspective (P)">
              <Box size={17} />
            </button>
          </>
        )}
        <button type="button" className={btn} onClick={() => state.requestCamera("reset")} aria-label="Reset view" title={is3d ? "Reset View (R)" : "Reset View (0)"}>
          <Home size={16} />
        </button>
      </div>
    </div>
  );
}
