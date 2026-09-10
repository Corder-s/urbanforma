import { centroid, pointInPolygon, polygonArea, polylineLength } from "../../planning/lib/geometry";
import { geometryBounds } from "../../visualization/lib/spatial";
import type { AreaObject, Bounds, BuildingObject, Density, Point, RoadObject, SpatialDataset, SpatialObject, TreeObject } from "../../visualization/types/visualization.types";
import type { DerivedSpatialState, ObjectPatch, ScenarioSpatialState, SpatialChangeKind, SpatialOp } from "../types/optimization.types";

/**
 * Scenario spatial state helpers.
 *
 * A scenario is stored as a list of ops against the current SpatialDataset
 * (add / modify / remove). `applyScenarioOps` derives the scenario dataset
 * that the Step 12 renderers draw — the current dataset is never duplicated
 * in storage and the derivation is memoised by the caller.
 */

// ---------------------------------------------------------------------------
// Small geometry helpers (deterministic, no randomness)
// ---------------------------------------------------------------------------

export function rectPolygon(center: Point, width: number, depth: number): Point[] {
  const hw = width / 2;
  const hd = depth / 2;
  return [
    { x: center.x - hw, y: center.y - hd },
    { x: center.x + hw, y: center.y - hd },
    { x: center.x + hw, y: center.y + hd },
    { x: center.x - hw, y: center.y + hd },
  ];
}

export function boundsIntersect(a: Bounds, b: Bounds, margin = 0): boolean {
  return a.x - margin < b.x + b.width && a.x + a.width + margin > b.x && a.y - margin < b.y + b.height && a.y + a.height + margin > b.y;
}

export function buildingBounds(b: BuildingObject): Bounds {
  return geometryBounds(b.geometry);
}

/** Offset a polyline sideways by `d` metres (positive = right of travel direction). */
export function offsetPolyline(points: Point[], d: number): Point[] {
  if (points.length < 2) return points.map((p) => ({ x: p.x, y: p.y + d }));
  const out: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    out.push({ x: points[i].x + (-dy / len) * d, y: points[i].y + (dx / len) * d });
  }
  return out;
}

/** Strip polygon between two parallel offsets of a polyline. */
export function stripPolygon(points: Point[], from: number, to: number): Point[] {
  const a = offsetPolyline(points, from);
  const b = offsetPolyline(points, to).reverse();
  return [...a, ...b];
}

/** Points spaced every `step` metres along a polyline (excluding the very ends). */
export function pointsAlong(points: Point[], step: number, inset = 12): Point[] {
  const total = polylineLength(points);
  const out: Point[] = [];
  for (let s = inset; s <= total - inset; s += step) {
    let acc = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const seg = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
      if (acc + seg >= s) {
        const t = seg === 0 ? 0 : (s - acc) / seg;
        out.push({ x: points[i].x + (points[i + 1].x - points[i].x) * t, y: points[i].y + (points[i + 1].y - points[i].y) * t });
        break;
      }
      acc += seg;
    }
  }
  return out;
}

export function densityFor(floors: number): Density {
  return floors >= 8 ? "High" : floors >= 4 ? "Medium" : "Low";
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ---------------------------------------------------------------------------
// Dataset views used by the provider
// ---------------------------------------------------------------------------

export interface DatasetView {
  boundary: Point[] | null;
  water: Point[][];
  buildings: BuildingObject[];
  /** Buildings the plan can still change (anything not "Existing"). */
  proposed: BuildingObject[];
  roads: RoadObject[];
  paths: RoadObject[];
  greens: AreaObject[];
  blocks: AreaObject[];
  siteCenter: Point;
  siteAreaM2: number;
  /** Trees per hectare-ish indicator used for canopy change copy. */
  trees: TreeObject[];
  transitStations: { point: Point; name: string }[];
}

export function viewDataset(data: SpatialDataset): DatasetView {
  const boundary = (data.objects.find((o) => o.type === "boundary") as { geometry: { points: Point[] } } | undefined)?.geometry.points ?? null;
  const water = data.objects.filter((o): o is AreaObject => o.type === "water").map((w) => w.geometry.points);
  const buildings = data.objects.filter((o): o is BuildingObject => o.type === "building").sort((a, b) => a.id.localeCompare(b.id));
  const proposed = buildings.filter((b) => b.properties.status !== "Existing");
  const roads = data.objects.filter((o): o is RoadObject => o.type === "road" && !o.id.startsWith("ctx-")).sort((a, b) => a.id.localeCompare(b.id));
  const paths = data.objects.filter((o): o is RoadObject => o.type === "path" && !o.id.startsWith("ctx-")).sort((a, b) => a.id.localeCompare(b.id));
  const greens = data.objects.filter((o): o is AreaObject => o.type === "green").sort((a, b) => a.id.localeCompare(b.id));
  const blocks = data.objects
    .filter((o): o is AreaObject => o.type === "block" && /development/i.test(o.properties.category))
    .sort((a, b) => a.id.localeCompare(b.id));
  const trees = data.objects.filter((o): o is TreeObject => o.type === "tree");
  const transit = data.objects.find((o) => o.type === "transit");
  const transitStations = transit && transit.type === "transit" ? transit.properties.stations : [];
  const siteCenter = { x: data.siteBounds.x + data.siteBounds.width / 2, y: data.siteBounds.y + data.siteBounds.height / 2 };
  const siteAreaM2 = boundary ? polygonArea(boundary) : data.siteBounds.width * data.siteBounds.height;
  return { boundary, water, buildings, proposed, roads, paths, greens, blocks, siteCenter, siteAreaM2, trees, transitStations };
}

function insideSite(view: DatasetView, poly: Point[]): boolean {
  if (view.boundary && !poly.every((p) => pointInPolygon(p, view.boundary as Point[]))) return false;
  return !view.water.some((w) => poly.some((p) => pointInPolygon(p, w)));
}

export interface FreeCell {
  center: Point;
  width: number;
  depth: number;
  blockId: string;
}

/**
 * Deterministic free-space scan: candidate cells at the corners and edge
 * midpoints of every development block that do not collide with buildings,
 * green areas, water or previously chosen cells.
 */
export function findFreeCells(view: DatasetView, size: { width: number; depth: number }, count: number, prefer: "centre" | "spread", taken: Bounds[] = []): FreeCell[] {
  const cells: FreeCell[] = [];
  const used: Bounds[] = [...taken];
  const obstacles: Bounds[] = [...view.buildings.map(buildingBounds), ...view.greens.map((g) => geometryBounds(g.geometry))];
  const blocks = [...view.blocks];
  if (prefer === "centre") blocks.sort((a, b) => distance(centroid(a.geometry.points), view.siteCenter) - distance(centroid(b.geometry.points), view.siteCenter) || a.id.localeCompare(b.id));

  const inset = { x: size.width / 2 + 7, y: size.depth / 2 + 7 };
  const roundsNeeded = prefer === "spread" ? 1 : 2; // spread: one cell per block first
  for (let round = 0; round < roundsNeeded + 1 && cells.length < count; round++) {
    for (const block of blocks) {
      if (cells.length >= count) break;
      const b = geometryBounds(block.geometry);
      const candidates: Point[] = [
        { x: b.x + inset.x, y: b.y + inset.y },
        { x: b.x + b.width - inset.x, y: b.y + b.height - inset.y },
        { x: b.x + b.width - inset.x, y: b.y + inset.y },
        { x: b.x + inset.x, y: b.y + b.height - inset.y },
        { x: b.x + b.width / 2, y: b.y + inset.y },
        { x: b.x + b.width / 2, y: b.y + b.height - inset.y },
      ];
      let placedInBlock = 0;
      for (const c of candidates) {
        if (cells.length >= count) break;
        if (prefer === "spread" && placedInBlock >= 1) break;
        if (round === 0 && placedInBlock >= 1) break;
        const cb: Bounds = { x: c.x - size.width / 2, y: c.y - size.depth / 2, width: size.width, height: size.depth };
        const poly = rectPolygon(c, size.width, size.depth);
        if (!insideSite(view, poly)) continue;
        if (obstacles.some((o) => boundsIntersect(o, cb, 5))) continue;
        if (used.some((u) => boundsIntersect(u, cb, 6))) continue;
        used.push(cb);
        cells.push({ center: c, width: size.width, depth: size.depth, blockId: block.id });
        placedInBlock++;
      }
    }
  }
  return cells;
}

// ---------------------------------------------------------------------------
// Applying ops
// ---------------------------------------------------------------------------

function patchBuilding(b: BuildingObject, patch: ObjectPatch): BuildingObject {
  const floors = patch.floors ?? b.properties.floors;
  const perFloor = b.properties.floors > 0 ? b.properties.height / b.properties.floors : 3.5;
  const height = patch.height ?? Math.round(floors * perFloor);
  const capacity = patch.populationCapacity ?? Math.round((b.properties.populationCapacity * floors) / Math.max(1, b.properties.floors));
  return {
    ...b,
    name: patch.name ?? b.name,
    properties: { ...b.properties, floors, height, populationCapacity: capacity, density: patch.density ?? densityFor(floors) },
  };
}

function patchRoad(r: RoadObject, patch: ObjectPatch): RoadObject {
  return {
    ...r,
    name: patch.name ?? r.name,
    geometry: { ...r.geometry, width: patch.width ?? r.geometry.width },
    properties: { ...r.properties, roadClass: patch.roadClass ?? r.properties.roadClass, lanes: patch.lanes ?? r.properties.lanes },
  };
}

function patchArea(a: AreaObject, patch: ObjectPatch): AreaObject {
  return { ...a, name: patch.name ?? a.name, properties: { ...a.properties, category: patch.category ?? a.properties.category } };
}

export function applyPatch(o: SpatialObject, patch: ObjectPatch): SpatialObject {
  switch (o.type) {
    case "building":
      return patchBuilding(o, patch);
    case "road":
    case "path":
      return patchRoad(o, patch);
    case "green":
    case "water":
    case "parking":
    case "block":
      return patchArea(o, patch);
    default:
      return patch.name ? ({ ...o, name: patch.name } as SpatialObject) : o;
  }
}

export function countOps(ops: SpatialOp[]): Record<SpatialChangeKind, number> {
  const counts: Record<SpatialChangeKind, number> = { added: 0, modified: 0, removed: 0, unchanged: 0 };
  for (const op of ops) {
    if (op.op === "add") counts.added++;
    else if (op.op === "modify") counts.modified++;
    else counts.removed++;
  }
  return counts;
}

/**
 * Current SpatialDataset + ops → scenario SpatialDataset (+ change index).
 * Summary headline numbers are overridden by the scenario metrics so status
 * bars stay consistent with the scenario being viewed.
 */
export function applyScenarioOps(base: SpatialDataset, state: ScenarioSpatialState, summary: { greenCoveragePct: number; populationCapacity: number }, label: string): DerivedSpatialState {
  const removedIds = new Set<string>();
  const patches = new Map<string, ObjectPatch>();
  const modifiedNotes = new Map<string, string>();
  const added: SpatialObject[] = [];
  const addedIds: string[] = [];
  for (const op of state.ops) {
    if (op.op === "remove") removedIds.add(op.objectId);
    else if (op.op === "modify") {
      patches.set(op.objectId, { ...(patches.get(op.objectId) ?? {}), ...op.patch });
      modifiedNotes.set(op.objectId, op.note);
    } else {
      added.push(op.object);
      addedIds.push(op.object.id);
      modifiedNotes.set(op.object.id, op.note);
    }
  }
  const changeOf = new Map<string, SpatialChangeKind>();
  const removed: SpatialObject[] = [];
  const objects: SpatialObject[] = [];
  for (const o of base.objects) {
    if (removedIds.has(o.id)) {
      removed.push(o);
      changeOf.set(o.id, "removed");
      continue;
    }
    // trees that belonged to a removed tree zone disappear with it
    const owner = o.type === "tree" ? o.id.replace(/-t\d+$/, "") : null;
    if (owner && removedIds.has(owner)) {
      removed.push(o);
      continue;
    }
    const patch = patches.get(o.id);
    if (patch) {
      objects.push(applyPatch(o, patch));
      changeOf.set(o.id, "modified");
    } else objects.push(o);
  }
  for (const a of added) {
    objects.push(a);
    changeOf.set(a.id, "added");
  }
  const buildings = objects.filter((o) => o.type === "building").length;
  const dataset: SpatialDataset = {
    ...base,
    objects,
    summary: { ...base.summary, buildings: Math.max(buildings, base.summary.buildings + (buildings - base.objects.filter((o) => o.type === "building").length)), greenCoveragePct: summary.greenCoveragePct, populationCapacity: summary.populationCapacity },
    source: { kind: "demo", note: `${label} — generated planning scenario derived from the current plan` },
  };
  return { dataset, changeOf, removed, addedIds, modifiedNotes };
}

/** Tallest building the plan can still influence (non-existing), in floors. */
export function tallestProposedFloors(objects: SpatialObject[]): number {
  let max = 0;
  for (const o of objects) if (o.type === "building" && o.properties.status !== "Existing") max = Math.max(max, o.properties.floors);
  return max;
}

export function areaOfPolygon(points: Point[]): number {
  return polygonArea(points);
}

export function lengthOfLine(points: Point[]): number {
  return polylineLength(points);
}
