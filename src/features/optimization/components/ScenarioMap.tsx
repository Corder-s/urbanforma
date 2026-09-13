import { memo, useEffect, useId, useMemo, useRef } from "react";
import { BlockLayer } from "../../visualization/components/map/BlockLayer";
import { BuildingLayer } from "../../visualization/components/map/BuildingLayer";
import { LandscapeLayer } from "../../visualization/components/map/LandscapeLayer";
import { RoadLayer } from "../../visualization/components/map/RoadLayer";
import { SiteLayer } from "../../visualization/components/map/SiteLayer";
import { WaterLayer } from "../../visualization/components/map/WaterLayer";
import { getBasemap } from "../../visualization/data/visualization.data";
import { useMapGestures } from "../../visualization/hooks/useMapGestures";
import type { MapViewApi } from "../../visualization/hooks/useMapView";
import { featureProps } from "../../visualization/lib/featureProps";
import { pathFrom, rectCorners } from "../../visualization/lib/spatial";
import type { AreaObject, BoundaryObject, BuildingObject, CameraPreset, ContextBuildingObject, RoadObject, SpatialDataset, SpatialObject, TerrainObject, TreeObject } from "../../visualization/types/visualization.types";
import { CHANGE_LEGEND } from "../data/optimization.data";
import type { DerivedSpatialState, SpatialChangeKind } from "../types/optimization.types";

interface ScenarioMapProps {
  /** Current plan (drawn when no scenario is active). */
  current: SpatialDataset;
  /** Scenario spatial state derived from the current plan (null = show current plan). */
  derived: DerivedSpatialState | null;
  scenarioName: string | null;
  map: MapViewApi;
  camera: { preset: CameraPreset; token: number };
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const NOOP = () => undefined;
const LEGEND = Object.fromEntries(CHANGE_LEGEND.map((l) => [l.kind, l])) as Record<SpatialChangeKind, (typeof CHANGE_LEGEND)[number]>;

function groupObjects(objects: SpatialObject[]) {
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
  for (const o of objects) {
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
}

/**
 * 2-D scenario renderer.
 *
 *   current SpatialDataset ──► scenario SpatialDataset (ops applied) ──► Step 12 layers
 *                                                                    └─► change overlay (Added / Modified / Removed)
 *
 * Same components, camera (`useMapView`) and gestures (`useMapGestures`) as
 * the Visualization and Analysis modules; the change overlay is an
 * independent SVG group on top and never touches the base renderer.
 */
export function ScenarioMap({ current, derived, scenarioName, map, camera, selectedId, onSelect }: ScenarioMapProps) {
  const basemap = getBasemap("light");
  const { view, size, setContainerRef } = map;
  const patternId = useId();
  const data = derived?.dataset ?? current;
  const groups = useMemo(() => groupObjects(data.objects), [data]);

  const lastCamera = useRef(camera.token);
  useEffect(() => {
    if (camera.token === lastCamera.current) return;
    lastCamera.current = camera.token;
    if (camera.preset === "reset") map.resetView();
    else map.fitSite();
  }, [camera, map]);

  const { panning, handlers } = useMapGestures(map, onSelect);
  const world = data.world;
  const gridMajor = 100;
  const counts = derived ? { added: derived.addedIds.length, modified: [...derived.changeOf.values()].filter((k) => k === "modified").length, removed: derived.removed.length } : null;
  const label = derived && scenarioName ? `Scenario map of ${data.projectName}, ${scenarioName}: ${counts?.added} added, ${counts?.modified} modified, ${counts?.removed} removed objects.` : `Current plan map of ${data.projectName}.`;

  return (
    <div
      ref={setContainerRef}
      role="application"
      aria-label={`${label} Drag or use arrow keys to pan, scroll or pinch to zoom, plus and minus to zoom, F to fit the site, Escape to clear the selection.`}
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
          <pattern id={`${patternId}-removed`} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 0 V6" stroke={LEGEND.removed.stroke} strokeWidth={1.6} strokeOpacity={0.7} />
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

          {/* --- base map: the scenario dataset drawn with the shared Step 12 layers -------------- */}
          <g data-layer="scenario-base" opacity={derived ? 0.92 : 1}>
            <SiteLayer boundary={groups.boundary} contextBuildings={groups.ctxBuildings} contextRoads={groups.ctxRoads} contours={[]} basemap={basemap} scale={view.scale} selected={false} showBoundary onSelectBoundary={NOOP} interactive={false} />
            <BlockLayer blocks={groups.blocks} selectedId={selectedId} scale={view.scale} onSelect={onSelect} interactive={!!derived} />
            <WaterLayer water={groups.water} basemap={basemap} selectedId={null} scale={view.scale} onSelect={NOOP} interactive={false} />
            <LandscapeLayer parking={[]} green={groups.green} trees={groups.trees} selectedId={selectedId} scale={view.scale} onSelect={onSelect} interactive={!!derived} />
            <RoadLayer roads={groups.roads} transit={[]} utilities={[]} selectedId={selectedId} scale={view.scale} showLabels={false} onSelect={onSelect} interactive={!!derived} />
            <BuildingLayer buildings={groups.buildings} selectedId={selectedId} scale={view.scale} showLabels={false} showHeights={false} showShadows sunIntensity={65} onSelect={onSelect} />
          </g>

          {/* --- change overlay (independent renderer) ------------------------------------------- */}
          {derived && <ChangeOverlay derived={derived} scale={view.scale} patternId={patternId} selectedId={selectedId} onSelect={onSelect} />}

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
      <div className="pointer-events-none absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface/90 shadow-soft" aria-label="North is up" role="img">
        <svg width="24" height="24" viewBox="0 0 26 26" aria-hidden="true">
          <path d="M13 3 L17 15 L13 12.5 L9 15 Z" fill="#2563EB" />
          <path d="M13 12.5 L17 15 L13 23 L9 15 Z" fill="#CBD5E1" />
          <text x="13" y="9.5" textAnchor="middle" fontSize="6" fontWeight="800" fill="#FFFFFF" style={{ fontFamily: "Inter, sans-serif" }}>
            N
          </text>
        </svg>
      </div>

      {/* scale bar */}
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-line bg-surface/90 px-2 py-1 shadow-soft" aria-label={`Scale bar: ${map.scaleBar.label}`} role="img">
        <div className="flex items-end gap-1.5">
          <div className="h-2 border-b-2 border-l-2 border-r-2 border-ink" style={{ width: Math.max(24, Math.min(160, map.scaleBar.px)) }} aria-hidden="true" />
          <span className="text-[10.5px] font-bold leading-none text-ink">{map.scaleBar.label}</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Change overlay
// ---------------------------------------------------------------------------

interface ChangeOverlayProps {
  derived: DerivedSpatialState;
  scale: number;
  patternId: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

function outlineOf(o: SpatialObject): { d: string; kind: "area" | "line" | "point"; width?: number } | null {
  switch (o.geometry.kind) {
    case "rect":
      return { d: pathFrom(rectCorners(o.geometry.center, o.geometry.width, o.geometry.depth, o.geometry.rotation), true), kind: "area" };
    case "polygon":
      return { d: pathFrom(o.geometry.points, true), kind: "area" };
    case "line":
      return { d: pathFrom(o.geometry.points), kind: "line", width: o.geometry.width };
    default:
      return null;
  }
}

const ChangeOverlay = memo(function ChangeOverlay({ derived, scale, patternId, selectedId, onSelect }: ChangeOverlayProps) {
  const hair = 1 / scale;
  const objectsById = useMemo(() => new Map(derived.dataset.objects.map((o) => [o.id, o])), [derived]);
  const marked = useMemo(() => {
    const out: { o: SpatialObject; kind: SpatialChangeKind }[] = [];
    for (const [id, kind] of derived.changeOf) {
      if (kind === "removed") continue;
      const o = objectsById.get(id);
      if (o && o.type !== "tree") out.push({ o, kind });
    }
    return out;
  }, [derived, objectsById]);

  return (
    <g data-layer="scenario-changes" aria-label="Scenario changes">
      {/* removed objects — hatched ghosts of the current plan */}
      {derived.removed
        .filter((o) => o.type !== "tree")
        .map((o) => {
          const s = outlineOf(o);
          if (!s) return null;
          const selected = o.id === selectedId;
          return (
            <g key={`rm-${o.id}`} {...featureProps(true, o.id, `${o.name}, removed in this scenario`, selected, () => onSelect(o.id))}>
              {s.kind === "line" ? (
                <path d={s.d} fill="none" stroke={LEGEND.removed.stroke} strokeWidth={(s.width ?? 4) + hair * 2} strokeDasharray={`${hair * 6} ${hair * 4}`} strokeOpacity={0.8} strokeLinecap="round" />
              ) : (
                <>
                  <path d={s.d} fill={`url(#${patternId}-removed)`} stroke="none" />
                  <path d={s.d} fill="none" stroke={LEGEND.removed.stroke} strokeWidth={hair * (selected ? 3 : 1.8)} strokeDasharray={`${hair * 5} ${hair * 3}`} strokeLinejoin="round" />
                </>
              )}
            </g>
          );
        })}

      {/* added / modified outlines */}
      {marked.map(({ o, kind }) => {
        const s = outlineOf(o);
        if (!s) return null;
        const meta = LEGEND[kind];
        const selected = o.id === selectedId;
        const w = hair * (selected ? 3.2 : kind === "added" ? 2.2 : 1.8);
        return (
          <g key={`${kind}-${o.id}`} pointerEvents="none" aria-hidden="true">
            {s.kind === "line" ? (
              <>
                <path d={s.d} fill="none" stroke={meta.stroke} strokeWidth={(s.width ?? 4) + hair * 4} strokeOpacity={0.35} strokeLinecap="round" />
                <path d={s.d} fill="none" stroke={meta.stroke} strokeWidth={hair * 1.6} strokeDasharray={kind === "modified" ? `${hair * 6} ${hair * 4}` : undefined} strokeLinecap="round" />
              </>
            ) : (
              <>
                <path d={s.d} fill={meta.fill} fillOpacity={kind === "added" ? 0.18 : 0.12} stroke="none" />
                <path d={s.d} fill="none" stroke={meta.stroke} strokeWidth={w} strokeDasharray={kind === "modified" ? `${hair * 6} ${hair * 3}` : undefined} strokeLinejoin="round" />
              </>
            )}
          </g>
        );
      })}

      {/* markers (glyphs, not colour only) — only when zoomed in enough to read */}
      {scale > 0.55 &&
        [...marked, ...derived.removed.filter((o) => o.type === "building").map((o) => ({ o, kind: "removed" as SpatialChangeKind }))]
          .filter(({ o }) => o.type === "building" || o.type === "block" || (o.type === "green" && o.layer === "parks"))
          .map(({ o, kind }) => {
            const s = outlineOf(o);
            if (!s) return null;
            const c = o.geometry.kind === "rect" ? o.geometry.center : centroidOf(o.geometry.kind === "polygon" ? o.geometry.points : []);
            const r = 6 / scale;
            const meta = LEGEND[kind];
            const glyph = kind === "added" ? "+" : kind === "removed" ? "×" : "~";
            const mx = c.x + (o.geometry.kind === "rect" ? o.geometry.width / 2 - r : -r * 0.2);
            const my = c.y - (o.geometry.kind === "rect" ? o.geometry.depth / 2 - r : 0);
            return (
              <g key={`mk-${kind}-${o.id}`} pointerEvents="none" aria-hidden="true">
                <circle cx={mx} cy={my} r={r} fill={meta.stroke} stroke="#FFFFFF" strokeWidth={hair * 1.4} />
                <text x={mx} y={my + r * 0.42} textAnchor="middle" fontSize={r * 1.5} fontWeight={800} fill="#FFFFFF" style={{ fontFamily: "Inter, sans-serif" }}>
                  {glyph}
                </text>
              </g>
            );
          })}
    </g>
  );
});

function centroidOf(points: { x: number; y: number }[]) {
  if (points.length === 0) return { x: 0, y: 0 };
  const s = points.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 });
  return { x: s.x / points.length, y: s.y / points.length };
}
