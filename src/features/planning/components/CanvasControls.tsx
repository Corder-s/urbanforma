import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import type { useCanvasView } from "../hooks/useCanvasView";

interface CanvasControlsProps {
  camera: ReturnType<typeof useCanvasView>;
}

const btn =
  "grid h-9 w-9 place-items-center text-muted transition-colors hover:bg-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-40";

/** Compact zoom / fit / reset cluster in the canvas corner. */
export function CanvasControls({ camera }: CanvasControlsProps) {
  return (
    <div className="absolute bottom-3 right-3 flex flex-col items-end gap-2">
      <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-soft" role="group" aria-label="Zoom controls">
        <button type="button" className={btn} onClick={camera.zoomIn} disabled={!camera.canZoomIn} aria-label="Zoom in" title="Zoom in (+)">
          <Plus size={17} />
        </button>
        <button
          type="button"
          className="h-8 border-y border-line px-1 text-[11px] font-bold tabular-nums text-ink transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          onClick={camera.zoomTo100}
          aria-label={`Zoom ${camera.zoomPercent} percent, set to 100 percent`}
          title="Zoom to 100%"
        >
          {camera.zoomPercent}%
        </button>
        <button type="button" className={btn} onClick={camera.zoomOut} disabled={!camera.canZoomOut} aria-label="Zoom out" title="Zoom out (−)">
          <Minus size={17} />
        </button>
      </div>
      <div className="flex overflow-hidden rounded-xl border border-line bg-surface shadow-soft" role="group" aria-label="View controls">
        <button type="button" className={`${btn} border-r border-line`} onClick={camera.fitSite} aria-label="Fit site" title="Fit site (F)">
          <Maximize2 size={16} />
        </button>
        <button type="button" className={btn} onClick={camera.resetView} aria-label="Reset view" title="Reset view (0)">
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}
