import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useMapGestures } from "../../hooks/useMapGestures";
import type { MapViewApi } from "../../hooks/useMapView";
import type { VisualizationState } from "../../hooks/useVisualizationState";
import { getBasemap, getTimeOfDay, getAtmosphere } from "../../data/visualization.data";
import { planShadow } from "../../lib/lighting";
import { geometryBounds, objectCenter } from "../../lib/spatial";
import type {
  Annotation,
  AreaObject,
  BoundaryObject,
  BuildingObject,
  ContextBuildingObject,
  PoiObject,
  RoadObject,
  TerrainObject,
  TransitObject,
  TreeObject,
  UtilityObject,
} from "../../types/visualization.types";
import { AnnotationLayer } from "./AnnotationLayer";
import { BlockLayer } from "./BlockLayer";
import { BuildingLayer } from "./BuildingLayer";
import { LandscapeLayer } from "./LandscapeLayer";
import { PoiLayer } from "./PoiLayer";
import { RoadLayer } from "./RoadLayer";
import { SiteLayer } from "./SiteLayer";
import { WaterLayer } from "./WaterLayer";

export interface AnnotationEditorHandlers {
  activeId: string | null;
  onPick: (id: string) => void;
  onMove: (id: string, position: { x: number; y: number }) => void;
}

interface MapViewProps {
  state: VisualizationState;
  map: MapViewApi;
  /** Presentation annotations drawn over the plan (already filtered by the caller). */
  annotations?: Annotation[];
  /** Present mode: features are decoration (no selection), furniture follows the presentation settings. */
  presentation?: boolean;
  /** Show the built-in north arrow / scale bar (Explore: scene settings; Present: presentation settings). */
  furniture?: { northArrow: boolean; scaleBar: boolean };
  /** Annotation editing: the active annotation and a move callback (drag on the map). */
  annotationEditor?: AnnotationEditorHandlers;
}

const NO_ANNOTATIONS: Annotation[] = [];

/**
 * 2-D renderer. Draws the SpatialState as layered SVG in a pan/zoom viewport.
 * The camera lives in `useMapView`; this component only maps data → paint.
 * Replaceable by MapLibre/OpenLayers later — the layer split mirrors what a
 * style spec would need.
 */
export function MapView({ state, map, annotations = NO_ANNOTATIONS, presentation = false, furniture, annotationEditor }: MapViewProps) {
  const { data, visibleObjects, selection: rawSelection, select, settings, basemap: basemapId, camera, cameraApplied, request, requestApplied, focus } = state;
  const basemap = getBasemap(basemapId);
  const { view, size, setContainerRef } = map;
  const patternId = useId();
  const selection = presentation ? null : rawSelection;
  const interactive = !presentation;
  const shadow = useMemo(() => planShadow(settings), [settings]);
  const tod = getTimeOfDay(settings.timeOfDay);
  const atmosphere = getAtmosphere(settings.atmosphere);
  const showNorth = furniture ? furniture.northArrow : settings.northArrow;
  const showScale = furniture ? furniture.scaleBar : settings.scaleBar;

  // --- group visible objects by renderer -------------------------------------------
  const groups = useMemo(() => {
    const g = {
      boundary: null as BoundaryObject | null,
      ctxBuildings: [] as ContextBuildingObject[],
      ctxRoads: [] as RoadObject[],
      contours: [] as TerrainObject[],
      water: [] as AreaObject[],
      blocks: [] as AreaObject[],
      parking: [] as AreaObject[],
      green: [] as AreaObject[],
      trees: [] as TreeObject[],
      roads: [] as RoadObject[],
      transit: [] as TransitObject[],
      utilities: [] as UtilityObject[],
      buildings: [] as BuildingObject[],
      pois: [] as PoiObject[],
    };
    for (const o of visibleObjects) {
      switch (o.type) {
        case "boundary":
          g.boundary = o;
          break;
        case "context-building":
          g.ctxBuildings.push(o);
          break;
        case "terrain":
          g.contours.push(o);
          break;
        case "water":
          g.water.push(o);
          break;
        case "block":
          g.blocks.push(o);
          break;
        case "parking":
          g.parking.push(o);
          break;
        case "green":
          g.green.push(o);
          break;
        case "tree":
          g.trees.push(o);
          break;
        case "road":
        case "path":
          if (o.id.startsWith("ctx-")) g.ctxRoads.push(o);
          else g.roads.push(o);
          break;
        case "transit":
          g.transit.push(o);
          break;
        case "utility":
          g.utilities.push(o);
          break;
        case "building":
          g.buildings.push(o);
          break;
        case "poi":
          g.pois.push(o);
          break;
      }
    }
    return g;
  }, [visibleObjects]);

  // The boundary plate must be drawn even when the "Site Boundary" layer is off
  // (the layer toggles the outline, not the ground).
  const boundaryObj = useMemo(() => (state.objects.find((o) => o.type === "boundary") as BoundaryObject | undefined) ?? null, [state.objects]);

  // --- camera presets + focus ------------------------------------------------------------
  useEffect(() => {
    if (camera.token === cameraApplied.current || size.width === 0 || !data) return;
    cameraApplied.current = camera.token;
    const sb = data.siteBounds;
    const at = (fx: number, fy: number) => ({ x: sb.x + sb.width * fx, y: sb.y + sb.height * fy });
    const siteScale = Math.min((size.width - 96) / sb.width, (size.height - 96) / sb.height);
    switch (camera.preset) {
      case "reset":
        map.resetView();
        break;
      case "central-district":
        map.centerOn(at(0.5, 0.5), Math.max(view.scale, siteScale * 2.2));
        break;
      case "site-entrance":
        map.centerOn(at(0.5, 0.88), Math.max(view.scale, siteScale * 1.8));
        break;
      case "street":
        map.centerOn(at(0.5, 0.72), Math.max(view.scale, siteScale * 3));
        break;
      case "birds-eye":
        map.centerOn(at(0.62, 0.42), Math.max(view.scale, siteScale * 1.35));
        break;
      default:
        map.fitSite(); // fit / top / perspective / overview
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, cameraApplied, map, data, size.width]);

  // exact pose restore (saved views / slides)
  useEffect(() => {
    if (!request || request.token === requestApplied.current || size.width === 0) return;
    requestApplied.current = request.token;
    const pose = request.pose;
    if (pose.kind === "2d") map.lookAt(pose.center, pose.scale);
    else if (pose.kind === "3d") {
      // approximate a 3-D pose: centre on the orbit target, scale from the camera distance
      const [px, py, pz] = pose.position;
      const [tx, , tz] = pose.target;
      const dist = Math.max(40, Math.hypot(px - tx, py, pz - tz));
      map.lookAt({ x: tx, y: tz }, Math.min(8, Math.max(0.06, (Math.min(size.width, size.height) * 0.9) / (dist * 1.2))));
    } else map.fitSite();
  }, [request, requestApplied, map, size.width, size.height]);

  const lastFocus = useRef(focus?.token ?? 0);
  useEffect(() => {
    if (!focus || focus.token === lastFocus.current) return;
    lastFocus.current = focus.token;
    const o = state.objects.find((x) => x.id === focus.objectId);
    if (!o) return;
    const b = geometryBounds(o.geometry);
    const target = Math.min(3, Math.max(0.8, (Math.min(size.width, size.height) * 0.35) / Math.max(b.width, b.height, 20)));
    map.centerOn(objectCenter(o), target);
  }, [focus, map, size.width, size.height, state.objects]);

  // --- pan / zoom / pinch / select (shared gesture model) --------------------------------------
  const onSelect = useCallback((id: string | null) => (interactive ? select(id) : undefined), [interactive, select]);
  const { panning, handlers } = useMapGestures(map, onSelect);

  // --- annotation drag (editor only) ---------------------------------------------------------------
  const drag = useRef<{ id: string; pointerId: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const annotationHandlers = annotationEditor
    ? {
        onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
          const id = (e.target as Element).closest("[data-annotation-id]")?.getAttribute("data-annotation-id");
          if (!id) return handlers.onPointerDown(e);
          e.stopPropagation();
          drag.current = { id, pointerId: e.pointerId };
          e.currentTarget.setPointerCapture?.(e.pointerId);
          annotationEditor.onPick(id);
        },
        onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
          const d = drag.current;
          if (!d || d.pointerId !== e.pointerId) return handlers.onPointerMove(e);
          setDragging(true);
          const r = e.currentTarget.getBoundingClientRect();
          const p = map.toWorld(e.clientX - r.left, e.clientY - r.top);
          annotationEditor.onMove(d.id, { x: Math.round(p.x), y: Math.round(p.y) });
        },
        onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
          const d = drag.current;
          if (!d || d.pointerId !== e.pointerId) return handlers.onPointerUp(e);
          drag.current = null;
          setDragging(false);
          e.currentTarget.releasePointerCapture?.(e.pointerId);
        },
        onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => {
          drag.current = null;
          setDragging(false);
          handlers.onPointerCancel(e);
        },
        onKeyDown: handlers.onKeyDown,
      }
    : handlers;

  if (!data) return null;
  const world = data.world;
  const gridMinor = 25;
  const gridMajor = 100;
  const selectedId = selection;

  return (
    <div
      ref={setContainerRef}
      role="application"
      aria-label={`2D map of ${data.projectName}. Drag or use arrow keys to pan, scroll or pinch to zoom, plus and minus to zoom, F to fit the site, Escape to clear the selection.`}
      tabIndex={0}
      className={`relative h-full w-full touch-none select-none overflow-hidden outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/30 ${panning || dragging ? "cursor-grabbing" : "cursor-grab"}`}
      style={{ backgroundColor: basemap.contextGround }}
      {...annotationHandlers}
    >
      <svg width={size.width || "100%"} height={size.height || "100%"} className="block" data-map-canvas="true">
        <defs>
          <pattern id={`${patternId}-minor`} width={gridMinor * view.scale} height={gridMinor * view.scale} patternUnits="userSpaceOnUse" x={view.tx} y={view.ty}>
            <path d={`M ${gridMinor * view.scale} 0 L 0 0 0 ${gridMinor * view.scale}`} fill="none" stroke={basemap.grid} strokeWidth={0.6} opacity={0.7} />
          </pattern>
          <pattern id={`${patternId}-major`} width={gridMajor * view.scale} height={gridMajor * view.scale} patternUnits="userSpaceOnUse" x={view.tx} y={view.ty}>
            <path d={`M ${gridMajor * view.scale} 0 L 0 0 0 ${gridMajor * view.scale}`} fill="none" stroke={basemap.grid} strokeWidth={1} />
          </pattern>
          <pattern id="uf-viz-ripple" width={14} height={8} patternUnits="userSpaceOnUse">
            <path d="M0 4 Q3.5 1 7 4 T14 4" fill="none" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={1} />
          </pattern>
          <pattern id="uf-viz-bays" width={5} height={10} patternUnits="userSpaceOnUse">
            <path d="M0 0 V10" stroke="#D7DEE8" strokeWidth={0.6} />
          </pattern>
          <pattern id="uf-viz-paving" width={6} height={6} patternUnits="userSpaceOnUse">
            <path d="M0 6 H6 V0" fill="none" stroke="#E6DCC6" strokeWidth={0.5} />
          </pattern>
        </defs>

        {/* ground + grid */}
        <rect width="100%" height="100%" fill={basemap.contextGround} />
        {settings.grid && view.scale > 0.4 && <rect width="100%" height="100%" fill={`url(#${patternId}-minor)`} />}
        {settings.grid && <rect width="100%" height="100%" fill={`url(#${patternId}-major)`} />}

        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}>
          <rect x={world.x} y={world.y} width={world.width} height={world.height} fill={basemap.ground} stroke={basemap.grid} strokeWidth={1 / view.scale} />
          <SiteLayer
            boundary={boundaryObj}
            contextBuildings={groups.ctxBuildings}
            contextRoads={groups.ctxRoads}
            contours={groups.contours}
            basemap={basemap}
            scale={view.scale}
            selected={selectedId === boundaryObj?.id}
            showBoundary={!!groups.boundary}
            onSelectBoundary={() => boundaryObj && onSelect(boundaryObj.id)}
            interactive={interactive}
          />
          <BlockLayer blocks={groups.blocks} selectedId={selectedId} scale={view.scale} onSelect={onSelect} interactive={interactive} />
          <WaterLayer water={groups.water} basemap={basemap} selectedId={selectedId} scale={view.scale} onSelect={onSelect} interactive={interactive} />
          <LandscapeLayer parking={groups.parking} green={groups.green} trees={groups.trees} selectedId={selectedId} scale={view.scale} onSelect={onSelect} interactive={interactive} />
          <RoadLayer roads={groups.roads} transit={groups.transit} utilities={groups.utilities} selectedId={selectedId} scale={view.scale} showLabels={settings.labels} onSelect={onSelect} interactive={interactive} />
          <BuildingLayer buildings={groups.buildings} selectedId={selectedId} scale={view.scale} showLabels={settings.labels} showHeights={settings.buildingHeights} showShadows={settings.buildingShadows} sunIntensity={settings.sunIntensity} shadow={shadow} style={settings.buildingStyle} heightEmphasis={settings.heightEmphasis} onSelect={onSelect} interactive={interactive} />
          <PoiLayer pois={groups.pois} selectedId={selectedId} scale={view.scale} showLabels={settings.labels} onSelect={onSelect} interactive={interactive} />
          {settings.labels && (
            <g aria-hidden="true" pointerEvents="none">
              <rect x={data.siteBounds.x + data.siteBounds.width / 2 - (data.projectName.length * 3.4 + 12) / view.scale} y={data.siteBounds.y - 36 / view.scale} width={(data.projectName.length * 6.8 + 24) / view.scale} height={20 / view.scale} rx={10 / view.scale} fill="#FFFFFF" fillOpacity={0.92} stroke="#DCE6F2" strokeWidth={1 / view.scale} />
              <text x={data.siteBounds.x + data.siteBounds.width / 2} y={data.siteBounds.y - 22 / view.scale} textAnchor="middle" fontSize={11 / view.scale} fontWeight={800} fill="#0F172A" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.02em" }}>
                {data.projectName}
              </text>
            </g>
          )}
          {annotations.length > 0 && <AnnotationLayer annotations={annotations} scale={view.scale} activeId={annotationEditor?.activeId ?? null} onPick={annotationEditor ? annotationEditor.onPick : undefined} />}
        </g>

        {/* time-of-day tone + atmosphere haze (visual presets only — not a lighting or weather simulation) */}
        {tod.toneOpacity > 0 && <rect width="100%" height="100%" fill={tod.toneCss} opacity={tod.toneOpacity} pointerEvents="none" style={{ mixBlendMode: "multiply" }} />}
        {atmosphere.hazeOpacity > 0 && <rect width="100%" height="100%" fill={atmosphere.hazeCss} opacity={atmosphere.hazeOpacity} pointerEvents="none" />}
      </svg>

      {/* north arrow */}
      {showNorth && (
      <div className="pointer-events-none absolute left-3 top-3 grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface/90 shadow-soft" aria-label="North is up" role="img">
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
          <path d="M13 3 L17 15 L13 12.5 L9 15 Z" fill="#2563EB" />
          <path d="M13 12.5 L17 15 L13 23 L9 15 Z" fill="#CBD5E1" />
          <text x="13" y="9.5" textAnchor="middle" fontSize="6" fontWeight="800" fill="#FFFFFF" style={{ fontFamily: "Inter, sans-serif" }}>
            N
          </text>
        </svg>
      </div>
      )}

      {/* scale bar */}
      {showScale && (
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-line bg-surface/90 px-2 py-1 shadow-soft" aria-label={`Scale bar: ${map.scaleBar.label}`} role="img">
        <div className="flex items-end gap-1.5">
          <div className="h-2 border-b-2 border-l-2 border-r-2 border-ink" style={{ width: Math.max(24, Math.min(160, map.scaleBar.px)) }} aria-hidden="true" />
          <span className="text-[10.5px] font-bold leading-none text-ink">{map.scaleBar.label}</span>
        </div>
      </div>
      )}
    </div>
  );
}
