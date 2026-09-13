import { useCallback, useMemo, useRef, useState } from "react";
import type { PlanningState } from "../hooks/usePlanningState";
import type { useCanvasView } from "../hooks/useCanvasView";
import type { AreaObject, BuildingObject, LabelObject, LinearObject, MeasureObject, Point } from "../types/planning.types";
import { CanvasViewport, type CursorMode } from "./canvas/CanvasViewport";
import { SiteLayer } from "./canvas/SiteLayer";
import { WaterLayer } from "./canvas/WaterLayer";
import { LandscapeLayer } from "./canvas/LandscapeLayer";
import { RoadLayer } from "./canvas/RoadLayer";
import { BuildingLayer } from "./canvas/BuildingLayer";
import { AnnotationLayer } from "./canvas/AnnotationLayer";
import { CanvasControls } from "./CanvasControls";
import { CanvasEmptyState } from "./StudioStates";

interface PlanningCanvasProps {
  state: PlanningState;
  camera: ReturnType<typeof useCanvasView>;
}

/**
 * DEMO planning canvas.
 *
 * Composes the SVG layers in draw order (site/context → water → landscape →
 * roads → buildings → annotations). This component is the seam where a real
 * GIS / 3-D engine (MapLibre, Cesium, Three.js…) would be mounted instead:
 * the state hook, tool panel and inspector would not change.
 */
export function PlanningCanvas({ state, camera }: PlanningCanvasProps) {
  const { doc, objects, layers, selection, tool, toolDef, draft, settings } = state;
  const draftKind = tool === "road" || tool === "path" || tool === "measure" ? tool : null;

  // Hover only needs to be *state* while a line tool previews; otherwise it is
  // kept in a ref so mouse movement never re-renders the layers.
  const [hover, setHover] = useState<Point | null>(null);
  const hoverRef = useRef<Point | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const kindRef = useRef(toolDef.kind);
  kindRef.current = toolDef.kind;
  const draftKindRef = useRef(draftKind);
  draftKindRef.current = draftKind;

  const grouped = useMemo(() => {
    const buildings: BuildingObject[] = [];
    const roads: LinearObject[] = [];
    const paths: LinearObject[] = [];
    const water: AreaObject[] = [];
    const areas: AreaObject[] = [];
    const labels: LabelObject[] = [];
    const measures: MeasureObject[] = [];
    for (const o of objects) {
      switch (o.type) {
        case "building":
          buildings.push(o);
          break;
        case "road":
          roads.push(o);
          break;
        case "path":
          paths.push(o);
          break;
        case "water":
          water.push(o);
          break;
        case "label":
          labels.push(o);
          break;
        case "measure":
          measures.push(o);
          break;
        default:
          areas.push(o);
      }
    }
    return { buildings, roads, paths, water, areas, labels, measures };
  }, [objects]);

  const selectedId = selection && selection !== "site" ? selection : null;
  const interactive = toolDef.kind === "select";
  const cursor: CursorMode = toolDef.kind;
  const scale = camera.view.scale;

  /**
   * Objects call this on click. With the Select tool it selects; with a
   * drawing tool active the click is treated as a canvas click at the hover
   * position, so users can place/draw on top of existing elements.
   */
  const onObjectClick = useCallback((id: string) => {
    const s = stateRef.current;
    const kind = kindRef.current;
    if (kind === "select") {
      s.select(id);
      return;
    }
    if (kind === "site") {
      s.select("site");
      return;
    }
    if (hoverRef.current) s.canvasClick(hoverRef.current);
  }, []);
  const onSiteClick = useCallback(() => onObjectClick("site"), [onObjectClick]);
  const onBackgroundClick = useCallback((p: Point) => stateRef.current.canvasClick(p), []);
  const onHover = useCallback((p: Point | null) => {
    hoverRef.current = p;
    if (draftKindRef.current) setHover(p);
    else setHover((h) => (h === null ? h : null));
  }, []);

  if (!doc) return null;

  const empty = objects.length === 0;

  return (
    <div className="relative h-full min-h-0 w-full">
      <CanvasViewport
        containerRef={camera.containerRef}
        setContainerRef={camera.setContainerRef}
        view={camera.view}
        size={camera.size}
        cursor={cursor}
        showGrid={settings.showGrid}
        world={doc.site.world}
        onBackgroundClick={onBackgroundClick}
        onBackgroundDoubleClick={state.finishDraft}
        onPan={camera.panBy}
        onZoomAt={camera.zoomAt}
        onHover={onHover}
        onObjectDragMove={state.moveObject}
        onObjectDragEnd={state.endMove}
        dragEnabled={interactive}
        ariaLabel={`Planning canvas. ${objects.length} objects. Demo canvas, not a real GIS engine.`}
      >
        <SiteLayer site={doc.site} layers={layers} selected={selection === "site"} onSelect={onSiteClick} scale={scale} />
        {layers.water && <WaterLayer water={grouped.water} selectedId={selectedId} scale={scale} onSelect={onObjectClick} interactive={interactive} />}
        <LandscapeLayer areas={grouped.areas} selectedId={selectedId} scale={scale} showGreen={layers.green} onSelect={onObjectClick} interactive={interactive} />
        {layers.roads && <RoadLayer roads={grouped.roads} paths={grouped.paths} water={layers.water ? grouped.water : undefined} selectedId={selectedId} scale={scale} onSelect={onObjectClick} interactive={interactive} />}
        {layers.buildings && (
          <BuildingLayer buildings={grouped.buildings} selectedId={selectedId} scale={scale} showLabels={settings.showLabels} onSelect={onObjectClick} interactive={interactive} />
        )}
        <AnnotationLayer
          labels={grouped.labels}
          measures={grouped.measures}
          draft={draft}
          draftKind={draftKind}
          hover={draftKind ? hover : null}
          selectedId={selectedId}
          scale={scale}
          showLabels={settings.showLabels}
          onSelect={onObjectClick}
          interactive={interactive}
        />
      </CanvasViewport>

      {/* Overlays live inside the canvas box only (small, non-blocking). */}
      <CanvasControls camera={camera} />

      <div className="pointer-events-none absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2">
        <span className="rounded-lg border border-line bg-surface/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted shadow-soft">
          Demo canvas · not a GIS engine
        </span>
        {draftKind && draft.length > 0 && (
          <span className="rounded-lg border border-primary/30 bg-surface/95 px-2.5 py-1 text-[12px] font-semibold text-primary shadow-soft" role="status">
            {draft.length} point{draft.length === 1 ? "" : "s"} · double-click or Enter to finish · Esc to cancel
          </span>
        )}
      </div>

      {empty && <CanvasEmptyState />}
    </div>
  );
}
