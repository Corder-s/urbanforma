import { useEffect, useId, useMemo, useRef } from "react";
import { getBasemap } from "../../visualization/data/visualization.data";
import { useMapGestures } from "../../visualization/hooks/useMapGestures";
import type { MapViewApi } from "../../visualization/hooks/useMapView";
import { BlockLayer } from "../../visualization/components/map/BlockLayer";
import { BuildingLayer } from "../../visualization/components/map/BuildingLayer";
import { LandscapeLayer } from "../../visualization/components/map/LandscapeLayer";
import { RoadLayer } from "../../visualization/components/map/RoadLayer";
import { SiteLayer } from "../../visualization/components/map/SiteLayer";
import { WaterLayer } from "../../visualization/components/map/WaterLayer";
import type { AreaObject, BoundaryObject, BuildingObject, ContextBuildingObject, RoadObject, TerrainObject, TreeObject } from "../../visualization/types/visualization.types";
import { getCategory } from "../data/analysis.data";
import type { AnalysisState } from "../hooks/useAnalysisState";
import { CarbonOverlay } from "./overlays/CarbonOverlay";
import { DensityOverlay } from "./overlays/DensityOverlay";
import { GreenOverlay } from "./overlays/GreenOverlay";
import { HeatOverlay } from "./overlays/HeatOverlay";
import { MobilityOverlay } from "./overlays/MobilityOverlay";
import type { OverlayProps } from "./overlays/overlay.props";
import { SolarOverlay } from "./overlays/SolarOverlay";
import { WindOverlay } from "./overlays/WindOverlay";

interface AnalysisMapProps {
  state: AnalysisState;
  map: MapViewApi;
}

const NOOP = () => undefined;

/**
 * 2-D analysis renderer.
 *
 *   SpatialDataset ──► base layers (Step 12 components, read-only, muted)
 *   AnalysisOverlay ─► analysis renderer (zones / building tint / vectors / highlights)
 *
 * The base map is the same geometry the Visualization module draws — same
 * components, same camera (`useMapView`) and same gestures (`useMapGestures`).
 * The analysis layer sits in its own SVG group so overlay renderers never
 * touch the spatial renderer, and vice versa.
 */
export function AnalysisMap({ state, map }: AnalysisMapProps) {
  const { data, activeOverlay, activeCategory, selectedArea, selectArea, focusZone, camera } = state;
  const basemap = getBasemap("light");
  const { view, size, setContainerRef } = map;
  const patternId = useId();

  const groups = useMemo(() => {
    const g = {
      boundary: null as BoundaryObject | null,
      ctxBuildings: [] as ContextBuildingObject[],
      ctxRoads: [] as RoadObject[],
      contours: [] as TerrainObject[],
      water: [] as AreaObject[],
      blocks: [] as AreaObject[],
      green: [] as AreaObject[],
      trees: [] as TreeObject[],
      roads: [] as RoadObject[],
      buildings: [] as BuildingObject[],
    };
    if (!data) return g;
    for (const o of data.objects) {
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
        case "building":
          g.buildings.push(o);
          break;
        default:
          break;
      }
    }
    return g;
  }, [data]);

  // camera presets from the toolbar / keyboard
  const lastCamera = useRef(camera.token);
  useEffect(() => {
    if (camera.token === lastCamera.current) return;
    lastCamera.current = camera.token;
    if (camera.preset === "reset") map.resetView();
    else map.fitSite();
  }, [camera, map]);

  const { panning, handlers } = useMapGestures(map, selectArea);

  if (!data) return null;
  const world = data.world;
  const gridMajor = 100;
  const paints = activeOverlay?.paints ?? [];
  const tintsBuildings = paints.includes("buildings");
  const tintsRoads = paints.includes("roads");
  const hasZones = paints.includes("zones");
  const category = getCategory(activeCategory);
  // The base map is selectable only when nothing else claims the geometry
  // (buildings can always be inspected unless the overlay re-draws them).
  const baseSelectedId = selectedArea && !selectedArea.startsWith("zone-") ? selectedArea : null;

  const overlayProps: OverlayProps | null = activeOverlay ? { overlay: activeOverlay, data, selectedId: selectedArea, focusId: hasZones ? focusZone : null, scale: view.scale, onSelect: selectArea } : null;

  return (
    <div
      ref={setContainerRef}
      role="application"
      aria-label={`Analysis map of ${data.projectName}${activeOverlay ? `, showing ${activeOverlay.title.toLowerCase()}` : ""}. Drag or use arrow keys to pan, scroll or pinch to zoom, plus and minus to zoom, F to fit the site, Escape to clear the selection.`}
      tabIndex={0}
      className={`relative h-full w-full touch-none select-none overflow-hidden outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/30 ${panning ? "cursor-grabbing" : "cursor-grab"}`}
      style={{ backgroundColor: basemap.contextGround }}
      {...handlers}
    >
      <svg width={size.width || "100%"} height={size.height || "100%"} className="block">
        <defs>
          <pattern id={`${patternId}-major`} width={gridMajor * view.scale} height={gridMajor * view.scale} patternUnits="userSpaceOnUse" x={view.tx} y={view.ty}>
            <path d={`M ${gridMajor * view.scale} 0 L 0 0 0 ${gridMajor * view.scale}`} fill="none" stroke={basemap.grid} strokeWidth={1} />
          </pattern>
          {/* pattern ids referenced by the shared Step 12 layers */}
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

        <rect width="100%" height="100%" fill={basemap.contextGround} />
        <rect width="100%" height="100%" fill={`url(#${patternId}-major)`} />

        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}>
          <rect x={world.x} y={world.y} width={world.width} height={world.height} fill={basemap.ground} stroke={basemap.grid} strokeWidth={1 / view.scale} />

          {/* --- base map (shared Step 12 layers; decoration except buildings) ---------------- */}
          <g data-layer="analysis-base">
            <SiteLayer boundary={groups.boundary} contextBuildings={groups.ctxBuildings} contextRoads={groups.ctxRoads} contours={[]} basemap={basemap} scale={view.scale} selected={false} showBoundary onSelectBoundary={NOOP} interactive={false} />
            <g opacity={hasZones ? 0.8 : 1}>
              <BlockLayer blocks={groups.blocks} selectedId={null} scale={view.scale} onSelect={NOOP} interactive={false} />
              <WaterLayer water={groups.water} basemap={basemap} selectedId={null} scale={view.scale} onSelect={NOOP} interactive={false} />
              <LandscapeLayer parking={[]} green={groups.green} trees={groups.trees} selectedId={null} scale={view.scale} onSelect={NOOP} interactive={false} />
            </g>
            <g opacity={tintsRoads ? 0.35 : 1}>
              <RoadLayer roads={groups.roads} transit={[]} utilities={[]} selectedId={null} scale={view.scale} showLabels={false} onSelect={NOOP} interactive={false} />
            </g>
            {!tintsBuildings && (
              <g opacity={hasZones ? 0.85 : 1}>
                <BuildingLayer buildings={groups.buildings} selectedId={baseSelectedId} scale={view.scale} showLabels={false} showHeights={false} showShadows={!activeOverlay} sunIntensity={65} onSelect={selectArea} />
              </g>
            )}
          </g>

          {/* --- analysis layer (independent renderer) ------------------------------------ */}
          {overlayProps && (
            <g data-layer="analysis-overlay" data-overlay={overlayProps.overlay.type} aria-label={`${category.label} overlay`}>
              <OverlayRenderer {...overlayProps} />
            </g>
          )}

          {/* site name */}
          <g aria-hidden="true" pointerEvents="none">
            <rect x={data.siteBounds.x + data.siteBounds.width / 2 - (data.projectName.length * 3.4 + 12) / view.scale} y={data.siteBounds.y - 36 / view.scale} width={(data.projectName.length * 6.8 + 24) / view.scale} height={20 / view.scale} rx={10 / view.scale} fill="#FFFFFF" fillOpacity={0.92} stroke="#DCE6F2" strokeWidth={1 / view.scale} />
            <text x={data.siteBounds.x + data.siteBounds.width / 2} y={data.siteBounds.y - 22 / view.scale} textAnchor="middle" fontSize={11 / view.scale} fontWeight={800} fill="#0F172A" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.02em" }}>
              {data.projectName}
            </text>
          </g>
        </g>
      </svg>

      {/* north arrow */}
      <div className="pointer-events-none absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-xl border border-line bg-white/90 shadow-soft" aria-label="North is up" role="img">
        <svg width="24" height="24" viewBox="0 0 26 26" aria-hidden="true">
          <path d="M13 3 L17 15 L13 12.5 L9 15 Z" fill="#2563EB" />
          <path d="M13 12.5 L17 15 L13 23 L9 15 Z" fill="#CBD5E1" />
          <text x="13" y="9.5" textAnchor="middle" fontSize="6" fontWeight="800" fill="#FFFFFF" style={{ fontFamily: "Inter, sans-serif" }}>
            N
          </text>
        </svg>
      </div>

      {/* scale bar */}
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-line bg-white/90 px-2 py-1 shadow-soft" aria-label={`Scale bar: ${map.scaleBar.label}`} role="img">
        <div className="flex items-end gap-1.5">
          <div className="h-2 border-b-2 border-l-2 border-r-2 border-ink" style={{ width: Math.max(24, Math.min(160, map.scaleBar.px)) }} aria-hidden="true" />
          <span className="text-[10.5px] font-bold leading-none text-ink">{map.scaleBar.label}</span>
        </div>
      </div>
    </div>
  );
}

/** Routes an overlay to its renderer (one component per analysis family). */
function OverlayRenderer(props: OverlayProps) {
  switch (props.overlay.type) {
    case "solar":
      return <SolarOverlay {...props} />;
    case "heat":
      return <HeatOverlay {...props} />;
    case "wind":
      return <WindOverlay {...props} />;
    case "green":
    case "openspace":
      return <GreenOverlay {...props} />;
    case "carbon":
      return <CarbonOverlay {...props} />;
    case "density":
    case "height":
    case "landuse":
      return <DensityOverlay {...props} />;
    case "accessibility":
    case "roads":
    case "walkability":
      return <MobilityOverlay {...props} />;
    default:
      return null;
  }
}
