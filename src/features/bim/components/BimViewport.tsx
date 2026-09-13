import type { RefObject } from "react";
import { Box, Crosshair, EyeOff, History, X } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import type { MapViewApi } from "../../visualization/hooks/useMapView";
import type { VisualizationState } from "../../visualization/hooks/useVisualizationState";
import type { CityViewHandle } from "../../visualization/components/3d/CityView";
import type { Annotation } from "../../visualization/types/visualization.types";
import { ViewControls } from "../../visualization/components/ViewControls";
import { VisualizationViewport } from "../../visualization/components/VisualizationViewport";
import { CATEGORY_ICON, SCENE_MODES, formatArea, formatMetres } from "../data/bim.data";
import type { BimElement, BimModel, BimSceneMode } from "../types/bim.types";

const NO_ANNOTATIONS: Annotation[] = [];

interface BimViewportProps {
  /** The shared visualization state, narrowed to what the BIM scene shows. */
  state: VisualizationState;
  map: MapViewApi;
  cityRef: RefObject<CityViewHandle>;
  model: BimModel | null;
  elementCount: number;
  sceneObjectCount: number;
  sceneMode: BimSceneMode;
  onSceneMode: (mode: BimSceneMode) => void;
  selectedElement: BimElement | null;
  onClearSelection: () => void;
  onFocus: (elementId: string) => void;
  /** 0 = the model's latest revision; 1–2 = a historical revision is shown. */
  revision: number;
  onLatestRevision: () => void;
}

/**
 * The BIM viewport — the Step 12/15 renderer with a narrowed object list.
 *
 * No second engine and no second camera: the same `VisualizationState` (and the
 * same `useMapView` transform) drives the 2-D plan and the 3-D city, and the BIM
 * scene modes only decide *which* objects are handed to it. The overlays report
 * what is being shown, so the derived demo model is never mistaken for an
 * imported file.
 */
export function BimViewport({
  state,
  map,
  cityRef,
  model,
  elementCount,
  sceneObjectCount,
  sceneMode,
  onSceneMode,
  selectedElement,
  onClearSelection,
  onFocus,
  revision,
  onLatestRevision,
}: BimViewportProps) {
  const is2d = state.viewMode === "2d";
  const historical = revision > 0 && revision < 3;

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#EEF3F9]">
      <VisualizationViewport state={state} map={map} cityRef={cityRef} presentation={false} annotations={NO_ANNOTATIONS} />

      {/* selected element (top-left, clear of the 2-D north arrow) */}
      {selectedElement && (
        <div className={`pointer-events-none absolute top-3 z-10 w-[min(320px,calc(100%-5.5rem))] ${is2d ? "left-16" : "left-3"}`}>
          <div className="pointer-events-auto">
            <SelectedElementChip element={selectedElement} onFocus={() => onFocus(selectedElement.id)} onClear={onClearSelection} />
          </div>
        </div>
      )}

      {/* scene mode (top-centre, md+) */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-10 hidden justify-center px-3 md:flex">
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-xl border border-line bg-white/95 p-0.5 shadow-soft backdrop-blur" role="group" aria-label="Scene content">
          {SCENE_MODES.map((m) => {
            const on = sceneMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={on}
                title={m.hint}
                onClick={() => onSceneMode(m.id)}
                className={[
                  "inline-flex h-7 items-center rounded-[9px] px-2.5 text-[11.5px] font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                  on ? "bg-primary/10 text-primary" : "text-muted hover:text-ink",
                ].join(" ")}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* view controls (top-right) */}
      <div className="pointer-events-none absolute right-3 top-3 z-10 hidden sm:block">
        <div className="pointer-events-auto">
          <ViewControls state={state} map={map} />
        </div>
      </div>

      {/* model chip (bottom-left, above the 2-D scale bar) */}
      {model && (
        <div className={`pointer-events-none absolute left-3 z-10 w-[min(320px,calc(100%-1.5rem))] ${is2d ? "bottom-14" : "bottom-3"}`}>
          <div className="pointer-events-auto rounded-xl border border-line bg-white/95 p-2.5 shadow-soft backdrop-blur">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                <Box size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-extrabold leading-tight text-ink" title={model.name}>
                  {model.name}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted">
                  v{model.version} · {model.format} · {elementCount.toLocaleString("en-US")} elements · {sceneObjectCount} objects drawn
                </p>
              </div>
              <Badge tone={model.source === "demo" ? "neutral" : "amber"} className="shrink-0">
                {model.source === "demo" ? "Derived" : "Uploaded"}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* historical revision banner */}
      {historical && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center px-3">
          <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 shadow-soft">
            <History size={14} className="shrink-0 text-warning" aria-hidden="true" />
            <p className="text-[11.5px] font-bold text-ink">
              Viewing revision {revision} — an earlier state of this model
              <span className="sr-only">. Elements added in later revisions are hidden.</span>
            </p>
            <button
              type="button"
              onClick={onLatestRevision}
              className="shrink-0 rounded-lg border border-warning/40 bg-white px-2 py-0.5 text-[11px] font-bold text-warning transition-colors hover:bg-warning/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-warning/30"
            >
              Back to latest
            </button>
          </div>
        </div>
      )}

      {/* nothing in this scene */}
      {sceneObjectCount === 0 && !historical && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center p-6">
          <div className="pointer-events-auto max-w-sm rounded-2xl border border-line bg-white/95 p-5 text-center shadow-soft">
            <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-muted" aria-hidden="true">
              <EyeOff size={18} />
            </span>
            <p className="mt-2.5 text-[13px] font-bold text-ink">Nothing to draw in this scene</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">
              The BIM layers or the scene mode hide every object. Switch the scene to <span className="font-bold text-ink">Combined</span> or
              turn the model layers back on.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SelectedElementChip({ element, onFocus, onClear }: { element: BimElement; onFocus: () => void; onClear: () => void }) {
  const Icon = CATEGORY_ICON[element.category];
  const facts = [
    element.level,
    element.material,
    element.area ? formatArea(element.area) : element.length ? formatMetres(element.length) : null,
    element.height ? `${element.height.toFixed(1)} m high` : null,
  ].filter((v): v is string => !!v);
  return (
    <div className="rounded-xl border border-line bg-white/95 p-2.5 shadow-soft backdrop-blur">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
          <Icon size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-extrabold leading-tight text-ink" title={element.name}>
            {element.name}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted">{facts.length > 0 ? facts.join(" · ") : element.category}</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selection"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
        >
          <X size={13} />
        </button>
      </div>
      {element.planningRef && (
        <button
          type="button"
          onClick={onFocus}
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-line px-2 py-1 text-[11.5px] font-bold text-muted transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
        >
          <Crosshair size={12} aria-hidden="true" /> Centre in view · {element.planningRef.objectName}
        </button>
      )}
    </div>
  );
}
