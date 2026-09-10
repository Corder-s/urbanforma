import { memo, useMemo } from "react";
import { getBasemap, getTimeOfDay } from "../../data/visualization.data";
import { planShadow } from "../../lib/lighting";
import type { Annotation, AreaObject, BasemapId, BoundaryObject, BuildingObject, ContextBuildingObject, LayerVisibility, RoadObject, SpatialDataset, SpatialObject, TerrainObject, TreeObject, VisualizationSettings } from "../../types/visualization.types";
import { AnnotationLayer } from "./AnnotationLayer";
import { BlockLayer } from "./BlockLayer";
import { BuildingLayer } from "./BuildingLayer";
import { LandscapeLayer } from "./LandscapeLayer";
import { RoadLayer } from "./RoadLayer";
import { SiteLayer } from "./SiteLayer";
import { WaterLayer } from "./WaterLayer";

interface MiniPlanProps {
  data: SpatialDataset;
  layers: LayerVisibility;
  settings: VisualizationSettings;
  basemap: BasemapId;
  annotations?: Annotation[];
  /** Padding around the site in world metres. */
  padding?: number;
  /** Thumbnails skip labels / annotations / trees for speed. */
  thumbnail?: boolean;
  className?: string;
  title?: string;
}

const NOOP = () => undefined;
const NONE: Annotation[] = [];

/**
 * Non-interactive plan of a dataset framed on the site (SVG viewBox). Reuses
 * the Step 12 map layers with `interactive=false`, so slide thumbnails and the
 * Before/After panes look exactly like the map. No pan/zoom; the parent sizes it.
 */
export const MiniPlan = memo(function MiniPlan({ data, layers, settings, basemap: basemapId, annotations = NONE, padding = 40, thumbnail = false, className = "", title }: MiniPlanProps) {
  const basemap = getBasemap(basemapId);
  const effective = useMemo(() => ({ ...layers, buildings: layers.buildings && settings.buildings, trees: layers.trees && settings.trees && settings.landscape && !thumbnail, green: layers.green && settings.landscape, parks: layers.parks && settings.landscape, water: layers.water && settings.water, roads: layers.roads && settings.roadNetwork, terrain: layers.terrain && settings.terrain }), [layers, settings, thumbnail]);
  const groups = useMemo(() => group(data.objects.filter((o) => o.visible && effective[o.layer])), [data.objects, effective]);
  const boundaryObj = useMemo(() => (data.objects.find((o) => o.type === "boundary") as BoundaryObject | undefined) ?? null, [data.objects]);
  const shadow = useMemo(() => planShadow(settings), [settings]);
  const tod = getTimeOfDay(settings.timeOfDay);
  const sb = data.siteBounds;
  const vb = `${sb.x - padding} ${sb.y - padding} ${sb.width + padding * 2} ${sb.height + padding * 2}`;
  // scale ≈ px per metre for a ~400px wide pane; labels + hairlines are sized from it
  const scale = thumbnail ? 0.18 : 0.45;
  return (
    <svg viewBox={vb} preserveAspectRatio="xMidYMid slice" className={`block h-full w-full ${className}`} role="img" aria-label={title ?? `Plan of ${data.projectName}`} style={{ backgroundColor: basemap.contextGround }}>
      <rect x={data.world.x} y={data.world.y} width={data.world.width} height={data.world.height} fill={basemap.ground} />
      <SiteLayer boundary={boundaryObj} contextBuildings={groups.ctxBuildings} contextRoads={groups.ctxRoads} contours={groups.contours} basemap={basemap} scale={scale} selected={false} showBoundary={!!groups.boundary} onSelectBoundary={NOOP} interactive={false} />
      <BlockLayer blocks={groups.blocks} selectedId={null} scale={scale} onSelect={NOOP} interactive={false} />
      <WaterLayer water={groups.water} basemap={basemap} selectedId={null} scale={scale} onSelect={NOOP} interactive={false} />
      <LandscapeLayer parking={groups.parking} green={groups.green} trees={groups.trees} selectedId={null} scale={scale} onSelect={NOOP} interactive={false} />
      <RoadLayer roads={groups.roads} transit={[]} utilities={[]} selectedId={null} scale={scale} showLabels={false} onSelect={NOOP} interactive={false} />
      <BuildingLayer buildings={groups.buildings} selectedId={null} scale={scale} showLabels={!thumbnail && settings.labels} showHeights={settings.buildingHeights} showShadows={settings.buildingShadows} sunIntensity={settings.sunIntensity} shadow={shadow} style={settings.buildingStyle} heightEmphasis={settings.heightEmphasis} onSelect={NOOP} interactive={false} />
      {!thumbnail && annotations.length > 0 && <AnnotationLayer annotations={annotations} scale={scale} />}
      {tod.toneOpacity > 0 && <rect x={sb.x - padding * 4} y={sb.y - padding * 4} width={sb.width + padding * 8} height={sb.height + padding * 8} fill={tod.toneCss} opacity={tod.toneOpacity} style={{ mixBlendMode: "multiply" }} />}
    </svg>
  );
});

function group(objects: SpatialObject[]) {
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
      case "building":
        g.buildings.push(o);
        break;
      default:
        break;
    }
  }
  return g;
}
