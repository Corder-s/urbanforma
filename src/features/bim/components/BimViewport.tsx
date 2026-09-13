import { useCallback, useEffect, useRef, type RefObject } from "react";
import { Box, Crosshair, EyeOff, History, Orbit, X } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import type { MapViewApi } from "../../visualization/hooks/useMapView";
import type { VisualizationState } from "../../visualization/hooks/useVisualizationState";
import type { CityViewHandle } from "../../visualization/components/3d/CityView";
import type { Annotation } from "../../visualization/types/visualization.types";
import { ViewControls } from "../../visualization/components/ViewControls";
import { VisualizationViewport } from "../../visualization/components/VisualizationViewport";
import { CATEGORY_ICON, SCENE_MODES, formatArea, formatMetres } from "../data/bim.data";
import type { BimElement, BimModel, BimSceneMode } from "../types/bim.types";
import type { BimInspect360Api } from "../hooks/useBimInspect360";
import { Inspect360Bar } from "./Inspect360Bar";

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
  /** 360° inspection state (playback lives here; the turntable lives in the rig). */
  inspect: BimInspect360Api;
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
  inspect,
}: BimViewportProps) {
  const is2d = state.viewMode === "2d";
  const historical = revision > 0 && revision < 3;
  const inspecting = inspect.active;
  /** Azimuth readout — written by the scene, never through React state. */
  const angleRef = useRef<HTMLSpanElement>(null);

  // Drive the shared 3-D scene from the inspection state. `state.viewMode` is in
  // the deps because entering from a 2-D plan mounts the scene *after* this runs;
  // CityView also replays a request that arrived before its scene existed, so the
  // tour starts either way.
  useEffect(() => {
    const city = cityRef.current;
    if (!city) return;
    if (!inspecting) {
      city.inspect360(null);
      return;
    }
    city.inspect360({
      objectId: inspect.targetObjectId,
      playing: inspect.playing && !inspect.needs3d,
      speed: inspect.speed,
      clockwise: inspect.clockwise,
      onAngle: (degrees) => {
        if (angleRef.current) angleRef.current.textContent = `${Math.round(degrees)}°`;
      },
    });
  }, [cityRef, state.viewMode, inspecting, inspect.targetObjectId, inspect.playing, inspect.speed, inspect.clockwise, inspect.needs3d]);

  const inspectLabel = inspect.targetElementId ? "Inspect the selected element 360°" : "Orbit the whole model 360°";
  /** Stable: the bar keeps its keydown listener across renders. */
  const handleNudge = useCallback((degrees: number) => cityRef.current?.nudge360(degrees), [cityRef]);
  const vizSetViewMode = state.setViewMode;
  const handleSwitchTo3d = useCallback(() => vizSetViewMode("3d"), [vizSetViewMode]);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#EEF3F9]">
      <VisualizationViewport state={state} map={map} cityRef={cityRef} presentation={false} annotations={NO_ANNOTATIONS} />

      {/* selected element (top-left, clear of the 2-D north arrow) */}
      {selectedElement && (
        <div className={`pointer-events-none absolute top-3 z-10 w-[min(320px,calc(100%-5.5rem))] ${is2d ? "left-16" : "left-3"}`}>
          <div className="pointer-events-auto">
            <SelectedElementChip
              element={selectedElement}
              onFocus={() => onFocus(selectedElement.id)}
              onClear={onClearSelection}
              onInspect360={() => (inspecting ? inspect.exit() : inspect.enter(selectedElement))}
              inspecting360={inspecting}
            />
          </div>
        </div>
      )}

      {/* scene mode (top-centre, md+) — hidden while an inspection isolates one object */}
      <div className={`pointer-events-none absolute inset-x-0 top-3 z-10 hidden justify-center px-3 ${inspecting ? "" : "md:flex"}`}>
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-xl border border-line bg-surface/95 p-0.5 shadow-soft backdrop-blur" role="group" aria-label="Scene content">
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

      {/* view controls + 360° entry (top-right) */}
      <div className="pointer-events-none absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={() => (inspecting ? inspect.exit() : inspect.enter(selectedElement))}
            aria-pressed={inspecting}
            title={inspecting ? "Exit the 360° inspection (Esc)" : inspectLabel + (is2d ? " — switches to 3-D" : "")}
            className={[
              "grid h-9 w-9 place-items-center rounded-xl border shadow-soft transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/20 motion-reduce:transition-none",
              inspecting ? "border-primary/40 bg-primary/10 text-primary" : "border-line bg-surface text-muted hover:text-primary",
            ].join(" ")}
          >
            <Orbit size={17} aria-hidden="true" />
            <span className="sr-only">{inspecting ? "Exit 360° inspection" : inspectLabel}</span>
          </button>
        </div>
        <div className="pointer-events-auto hidden sm:block">
          <ViewControls state={state} map={map} />
        </div>
      </div>

      {/* model chip (bottom-left, above the 2-D scale bar) — the bar replaces it while inspecting */}
      {model && !inspecting && (
        <div className={`pointer-events-none absolute left-3 z-10 w-[min(320px,calc(100%-1.5rem))] ${is2d ? "bottom-14" : "bottom-3"}`}>
          <div className="pointer-events-auto rounded-xl border border-line bg-surface/95 p-2.5 shadow-soft backdrop-blur">
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

      {/* 360° inspection bar (bottom-centre, above a revision banner when both show) */}
      {inspecting && (
        <div className={`pointer-events-none absolute inset-x-0 z-20 flex justify-center px-3 ${historical ? "bottom-16" : is2d ? "bottom-14" : "bottom-3"}`}>
          <Inspect360Bar
            inspect={inspect}
            angleRef={angleRef}
            onSwitchTo3d={handleSwitchTo3d}
            onNudge={handleNudge}
          />
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
              className="shrink-0 rounded-lg border border-warning/40 bg-surface px-2 py-0.5 text-[11px] font-bold text-warning transition-colors hover:bg-warning/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-warning/30"
            >
              Back to latest
            </button>
          </div>
        </div>
      )}

      {/* nothing in this scene */}
      {sceneObjectCount === 0 && !historical && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center p-6">
          <div className="pointer-events-auto max-w-sm rounded-2xl border border-line bg-surface/95 p-5 text-center shadow-soft">
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

function SelectedElementChip({
  element,
  onFocus,
  onClear,
  onInspect360,
  inspecting360,
}: {
  element: BimElement;
  onFocus: () => void;
  onClear: () => void;
  onInspect360: () => void;
  inspecting360: boolean;
}) {
  const Icon = CATEGORY_ICON[element.category];
  const facts = [
    element.level,
    element.material,
    element.area ? formatArea(element.area) : element.length ? formatMetres(element.length) : null,
    element.height ? `${element.height.toFixed(1)} m high` : null,
  ].filter((v): v is string => !!v);
  return (
    <div className="rounded-xl border border-line bg-surface/95 p-2.5 shadow-soft backdrop-blur">
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
        <div className="mt-2 flex items-stretch gap-1.5">
          <button
            type="button"
            onClick={onFocus}
            className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line px-2 py-1 text-[11.5px] font-bold text-muted transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          >
            <Crosshair size={12} aria-hidden="true" />
            <span className="truncate">Centre in view · {element.planningRef.objectName}</span>
          </button>
          <button
            type="button"
            onClick={onInspect360}
            aria-pressed={inspecting360}
            title={inspecting360 ? "Exit the 360° inspection (Esc)" : "Isolate this element and orbit it 360°"}
            className={[
              "inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[11.5px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
              inspecting360 ? "border-primary/40 bg-primary/10 text-primary" : "border-line text-muted hover:border-primary hover:text-primary",
            ].join(" ")}
          >
            <Orbit size={12} aria-hidden="true" /> 360°
          </button>
        </div>
      )}
    </div>
  );
}
