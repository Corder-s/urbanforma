import { lazy, Suspense, type RefObject } from "react";
import { getTheme } from "../data/presentation.data";
import type { MapViewApi } from "../hooks/useMapView";
import type { VisualizationState } from "../hooks/useVisualizationState";
import type { Annotation } from "../types/visualization.types";
import type { CityViewHandle } from "./3d/CityView";
import { MapView, type AnnotationEditorHandlers } from "./map/MapView";
import { SpatialLoading } from "./VisualizationStates";

/** Three.js is only downloaded when the 3D City view is first opened. */
const CityView = lazy(() => import("./3d/CityView").then((m) => ({ default: m.CityView })));

interface VisualizationViewportProps {
  state: VisualizationState;
  map: MapViewApi;
  cityRef: RefObject<CityViewHandle>;
  /** Present mode: features are decoration, furniture follows the presentation settings, theme backdrop applies. */
  presentation: boolean;
  annotations: Annotation[];
  annotationEditor?: AnnotationEditorHandlers;
}

/**
 * The one renderer slot shared by Explore, Present and the slide show — the
 * 2-D map or the 3-D city (same VisualizationState). Mode changes only swap
 * the chrome around it, so the camera and the Three.js scene survive.
 */
export function VisualizationViewport({ state, map, cityRef, presentation, annotations, annotationEditor }: VisualizationViewportProps) {
  const theme = getTheme(state.presentation.presentation?.theme ?? "urban");
  const dark = presentation && !!theme.backdrop;
  const ps = state.presentation.presentation?.settings;
  const furniture = presentation ? { northArrow: false, scaleBar: !!ps?.showScale } : undefined;
  return (
    <div className={`h-full w-full ${dark ? `${theme.backdrop} p-2 sm:p-4` : ""}`} data-presentation={presentation ? "true" : undefined}>
      <div className={`relative h-full w-full ${dark ? "overflow-hidden rounded-xl" : ""}`}>
        {state.viewMode === "2d" ? (
          <MapView state={state} map={map} annotations={annotations} presentation={presentation} furniture={furniture} annotationEditor={annotationEditor} />
        ) : (
          <Suspense fallback={<SpatialLoading label="Loading 3D engine…" />}>
            <CityView ref={cityRef} state={state} annotations={annotations} presentation={presentation} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
