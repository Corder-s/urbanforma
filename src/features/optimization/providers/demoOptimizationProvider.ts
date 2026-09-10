import { centroid } from "../../planning/lib/geometry";
import type { AreaObject, BuildingObject, LandUse, Point, RoadObject, SpatialObject, TreeObject } from "../../visualization/types/visualization.types";
import { GOALS, SCENARIO_KINDS, priorityWeight } from "../data/optimization.data";
import { areaOfPolygon, buildingBounds, countOps, densityFor, findFreeCells, lengthOfLine, pointsAlong, rectPolygon, stripPolygon, viewDataset, type DatasetView, type FreeCell } from "../lib/scenario.spatial";
import type { GoalId, ObjectPatch, OptimizationInput, OptimizationScenario, PlanningConstraint, ScenarioChange, ScenarioKind, ScenarioMetrics, SpatialOp } from "../types/optimization.types";
import type { OptimizationProvider } from "./optimizationProvider";

/**
 * Demo optimization provider.
 *
 * Deterministic planning heuristics — the same current plan, goals, weights
 * and constraints always produce the same scenarios. Nothing is random, no
 * physics or routing is simulated: each scenario applies a typed recipe of
 * spatial operations to the current plan (add / modify / remove) and adjusts
 * the analysis indicators by illustrative, kind-specific amounts.
 *
 *   goals         → intensity of each scenario direction (light / standard / strong)
 *   constraints   → Balanced & Green respect max height, max population and min green;
 *                   Mobility and Compact are checked but deliberately explore the envelope
 *   weights       → scoring only (done by the service so the UI can re-score live)
 *
 * Replace with a backend / real engine by implementing OptimizationProvider.
 */

const PEOPLE_PER_M2: Record<LandUse, number> = { Residential: 0.0423, Commercial: 0.02, "Mixed Use": 0.028, Civic: 0.012, Institutional: 0.015, Industrial: 0.006 };
const FLOOR_HEIGHT = 3.5;
/** Mature canopy of one new street tree (radius ≈ 3.4 m). */
const CANOPY_M2 = Math.round(Math.PI * 3.4 * 3.4);

type Tier = "light" | "standard" | "strong";

interface KindProfile {
  goals: GoalId[];
  /** Default-goal calibration factor (so the specification's example values appear with the default goals). */
  defaultFactor: number;
  /** Illustrative indicator deltas versus the current plan (before intensity scaling). */
  deltas: Partial<Record<keyof ScenarioMetrics, number>>;
  shadedPedestrianPct: number;
  hardSurfacePct: number;
}

const PROFILES: Record<ScenarioKind, KindProfile> = {
  balanced: {
    goals: GOALS.map((g) => g.id),
    defaultFactor: 1.0156,
    deltas: { environment: 3, mobility: 6, urbanForm: 1, greenInfrastructure: 1, carbon: 6, heatIndex: -10, solar: 3, siteCoverage: 1, publicOpenSpace: 1 },
    shadedPedestrianPct: 5,
    hardSurfacePct: -3,
  },
  green: {
    goals: ["green", "heat", "environment", "carbon", "publicspace"],
    defaultFactor: 1.024,
    deltas: { environment: 8, mobility: -2, urbanForm: 1, greenInfrastructure: 5, carbon: 12, heatIndex: -12, solar: 4, siteCoverage: -3, publicOpenSpace: 4 },
    shadedPedestrianPct: 12,
    hardSurfacePct: -8,
  },
  mobility: {
    goals: ["mobility", "carbon", "publicspace", "landuse"],
    defaultFactor: 1.005,
    deltas: { environment: -1, mobility: 16, urbanForm: 2, greenInfrastructure: -4, carbon: 9, heatIndex: 1, solar: 0, siteCoverage: 2, publicOpenSpace: 1 },
    shadedPedestrianPct: 9,
    hardSurfacePct: 2,
  },
  compact: {
    goals: ["density", "landuse", "mobility"],
    defaultFactor: 1.0067,
    deltas: { environment: -4, mobility: 8, urbanForm: 6, greenInfrastructure: -6, carbon: 8, heatIndex: 5, solar: -4, siteCoverage: 5, publicOpenSpace: -1 },
    shadedPedestrianPct: -4,
    hardSurfacePct: 6,
  },
};

function intensity(kind: ScenarioKind, input: OptimizationInput): { factor: number; tier: Tier } {
  const profile = PROFILES[kind];
  const weights = profile.goals.map((id) => priorityWeight(input.inputs.goals.find((g) => g.id === id)?.priority ?? "medium"));
  const mean = weights.reduce((s, w) => s + w, 0) / Math.max(1, weights.length);
  const factor = (0.8 + 0.2 * mean) / profile.defaultFactor;
  const tier: Tier = mean < 0.85 ? "light" : mean < 1.25 ? "standard" : "strong";
  return { factor, tier };
}

function constraint(input: OptimizationInput, id: PlanningConstraint["id"]): PlanningConstraint | null {
  const c = input.inputs.constraints.find((x) => x.id === id);
  return c && c.enabled ? c : null;
}

// ---------------------------------------------------------------------------
// Object factories (ids are stable per generation so re-derivation is exact)
// ---------------------------------------------------------------------------

function makeBuilding(id: string, name: string, cell: FreeCell, floors: number, landUse: LandUse): BuildingObject {
  const footprint = Math.round(cell.width * cell.depth);
  return {
    id,
    type: "building",
    name,
    geometry: { kind: "rect", center: cell.center, width: cell.width, depth: cell.depth, rotation: 0 },
    properties: {
      landUse,
      floors,
      height: Math.round(floors * FLOOR_HEIGHT),
      footprint,
      density: densityFor(floors),
      status: "Proposed",
      populationCapacity: Math.round(footprint * floors * PEOPLE_PER_M2[landUse]),
      environmental: { solarExposure: 72, heatSensitivity: floors >= 8 ? "Medium" : "Low", greenProximityM: 60 },
    },
    layer: "buildings",
    selectable: true,
    visible: true,
  };
}

function makeGreen(id: string, name: string, points: Point[], category: string, layer: "green" | "parks"): AreaObject {
  return {
    id,
    type: "green",
    name,
    geometry: { kind: "polygon", points },
    properties: { category, areaM2: Math.round(areaOfPolygon(points)), status: "Proposed" },
    layer,
    selectable: true,
    visible: true,
  };
}

function makeBlock(id: string, name: string, points: Point[], category: string): AreaObject {
  return {
    id,
    type: "block",
    name,
    geometry: { kind: "polygon", points },
    properties: { category, areaM2: Math.round(areaOfPolygon(points)), status: "Proposed" },
    layer: "blocks",
    selectable: true,
    visible: true,
  };
}

function makePath(id: string, name: string, points: Point[], width: number): RoadObject {
  return {
    id,
    type: "path",
    name,
    geometry: { kind: "line", points, width },
    properties: { roadClass: "Pedestrian", lanes: 0, lengthM: Math.round(lengthOfLine(points)), status: "Proposed" },
    layer: "roads",
    selectable: true,
    visible: true,
  };
}

function makeTree(id: string, name: string, point: Point): TreeObject {
  return { id, type: "tree", name, geometry: { kind: "point", point }, properties: { canopyM: 3.6, heightM: 8 }, layer: "trees", selectable: false, visible: true };
}

// ---------------------------------------------------------------------------
// Recipe builder — accumulates ops and the derived quantities
// ---------------------------------------------------------------------------

class Recipe {
  ops: SpatialOp[] = [];
  addedGreenM2 = 0;
  removedGreenM2 = 0;
  corridorM = 0;
  pathM = 0;
  trees = 0;
  /** Canopy area of the new trees (m²) — counts towards green coverage. */
  canopyM2 = 0;
  addedBuildings: BuildingObject[] = [];
  removedBuildings: BuildingObject[] = [];
  /** Raw people-capacity delta (dataset units). */
  capacityDelta = 0;
  /** Gross floor area delta in m². */
  gfaDelta = 0;
  addedFootprintM2 = 0;
  private counter = 0;

  constructor(
    private readonly view: DatasetView,
    private readonly prefix: string
  ) {}

  nextId(kind: string): string {
    this.counter += 1;
    return `${this.prefix}-${kind}-${this.counter}`;
  }

  addBuilding(cell: FreeCell, floors: number, landUse: LandUse, name: string, note: string): BuildingObject {
    const b = makeBuilding(this.nextId("bld"), name, cell, floors, landUse);
    this.ops.push({ op: "add", object: b, note });
    this.addedBuildings.push(b);
    this.capacityDelta += b.properties.populationCapacity;
    this.gfaDelta += b.properties.footprint * floors;
    this.addedFootprintM2 += b.properties.footprint;
    return b;
  }

  removeBuilding(b: BuildingObject, note: string) {
    this.ops.push({ op: "remove", objectId: b.id, note });
    this.removedBuildings.push(b);
    this.capacityDelta -= b.properties.populationCapacity;
    this.gfaDelta -= b.properties.footprint * b.properties.floors;
  }

  setFloors(b: BuildingObject, floors: number, note: string) {
    if (floors === b.properties.floors) return;
    const perFloorCap = b.properties.populationCapacity / Math.max(1, b.properties.floors);
    const patch: ObjectPatch = { floors, height: Math.round((floors * b.properties.height) / Math.max(1, b.properties.floors)), populationCapacity: Math.round(perFloorCap * floors), density: densityFor(floors) };
    this.ops.push({ op: "modify", objectId: b.id, patch, note });
    this.capacityDelta += patch.populationCapacity! - b.properties.populationCapacity;
    this.gfaDelta += (floors - b.properties.floors) * b.properties.footprint;
  }

  modifyRoad(r: RoadObject, patch: ObjectPatch, note: string) {
    this.ops.push({ op: "modify", objectId: r.id, patch, note });
  }

  addGreen(points: Point[], name: string, category: string, layer: "green" | "parks", note: string): AreaObject {
    const g = makeGreen(this.nextId("green"), name, points, category, layer);
    this.ops.push({ op: "add", object: g, note });
    this.addedGreenM2 += g.properties.areaM2;
    return g;
  }

  addPlaza(points: Point[], name: string, note: string) {
    this.ops.push({ op: "add", object: makeBlock(this.nextId("plaza"), name, points, "Plaza"), note });
  }

  addPath(points: Point[], name: string, width: number, note: string) {
    const p = makePath(this.nextId("path"), name, points, width);
    this.ops.push({ op: "add", object: p, note });
    this.pathM += p.properties.lengthM;
  }

  /**
   * Planting strips on both sides of a street + street trees along them. Each
   * strip is as wide as the clearance to the nearest building allows (3 m
   * minimum) so corridors never overlap built footprints.
   */
  addCorridor(road: RoadObject, stripWidth: number, treeStep: number, note: string) {
    const half = road.geometry.width / 2;
    const clear = sideClearance(road, this.view.buildings.concat(this.addedBuildings));
    const left = Math.max(3, Math.min(stripWidth, clear.left - 1.5));
    const right = Math.max(3, Math.min(stripWidth, clear.right - 1.5));
    const leftPoly = stripPolygon(road.geometry.points, -(half + left + 0.5), -(half + 0.5));
    const rightPoly = stripPolygon(road.geometry.points, half + 0.5, half + right + 0.5);
    this.addGreen(leftPoly, `${road.name} green corridor (north/west side)`, "Green corridor", "green", note);
    this.addGreen(rightPoly, `${road.name} green corridor (south/east side)`, "Green corridor", "green", note);
    this.corridorM += road.properties.lengthM;
    const centres = pointsAlong(road.geometry.points, treeStep, 18);
    const start = road.geometry.points[0];
    const end = road.geometry.points[road.geometry.points.length - 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (const c of centres) {
      this.addTree({ x: c.x + nx * (half + 0.5 + left / 2), y: c.y + ny * (half + 0.5 + left / 2) }, `${road.name} street tree`);
      this.addTree({ x: c.x - nx * (half + 0.5 + right / 2), y: c.y - ny * (half + 0.5 + right / 2) }, `${road.name} street tree`);
    }
  }

  addTree(point: Point, name: string) {
    if (this.view.boundary && !insidePolygon(point, this.view.boundary)) return;
    this.ops.push({ op: "add", object: makeTree(this.nextId("tree"), name, point), note: "Street tree planting" });
    this.trees += 1;
    this.canopyM2 += CANOPY_M2;
  }

  /** Small tree grid inside a new park. */
  plantPark(points: Point[], name: string) {
    const c = centroid(points);
    const offsets = [
      [-14, -10],
      [0, -12],
      [14, -10],
      [-16, 4],
      [0, 6],
      [16, 4],
      [-8, 16],
      [8, 16],
    ];
    for (const [ox, oy] of offsets) this.addTree({ x: c.x + ox, y: c.y + oy }, `${name} tree`);
  }

  takenBounds() {
    return this.addedBuildings.map(buildingBounds).concat(this.addedGreenBounds);
  }
  private addedGreenBounds: { x: number; y: number; width: number; height: number }[] = [];
  reserve(points: Point[]) {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    this.addedGreenBounds.push({ x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) });
  }
}

function insidePolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect = yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Perpendicular clearance from a (straight) road's edge to the nearest building on each side. */
function sideClearance(road: RoadObject, buildings: BuildingObject[]): { left: number; right: number } {
  const pts = road.geometry.points;
  const a = pts[0];
  const b = pts[pts.length - 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const half = road.geometry.width / 2;
  let left = 40;
  let right = 40;
  for (const bld of buildings) {
    const bb = buildingBounds(bld);
    const corners = [
      { x: bb.x, y: bb.y },
      { x: bb.x + bb.width, y: bb.y },
      { x: bb.x, y: bb.y + bb.height },
      { x: bb.x + bb.width, y: bb.y + bb.height },
    ];
    const along = corners.map((c) => (c.x - a.x) * ux + (c.y - a.y) * uy);
    if (Math.max(...along) < 0 || Math.min(...along) > len) continue; // not beside this road
    const across = corners.map((c) => (c.x - a.x) * -uy + (c.y - a.y) * ux); // + = left of travel (screen)
    const minAcross = Math.min(...across);
    const maxAcross = Math.max(...across);
    if (minAcross > 0) left = Math.min(left, minAcross - half);
    else if (maxAcross < 0) right = Math.min(right, -maxAcross - half);
    else {
      left = Math.min(left, 0);
      right = Math.min(right, 0);
    }
  }
  return { left, right };
}

/** Pick the candidate coordinate with the most clearance from buildings and parallel roads (deterministic). */
function bestLine(view: DatasetView, axis: "x" | "y", candidates: number[]): number {
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const c of candidates) {
    let score = Infinity;
    for (const b of view.buildings) {
      const bb = buildingBounds(b);
      const lo = axis === "x" ? bb.x : bb.y;
      const hi = axis === "x" ? bb.x + bb.width : bb.y + bb.height;
      score = Math.min(score, c < lo ? lo - c : c > hi ? c - hi : 0);
    }
    for (const r of view.roads) {
      const p0 = r.geometry.points[0];
      const p1 = r.geometry.points[r.geometry.points.length - 1];
      const straightAlong = axis === "x" ? Math.abs(p0.x - p1.x) < 1 : Math.abs(p0.y - p1.y) < 1;
      if (!straightAlong) continue;
      const pos = axis === "x" ? p0.x : p0.y;
      score = Math.min(score, Math.max(0, Math.abs(pos - c) - r.geometry.width / 2));
    }
    if (score > bestScore + 1e-9) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

function byCentrality(view: DatasetView, list: BuildingObject[]): BuildingObject[] {
  return [...list].sort((a, b) => Math.hypot(a.geometry.center.x - view.siteCenter.x, a.geometry.center.y - view.siteCenter.y) - Math.hypot(b.geometry.center.x - view.siteCenter.x, b.geometry.center.y - view.siteCenter.y) || a.id.localeCompare(b.id));
}

function tallestFirst(list: BuildingObject[]): BuildingObject[] {
  return [...list].sort((a, b) => b.properties.floors - a.properties.floors || a.id.localeCompare(b.id));
}

function mainStreets(view: DatasetView): RoadObject[] {
  const rank = { Arterial: 0, Collector: 1, Local: 2, Pedestrian: 3 } as const;
  return [...view.roads].sort((a, b) => rank[a.properties.roadClass] - rank[b.properties.roadClass] || b.properties.lengthM - a.properties.lengthM || a.id.localeCompare(b.id));
}

function stepDownTowers(recipe: Recipe, view: DatasetView, limit: number | null, max: number, note: (b: BuildingObject, to: number) => string): BuildingObject[] {
  if (limit === null) return [];
  const touched: BuildingObject[] = [];
  for (const b of tallestFirst(view.proposed)) {
    if (b.properties.floors <= limit) break;
    if (touched.length >= max) break;
    const to = Math.max(limit, b.properties.floors - 3);
    recipe.setFloors(b, to, note(b, to));
    touched.push(b);
  }
  return touched;
}

/** Drop added buildings (last first) until the population limit holds. */
function respectPopulation(recipe: Recipe, base: number, scale: number, limit: number | null) {
  if (limit === null) return;
  const population = () => Math.round(base * (1 + (recipe.capacityDelta * scale) / Math.max(1, base)));
  while (population() > limit && recipe.addedBuildings.length > 0) {
    const last = recipe.addedBuildings.pop()!;
    const idx = recipe.ops.findIndex((op) => op.op === "add" && op.object.id === last.id);
    if (idx >= 0) recipe.ops.splice(idx, 1);
    recipe.capacityDelta -= last.properties.populationCapacity;
    recipe.gfaDelta -= last.properties.footprint * last.properties.floors;
    recipe.addedFootprintM2 -= last.properties.footprint;
  }
}

function parkCells(view: DatasetView, recipe: Recipe, count: number, prefer: "centre" | "spread"): FreeCell[] {
  return findFreeCells(view, { width: 66, depth: 50 }, count, prefer, recipe.takenBounds());
}

function canopyText(recipe: Recipe, siteM2: number): string {
  return `+${((recipe.canopyM2 / Math.max(1, siteM2)) * 100).toFixed(1)}% tree canopy`;
}

function addParks(recipe: Recipe, cells: FreeCell[], label: string, note: string) {
  cells.forEach((cell, i) => {
    const poly = rectPolygon(cell.center, cell.width, cell.depth);
    recipe.reserve(poly);
    recipe.addGreen(poly, `${label} ${i + 1}`, "Park", "parks", note);
    recipe.plantPark(poly, `${label} ${i + 1}`);
  });
}

/** Typical floors of the plan's proposed buildings (used to size new buildings in character). */
function typicalFloors(view: DatasetView): number {
  const list = view.proposed.length ? view.proposed : view.buildings;
  if (!list.length) return 6;
  return list.reduce((s, b) => s + b.properties.floors, 0) / list.length;
}

function clampInt(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

/** Site-size factor (the 51 ha walkthrough site = 1) so small sites get proportionally fewer interventions. */
function siteScale(view: DatasetView): number {
  return Math.max(0.3, Math.min(1.4, view.siteAreaM2 / 510_000));
}

function scaled(base: number, view: DatasetView, min = 1): number {
  return Math.max(min, Math.round(base * siteScale(view)));
}

function fmtHa(m2: number): string {
  return `${(m2 / 10000).toFixed(1)} ha`;
}
function fmtKm(m: number): string {
  return `${(m / 1000).toFixed(1)} km`;
}

// ---------------------------------------------------------------------------
// Scenario recipes
// ---------------------------------------------------------------------------

interface BuiltScenario {
  ops: SpatialOp[];
  changes: ScenarioChange[];
  recipe: Recipe;
}

function buildBalanced(view: DatasetView, input: OptimizationInput, tier: Tier, prefix: string): BuiltScenario {
  const recipe = new Recipe(view, prefix);
  const heightLimit = constraint(input, "max-height")?.value ?? null;
  const stepped = stepDownTowers(recipe, view, heightLimit, 4, (b, to) => `${b.name} stepped down to ${to} floors to meet the height envelope`);

  const infillCount = tier === "light" ? 2 : tier === "strong" ? 4 : 3;
  const infillFloors = clampInt(typicalFloors(view) - 1, 3, 6);
  const cells = findFreeCells(view, { width: 30, depth: 26 }, infillCount, "spread", recipe.takenBounds());
  cells.forEach((cell, i) => recipe.addBuilding(cell, infillFloors, "Residential", `New residential ${i + 1}`, `${infillFloors}-floor residential infill on an under-used block edge`));

  const streets = mainStreets(view);
  const corridors = streets.slice(0, scaled(tier === "light" ? 1 : 2, view));
  for (const r of corridors) recipe.addCorridor(r, siteScale(view) < 0.6 ? 4 : 6.5, 22, `Green corridor with street trees along ${r.name}`);

  addParks(recipe, parkCells(view, recipe, scaled(tier === "light" ? 1 : tier === "strong" ? 3 : 2, view), "spread"), "Neighbourhood green", "New neighbourhood green on a vacant block corner");
  const pockets = findFreeCells(view, { width: 38, depth: 34 }, scaled(2, view), "spread", recipe.takenBounds());
  pockets.forEach((cell, i) => {
    const poly = rectPolygon(cell.center, cell.width, cell.depth);
    recipe.reserve(poly);
    recipe.addGreen(poly, `Pocket park ${i + 1}`, "Pocket park", "green", "Pocket park within walking distance of new homes");
  });

  const greenway = view.paths[0];
  if (greenway) recipe.modifyRoad(greenway, { width: Math.max(greenway.geometry.width, 6) }, `${greenway.name} widened to a 6 m shared path`);

  const changes: ScenarioChange[] = [];
  if (cells.length) changes.push({ id: "c-infill", type: "Added", text: `+ ${cells.length} mid-rise residential building${cells.length === 1 ? "" : "s"}`, detail: `${infillFloors}-floor infill on under-used block edges` });
  changes.push({ id: "c-green", type: "Added", text: `+ ${fmtHa(recipe.addedGreenM2)} green space`, detail: "Neighbourhood green, pocket parks and planting strips" });
  if (recipe.corridorM) changes.push({ id: "c-corridor", type: "Added", text: `+ ${fmtKm(recipe.corridorM)} green corridors`, detail: corridors.map((r) => r.name).join(", ") });
  if (stepped.length) changes.push({ id: "c-step", type: "Reconfigured", text: `↻ ${stepped.length} tower${stepped.length === 1 ? "" : "s"} stepped down to ${heightLimit} floors`, detail: stepped.map((b) => b.name).join(", ") });
  if (greenway) changes.push({ id: "c-greenway", type: "Reconfigured", text: `↻ ${greenway.name} widened to a shared path`, detail: "6 m width for walking and cycling" });
  if (recipe.trees) changes.push({ id: "c-trees", type: "Added", text: `+ ${recipe.trees} street and park trees`, detail: `${canopyText(recipe, view.siteAreaM2)} · estimated +5% shaded pedestrian area` });
  return { ops: recipe.ops, changes, recipe };
}

function buildGreen(view: DatasetView, input: OptimizationInput, tier: Tier, prefix: string): BuiltScenario {
  const recipe = new Recipe(view, prefix);
  const heightLimit = constraint(input, "max-height")?.value ?? null;

  // two tallest proposed towers make way for parks; their capacity partly relocates as courtyard housing
  const towers = tallestFirst(view.proposed).filter((b) => b.properties.floors >= 8).slice(0, 2);
  towers.forEach((b, i) => {
    recipe.removeBuilding(b, `${b.name} (${b.properties.floors} floors) removed in favour of a park`);
    const g = b.geometry;
    const poly = rectPolygon(g.center, Math.max(g.width, 30) + 10, Math.max(g.depth, 34) + 8);
    recipe.reserve(poly);
    recipe.addGreen(poly, `Park at former ${b.name}`, "Park", "parks", `Former ${b.name} site converted to a park`);
    recipe.plantPark(poly, `Park ${i + 1}`);
  });
  const stepped = stepDownTowers(recipe, view, heightLimit, 3, (b, to) => `${b.name} stepped down to ${to} floors to open the skyline`);

  const relocate = findFreeCells(view, { width: 34, depth: 26 }, 1, "spread", recipe.takenBounds());
  const courtyardFloors = clampInt(typicalFloors(view) - 1, 3, 6);
  relocate.forEach((cell) => recipe.addBuilding(cell, courtyardFloors, "Residential", "Courtyard housing", "Relocated capacity as mid-rise courtyard housing"));

  const streets = mainStreets(view);
  const corridors = streets.slice(0, scaled(tier === "light" ? 2 : tier === "strong" ? 4 : 3, view));
  for (const r of corridors) recipe.addCorridor(r, siteScale(view) < 0.6 ? 5 : 8, 16, `Continuous green corridor with street trees along ${r.name}`);

  addParks(recipe, parkCells(view, recipe, scaled(tier === "light" ? 2 : tier === "strong" ? 5 : 4, view), "spread"), "Neighbourhood park", "New neighbourhood park on a vacant block corner");

  // meet the configured minimum green coverage when possible (up to 3 additional greens)
  const minGreen = constraint(input, "min-green")?.value ?? null;
  if (minGreen !== null) {
    let extra = 0;
    while (extra < 3 && coverageAfter(view, input, recipe) < minGreen) {
      const cells = parkCells(view, recipe, 1, "spread");
      if (!cells.length) break;
      addParks(recipe, cells, "Additional green", "Additional green to reach the configured minimum green coverage");
      extra++;
    }
  }

  const changes: ScenarioChange[] = [
    { id: "c-green", type: "Added", text: `+ ${fmtHa(recipe.addedGreenM2)} green space`, detail: "Parks, pocket greens and planting strips" },
  ];
  if (recipe.corridorM) changes.push({ id: "c-corridor", type: "Added", text: `+ ${fmtKm(recipe.corridorM)} green corridors`, detail: corridors.map((r) => r.name).join(", ") });
  changes.push({ id: "c-hard", type: "Reduced", text: "− 8% hard surface", detail: "Estimated from the converted and planted areas" });
  if (towers.length) changes.push({ id: "c-towers", type: "Reduced", text: `− ${towers.length} high-rise building${towers.length === 1 ? "" : "s"}`, detail: towers.map((b) => `${b.name} (${b.properties.floors} floors)`).join(", ") });
  if (relocate.length) changes.push({ id: "c-move", type: "Moved", text: "→ Capacity relocated as courtyard housing", detail: `One ${courtyardFloors}-floor courtyard building replaces part of the removed tower capacity` });
  if (stepped.length) changes.push({ id: "c-step", type: "Reconfigured", text: `↻ ${stepped.map((b) => b.name).join(", ")} stepped down`, detail: `To ${heightLimit} floors` });
  changes.push({ id: "c-shade", type: "Added", text: "+ 12% shaded pedestrian area", detail: `${recipe.trees} new street and park trees (estimate)` });
  changes.push({ id: "c-canopy", type: "Added", text: `+ ${((recipe.canopyM2 / Math.max(1, view.siteAreaM2)) * 100).toFixed(1)}% tree canopy`, detail: "Mature canopy of the new trees, share of the site" });
  return { ops: recipe.ops, changes, recipe };
}

function buildMobility(view: DatasetView, _input: OptimizationInput, tier: Tier, prefix: string): BuiltScenario {
  const recipe = new Recipe(view, prefix);
  const locals = view.roads.filter((r) => r.properties.roadClass === "Local").sort((a, b) => b.properties.lengthM - a.properties.lengthM || a.id.localeCompare(b.id));
  const upgraded: RoadObject[] = [];
  const first = locals[0];
  if (first) {
    recipe.modifyRoad(first, { roadClass: "Collector", width: first.geometry.width + 4, lanes: Math.max(first.properties.lanes, 2) + 1 }, `${first.name} upgraded to a collector with protected cycle lanes`);
    upgraded.push(first);
  }
  const second = locals[1];
  if (second) {
    recipe.modifyRoad(second, { width: second.geometry.width + 4, lanes: Math.max(second.properties.lanes, 2) + 1 }, `${second.name} widened for bus priority`);
    upgraded.push(second);
  }
  for (const r of upgraded) recipe.addCorridor(r, 3, 30, `Street greening along the upgraded ${r.name}`);

  // pedestrian links: one east–west and one north–south line through the site, placed where they clear buildings and streets
  const bounds = view.boundary ? boundsOfPoints(view.boundary) : null;
  if (bounds) {
    const ys = [-3, -2, -1, 0, 1, 2, 3].map((k) => view.siteCenter.y + k * bounds.height * 0.06);
    const xs = [-3, -2, -1, 0, 1, 2, 3].map((k) => view.siteCenter.x + k * bounds.width * 0.05);
    const yMid = bestLine(view, "y", ys);
    const xMid = bestLine(view, "x", xs);
    recipe.addPath(
      [
        { x: bounds.x + 10, y: yMid },
        { x: bounds.x + bounds.width - 10, y: yMid },
      ],
      "East–west park link",
      4,
      "New pedestrian link between the neighbourhood parks"
    );
    recipe.addPath(
      [
        { x: xMid, y: bounds.y + 10 },
        { x: xMid, y: bounds.y + bounds.height - 10 },
      ],
      "North–south promenade",
      4,
      "New pedestrian promenade connecting the transit stops"
    );
  }

  const stations = view.transitStations.length ? view.transitStations : [{ point: view.siteCenter, name: "Site centre" }];
  const todFloors = clampInt(typicalFloors(view) + 1, 4, 8);
  const todCount = Math.min(tier === "light" ? 3 : tier === "strong" ? 5 : 4, clampInt(view.buildings.length * 0.12, 2, 5));
  const hubs = findFreeCells(view, { width: 30, depth: 28 }, todCount, "centre", recipe.takenBounds());
  const nearest = [...hubs].sort((a, b) => minDist(a.center, stations) - minDist(b.center, stations));
  nearest.forEach((cell, i) => recipe.addBuilding(cell, todFloors, i % 2 === 0 ? "Residential" : "Mixed Use", `Transit-oriented building ${i + 1}`, `${todFloors}-floor transit-oriented building near a stop`));
  const plaza = findFreeCells(view, { width: 34, depth: 30 }, 1, "centre", recipe.takenBounds());
  plaza.forEach((cell) => {
    const poly = rectPolygon(cell.center, cell.width, cell.depth);
    recipe.reserve(poly);
    recipe.addPlaza(poly, "Transit plaza", "Transit plaza at the busiest stop");
  });

  const changes: ScenarioChange[] = [];
  if (first) changes.push({ id: "c-road1", type: "Reconfigured", text: `↻ ${first.name} upgraded to a collector`, detail: `${first.geometry.width + 4} m section with protected cycle lanes` });
  if (second) changes.push({ id: "c-road2", type: "Reconfigured", text: `↻ ${second.name} widened for bus priority`, detail: `${second.geometry.width + 4} m section` });
  if (recipe.pathM) changes.push({ id: "c-paths", type: "Added", text: `+ 2 pedestrian links (${fmtKm(recipe.pathM)})`, detail: "East–west park link and north–south promenade" });
  if (nearest.length) changes.push({ id: "c-tod", type: "Added", text: `+ ${nearest.length} transit-oriented buildings`, detail: `${todFloors}-floor residential and mixed-use near the stops` });
  if (plaza.length) changes.push({ id: "c-plaza", type: "Added", text: "+ 1 transit plaza", detail: "Public space at the main stop" });
  if (recipe.addedGreenM2) changes.push({ id: "c-green", type: "Added", text: `+ ${fmtHa(recipe.addedGreenM2)} street greening`, detail: `${recipe.trees} street trees along the upgraded streets` });
  changes.push({ id: "c-open", type: "Reduced", text: `− ${fmtHa(recipe.addedFootprintM2 + (plaza.length ? 34 * 30 : 0))} open development area`, detail: "Used by the new buildings and plaza" });
  return { ops: recipe.ops, changes, recipe };
}

function buildCompact(view: DatasetView, _input: OptimizationInput, tier: Tier, prefix: string): BuiltScenario {
  const recipe = new Recipe(view, prefix);
  const currentMax = view.proposed.reduce((m, b) => Math.max(m, b.properties.floors), 0);
  const cap = Math.max(currentMax + 1, 6);
  const coreCount = Math.min(tier === "light" ? 8 : tier === "strong" ? 16 : 12, clampInt(view.proposed.length * 0.4, 3, 16));
  const core = byCentrality(view, view.proposed).slice(0, coreCount);
  const raised: BuildingObject[] = [];
  for (const b of core) {
    const to = Math.min(cap, b.properties.floors + 3);
    if (to > b.properties.floors) {
      recipe.setFloors(b, to, `${b.name} raised from ${b.properties.floors} to ${to} floors`);
      raised.push(b);
    }
  }
  const infillFloors = clampInt(Math.min(cap, typicalFloors(view) + 3), 4, 12);
  const infillCount = Math.min(tier === "light" ? 4 : tier === "strong" ? 8 : 6, clampInt(view.buildings.length * 0.15, 2, 8));
  const infill = findFreeCells(view, { width: 30, depth: 28 }, infillCount, "centre", recipe.takenBounds());
  infill.forEach((cell, i) => recipe.addBuilding(cell, infillFloors, i % 3 === 2 ? "Residential" : "Mixed Use", `Core infill ${i + 1}`, `${infillFloors}-floor mixed-use infill around the core`));
  const plazas = findFreeCells(view, { width: 28, depth: 26 }, scaled(2, view), "centre", recipe.takenBounds());
  plazas.forEach((cell, i) => {
    const poly = rectPolygon(cell.center, cell.width, cell.depth);
    recipe.reserve(poly);
    recipe.addPlaza(poly, `Pocket plaza ${i + 1}`, "Pocket plaza serving the denser core");
  });
  const pockets = findFreeCells(view, { width: 36, depth: 30 }, scaled(2, view), "spread", recipe.takenBounds());
  pockets.forEach((cell, i) => {
    const poly = rectPolygon(cell.center, cell.width, cell.depth);
    recipe.reserve(poly);
    recipe.addGreen(poly, `Pocket park ${i + 1}`, "Pocket park", "green", "Pocket park compensating the denser core");
  });

  const changes: ScenarioChange[] = [];
  if (raised.length) changes.push({ id: "c-raise", type: "Reconfigured", text: `↻ ${raised.length} core buildings raised by up to 3 floors`, detail: `Tallest now ${cap} floors` });
  if (infill.length) changes.push({ id: "c-infill", type: "Added", text: `+ ${infill.length} mixed-use infill buildings`, detail: `${infillFloors}-floor infill around the core` });
  if (plazas.length) changes.push({ id: "c-plaza", type: "Added", text: `+ ${plazas.length} pocket plazas`, detail: "Hard-landscaped public space" });
  if (recipe.addedGreenM2) changes.push({ id: "c-green", type: "Added", text: `+ ${fmtHa(recipe.addedGreenM2)} pocket parks`, detail: "Small greens compensating the denser core" });
  changes.push({ id: "c-open", type: "Reduced", text: "− 6% open development area", detail: "Estimated share consumed by infill" });
  changes.push({ id: "c-heat", type: "Reduced", text: "− Heat mitigation needed", detail: "Higher density raises the heat index; review canopy and materials" });
  return { ops: recipe.ops, changes, recipe };
}

function boundsOfPoints(points: Point[]) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}

function minDist(p: Point, stations: { point: Point }[]): number {
  return stations.reduce((m, s) => Math.min(m, Math.hypot(p.x - s.point.x, p.y - s.point.y)), Infinity);
}

function coverageAfter(view: DatasetView, input: OptimizationInput, recipe: Recipe): number {
  const site = input.context.spatial.summary.siteAreaHa * 10000 || view.siteAreaM2;
  return input.context.current.metrics.greenCoverage + ((recipe.addedGreenM2 + recipe.canopyM2 - recipe.removedGreenM2) / site) * 100;
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

function round(v: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

function deriveMetrics(kind: ScenarioKind, input: OptimizationInput, recipe: Recipe, factor: number, view: DatasetView, ops: SpatialOp[]): ScenarioMetrics {
  const cur = input.context.current.metrics;
  const profile = PROFILES[kind];
  const d = (k: keyof ScenarioMetrics) => (profile.deltas[k] ?? 0) * factor;
  const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

  const site = input.context.spatial.summary.siteAreaHa * 10000 || view.siteAreaM2;
  const greenCoverage = round(cur.greenCoverage + ((recipe.addedGreenM2 + recipe.canopyM2 - recipe.removedGreenM2) / site) * 100, 1);

  // capacity: dataset units → headline population (the summary is the headline figure)
  const rawCapacity = view.buildings.reduce((s, b) => s + b.properties.populationCapacity, 0) || 1;
  const scale = cur.populationCapacity > 0 ? cur.populationCapacity / rawCapacity : 1;
  const populationCapacity = Math.round(cur.populationCapacity + recipe.capacityDelta * scale);

  const rawGfa = view.buildings.reduce((s, b) => s + b.properties.footprint * b.properties.floors, 0) || 1;
  const far = round(cur.far * (1 + recipe.gfaDelta / rawGfa), 2);

  // tallest building the plan can influence after the ops
  let maxFloors = 0;
  const removed = new Set(ops.filter((o) => o.op === "remove").map((o) => (o as { objectId: string }).objectId));
  const floorsOf = new Map<string, number>();
  for (const op of ops) if (op.op === "modify" && op.patch.floors !== undefined) floorsOf.set(op.objectId, op.patch.floors);
  for (const b of view.proposed) if (!removed.has(b.id)) maxFloors = Math.max(maxFloors, floorsOf.get(b.id) ?? b.properties.floors);
  for (const b of recipe.addedBuildings) maxFloors = Math.max(maxFloors, b.properties.floors);
  if (maxFloors === 0) maxFloors = cur.maxFloors;

  return {
    environment: Math.round(clamp(cur.environment + d("environment"))),
    mobility: Math.round(clamp(cur.mobility + d("mobility"))),
    urbanForm: Math.round(clamp(cur.urbanForm + d("urbanForm"))),
    greenInfrastructure: Math.round(clamp(cur.greenInfrastructure + d("greenInfrastructure"))),
    carbon: Math.round(clamp(cur.carbon + d("carbon"))),
    greenCoverage,
    heatIndex: Math.round(clamp(cur.heatIndex + d("heatIndex"))),
    solar: Math.round(clamp(cur.solar + d("solar"))),
    populationCapacity,
    far,
    maxFloors,
    siteCoverage: Math.round(clamp(cur.siteCoverage + d("siteCoverage"))),
    publicOpenSpace: Math.round(clamp(cur.publicOpenSpace + d("publicOpenSpace"))),
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const demoOptimizationProvider: OptimizationProvider = {
  id: "demo-heuristics",
  version: "1.0.0",
  label: "Demo planning heuristics",
  generate(input: OptimizationInput): OptimizationScenario[] {
    const view = viewDataset(input.context.spatial);
    const scenarios: OptimizationScenario[] = [];
    for (const def of SCENARIO_KINDS) {
      const { factor, tier } = intensity(def.kind, input);
      const prefix = `opt-${def.kind}`;
      let built: BuiltScenario;
      switch (def.kind) {
        case "balanced":
          built = buildBalanced(view, input, tier, prefix);
          break;
        case "green":
          built = buildGreen(view, input, tier, prefix);
          break;
        case "mobility":
          built = buildMobility(view, input, tier, prefix);
          break;
        default:
          built = buildCompact(view, input, tier, prefix);
      }
      if (def.kind === "balanced" || def.kind === "green") {
        const cur = input.context.current.metrics;
        const rawCapacity = view.buildings.reduce((s, b) => s + b.properties.populationCapacity, 0) || 1;
        respectPopulation(built.recipe, cur.populationCapacity, cur.populationCapacity > 0 ? cur.populationCapacity / rawCapacity : 1, constraint(input, "max-population")?.value ?? null);
        built.ops = built.recipe.ops;
      }
      const metrics = deriveMetrics(def.kind, input, built.recipe, factor, view, built.ops);
      scenarios.push({
        id: `${input.generationId}-${def.kind}`,
        kind: def.kind,
        letter: def.letter,
        name: def.name,
        description: def.blurb,
        status: "Generated",
        score: 0, // assigned by the service (depends on the live objective weights)
        objectives: { environment: metrics.environment, mobility: metrics.mobility, green: metrics.greenInfrastructure, density: metrics.urbanForm, carbon: metrics.carbon },
        metrics,
        changes: built.changes,
        tradeoffs: [], // assigned by the service
        spatialState: { ops: built.ops, counts: countOps(built.ops.filter((op) => !(op.op === "add" && op.object.type === "tree"))) },
        generatedAt: input.generatedAt,
        generationId: input.generationId,
      });
    }
    return scenarios;
  },
};

export type { SpatialObject };
