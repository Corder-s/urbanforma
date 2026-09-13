import { getBasemap, EXISTING_STYLE, LAND_USE_STYLE } from "../../visualization/data/visualization.data";
import { pathFrom, rectCorners } from "../../visualization/lib/spatial";
import type {
  AreaObject,
  BuildingObject,
  Point,
  SpatialDataset,
  SpatialObject,
} from "../../visualization/types/visualization.types";

/**
 * Axonometric ("model view") geometry for the report document.
 *
 * A planning report needs a figure that survives printing, so the 3-D view here
 * is vector SVG derived from the same `SpatialDataset` the map and the three.js
 * city render — no WebGL, no raster image, no second geometry source. World
 * metres (x east, y south) are projected with a 30° axonometric:
 *
 *   paperX = (x − y) · cos30
 *   paperY = (x + y) · sin30 − z
 *
 * Depth ordering is `x + y` (larger = nearer the viewer), and only walls whose
 * outward normal faces the viewer are drawn, so massing reads correctly without
 * a hidden-surface pass.
 */

const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;

/** Landscape fills mirror `LandscapeLayer`'s palette so plan and model agree. */
const GREEN = { fill: "#D5EBD0", stroke: "#A9D3A0" };
const PARK = { fill: "#CDE8C5", stroke: "#9CCB92" };
const PLANTING = { fill: "#BFDDB9", stroke: "#9CC495" };
const PARKING = { fill: "#EEF1F6", stroke: "#CBD5E1" };
const TREE = { fill: "#8FC487", stroke: "#6FAA67" };
const ROAD = { casing: "#C7D3E3", surface: "#FFFFFF" };
const PATH = { casing: "#DCE4EF", surface: "#F7FAFD" };

export interface ModelWall {
  d: string;
  fill: string;
}

export interface ModelBuilding {
  id: string;
  name: string;
  landUse: string;
  height: number;
  floors: number;
  existing: boolean;
  /** Depth key (x + y) — the painter's order. */
  depth: number;
  roof: string;
  roofD: string;
  roofStroke: string;
  walls: ModelWall[];
}

export interface ModelArea {
  id: string;
  d: string;
  fill: string;
  stroke: string;
}

export interface ModelRoad {
  id: string;
  d: string;
  width: number;
  casing: string;
  surface: string;
}

export interface ModelTree {
  id: string;
  cx: number;
  cy: number;
  r: number;
}

export interface ModelViewScene {
  viewBox: string;
  /** Top-left of the viewBox in paper space (for the ground plate). */
  origin: { x: number; y: number };
  /** Paper-space width/height of the framed scene, for the caption. */
  width: number;
  height: number;
  sitePlate: string | null;
  blocks: ModelArea[];
  areas: ModelArea[];
  roads: ModelRoad[];
  trees: ModelTree[];
  context: ModelBuilding[];
  buildings: ModelBuilding[];
  /** Land-use keys actually present, for the legend. */
  legend: { label: string; fill: string; stroke: string }[];
}

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function project(x: number, y: number, z: number): Point {
  return { x: (x - y) * COS30, y: (x + y) * SIN30 - z };
}

function include(box: Box, p: Point): void {
  if (p.x < box.minX) box.minX = p.x;
  if (p.x > box.maxX) box.maxX = p.x;
  if (p.y < box.minY) box.minY = p.y;
  if (p.y > box.maxY) box.maxY = p.y;
}

/** Multiply a #rrggbb colour's channels — used for the two lit wall faces. */
function shade(hex: string, factor: number): string {
  const clean = hex.replace("#", "");
  const int = parseInt(clean.length === 3 ? clean.replace(/(.)/g, "$1$1") : clean, 16);
  const r = Math.max(0, Math.min(255, Math.round(((int >> 16) & 255) * factor)));
  const g = Math.max(0, Math.min(255, Math.round(((int >> 8) & 255) * factor)));
  const b = Math.max(0, Math.min(255, Math.round((int & 255) * factor)));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function toPath(points: Point[], close: boolean): string {
  return pathFrom(points, close);
}

function projectRing(ring: Point[], z: number): Point[] {
  return ring.map((p) => project(p.x, p.y, z));
}

function centroid(points: Point[]): Point {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / Math.max(1, points.length), y: sum.y / Math.max(1, points.length) };
}

/**
 * The walls of an extruded footprint that face the viewer, shaded by which way
 * they point so the massing reads as a lit solid.
 */
function wallsFor(footprint: Point[], height: number, roofFill: string, box: Box): ModelWall[] {
  const centre = centroid(footprint);
  const walls: ModelWall[] = [];
  for (let i = 0; i < footprint.length; i += 1) {
    const a = footprint[i];
    const b = footprint[(i + 1) % footprint.length];
    // Outward normal of the edge (map convention: +y south).
    let nx = b.y - a.y;
    let ny = -(b.x - a.x);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (nx * (mid.x - centre.x) + ny * (mid.y - centre.y) < 0) {
      nx = -nx;
      ny = -ny;
    }
    // Viewer sits in the +x +y direction; the other two faces are hidden.
    if (nx + ny <= 0) continue;
    const factor = nx - ny > 0 ? 0.86 : 0.68;
    const quad = [project(a.x, a.y, 0), project(b.x, b.y, 0), project(b.x, b.y, height), project(a.x, a.y, height)];
    for (const p of quad) include(box, p);
    walls.push({ d: toPath(quad, true), fill: shade(roofFill, factor) });
  }
  return walls;
}

function buildingOf(b: BuildingObject, zScale: number, box: Box): ModelBuilding {
  const { center, width, depth, rotation } = b.geometry;
  const footprint = rectCorners(center, width, depth, rotation);
  const height = b.properties.height * zScale;
  const existing = b.properties.status === "Existing";
  const palette = existing ? EXISTING_STYLE : LAND_USE_STYLE[b.properties.landUse];
  const roof = projectRing(footprint, height);
  for (const p of roof) include(box, p);
  for (const p of projectRing(footprint, 0)) include(box, p);
  return {
    id: b.id,
    name: b.name,
    landUse: b.properties.landUse,
    height: b.properties.height,
    floors: b.properties.floors,
    existing,
    depth: center.x + center.y,
    roof: palette.fill,
    roofStroke: palette.stroke,
    roofD: toPath(roof, true),
    walls: wallsFor(footprint, height, palette.fill, box),
  };
}

function contextBuildingOf(o: SpatialObject, zScale: number, box: Box, style: { fill: string; stroke: string }): ModelBuilding | null {
  if (o.type !== "context-building" || o.geometry.kind !== "rect") return null;
  const { center, width, depth, rotation } = o.geometry;
  const height = ("height" in o.properties ? o.properties.height : 12) * zScale * 0.6;
  const footprint = rectCorners(center, width, depth, rotation);
  const roof = projectRing(footprint, height);
  for (const p of roof) include(box, p);
  for (const p of projectRing(footprint, 0)) include(box, p);
  return {
    id: o.id,
    name: o.name,
    landUse: "Context",
    height,
    floors: 0,
    existing: true,
    depth: center.x + center.y,
    roof: style.fill,
    roofStroke: style.stroke,
    roofD: toPath(roof, true),
    walls: wallsFor(footprint, height, style.fill, box),
  };
}

function areaStyleOf(a: AreaObject, basemap: ReturnType<typeof getBasemap>) {
  if (a.type === "water") return { fill: basemap.water.fill, stroke: basemap.water.stroke };
  if (a.type === "parking") return PARKING;
  if (/planting/i.test(a.properties.category)) return PLANTING;
  if (a.layer === "parks") return PARK;
  return GREEN;
}

export interface ModelViewOptions {
  /** Vertical exaggeration (1 = true heights). */
  zScale?: number;
  /** Paper-space padding around the scene, in projected units. */
  padding?: number;
  /** Draw surrounding context massing. */
  context?: boolean;
}

/** Build everything the model-view figure draws, from the live dataset. */
export function buildModelViewScene(data: SpatialDataset, options: ModelViewOptions = {}): ModelViewScene {
  const { zScale = 1, padding = 24, context = true } = options;
  const basemap = getBasemap("light");
  const box: Box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

  const sitePlate = (() => {
    const boundary = data.objects.find((o) => o.type === "boundary");
    if (!boundary || boundary.geometry.kind !== "polygon") return null;
    const ring = projectRing(boundary.geometry.points, 0);
    for (const p of ring) include(box, p);
    return toPath(ring, true);
  })();

  const blocks: ModelArea[] = [];
  const areas: ModelArea[] = [];
  const roads: ModelRoad[] = [];
  const trees: ModelTree[] = [];
  const buildings: ModelBuilding[] = [];
  const contextMassing: ModelBuilding[] = [];
  const landUses = new Set<string>();

  for (const o of data.objects) {
    if (!o.visible) continue;
    switch (o.type) {
      case "block": {
        if (o.geometry.kind !== "polygon") break;
        const ring = projectRing(o.geometry.points, 0);
        for (const p of ring) include(box, p);
        blocks.push({ id: o.id, d: toPath(ring, true), fill: basemap.ground, stroke: basemap.grid });
        break;
      }
      case "green":
      case "water":
      case "parking": {
        if (o.geometry.kind !== "polygon") break;
        const ring = projectRing(o.geometry.points, 0);
        for (const p of ring) include(box, p);
        const style = areaStyleOf(o, basemap);
        areas.push({ id: o.id, d: toPath(ring, true), ...style });
        break;
      }
      case "road":
      case "path": {
        if (o.geometry.kind !== "line" || o.id.startsWith("ctx-")) break;
        const line = projectRing(o.geometry.points, 0);
        for (const p of line) include(box, p);
        const palette = o.type === "path" ? PATH : ROAD;
        roads.push({ id: o.id, d: toPath(line, false), width: Math.max(2, o.geometry.width), ...palette });
        break;
      }
      case "tree": {
        if (o.geometry.kind !== "point") break;
        const canopy = o.properties.canopyM;
        const p = project(o.geometry.point.x, o.geometry.point.y, canopy * zScale * 0.7);
        include(box, p);
        trees.push({ id: o.id, cx: p.x, cy: p.y, r: Math.max(1.5, canopy * 0.55) });
        break;
      }
      case "building": {
        buildings.push(buildingOf(o, zScale, box));
        landUses.add(o.properties.landUse);
        break;
      }
      case "context-building": {
        if (!context) break;
        const mass = contextBuildingOf(o, zScale, box, basemap.contextBuilding);
        if (mass) contextMassing.push(mass);
        break;
      }
      default:
        break;
    }
  }

  if (!Number.isFinite(box.minX)) {
    return {
      viewBox: "0 0 100 100",
      origin: { x: 0, y: 0 },
      width: 100,
      height: 100,
      sitePlate,
      blocks,
      areas,
      roads,
      trees,
      context: [],
      buildings: [],
      legend: [],
    };
  }

  const width = box.maxX - box.minX + padding * 2;
  const height = box.maxY - box.minY + padding * 2;
  const byDepth = (a: ModelBuilding, b: ModelBuilding) => a.depth - b.depth;

  return {
    viewBox: `${box.minX - padding} ${box.minY - padding} ${width} ${height}`,
    origin: { x: box.minX - padding, y: box.minY - padding },
    width,
    height,
    sitePlate,
    blocks,
    areas,
    roads,
    trees,
    context: contextMassing.sort(byDepth),
    buildings: buildings.sort(byDepth),
    legend: [...landUses].map((key) => ({
      label: key,
      fill: LAND_USE_STYLE[key as keyof typeof LAND_USE_STYLE].fill,
      stroke: LAND_USE_STYLE[key as keyof typeof LAND_USE_STYLE].stroke,
    })),
  };
}

/** Human caption facts for a figure (size of the site, tallest volume). */
export function figureFacts(data: SpatialDataset) {
  const buildings = data.objects.filter((o) => o.type === "building");
  const tallest = buildings.reduce((max, b) => (b.type === "building" ? Math.max(max, b.properties.height) : max), 0);
  return {
    siteWidthM: Math.round(data.siteBounds.width),
    siteDepthM: Math.round(data.siteBounds.height),
    siteAreaHa: data.summary.siteAreaHa,
    buildings: buildings.length,
    tallestM: Math.round(tallest * 10) / 10,
  };
}
