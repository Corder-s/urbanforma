import { centroid, polygonArea, polygonPerimeter, polylineLength } from "../../planning/lib/geometry";
import type { PlanningDocument } from "../../planning/types/planning.types";
import type {
  AreaObject,
  BuildingObject,
  BoundaryObject,
  ContextBuildingObject,
  RoadObject,
  SpatialDataset,
  SpatialObject,
  SpatialObjectType,
  TerrainObject,
  TransitObject,
  TreeObject,
  UtilityObject,
} from "../../visualization/types/visualization.types";
import type { AnalysisResult } from "../../analysis/types/analysis.types";
import type { OptimizationState } from "../../optimization/types/optimization.types";
import type { ReportConfig } from "../../reports/types/report.types";
import { DISCIPLINE_LAYER, FACADE_MATERIALS, ISSUE_TEMPLATES, ROOF_MATERIALS, formatArea, levelName } from "../data/bim.data";
import type {
  BimAnalysisInput,
  BimCategory,
  BimDiscipline,
  BimElement,
  BimFilters,
  BimIssue,
  BimLayerKey,
  BimLayerVisibility,
  BimModel,
  BimPlanningLink,
  BimPlanningRef,
  BimProperty,
  BimSceneMode,
  BimSearchResult,
  BimTreeNode,
  CoordinationCheck,
} from "../types/bim.types";

/**
 * BIM element derivation.
 *
 * One rule keeps this honest: **every element is derived from data that already
 * exists in the app** — the project's `SpatialDataset` (Step 12 geometry, itself
 * built from the Planning Studio document). Nothing is invented, and nothing is
 * fetched twice. When a real IFC/RVT parser is connected it will return
 * `BimElement[]` in exactly this shape and this module becomes the demo source.
 *
 * Level of detail follows real practice and keeps the tree bounded:
 *   LOD 300 — the largest buildings are broken down into levels and parts.
 *   LOD 200 — the remaining buildings stay massing volumes with quantities.
 */

export const MAX_DETAILED_BUILDINGS = 6;
export const MAX_LEVELS_PER_BUILDING = 7;
/** Cap for flat element lists (the tree is not capped — it starts collapsed). */
export const MAX_LIST_ROWS = 250;

const SLAB_THICKNESS_M = 0.3;
const WALL_THICKNESS_M = 0.3;
const WINDOW_W_M = 1.2;
const WINDOW_H_M = 1.5;
const COLUMN_SECTION_M = 0.4;
/** Radius used for the per-building green share (documented in the UI). */
const GREEN_RADIUS_M = 150;

// ---------------------------------------------------------------------------
// Deterministic randomness (same model in, same model out)
// ---------------------------------------------------------------------------

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GLOBAL_ID_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$";

/** Deterministic 22-character IFC-style GlobalId. */
export function globalIdFor(seed: string): string {
  const rand = rng(hashString(seed));
  let out = "";
  for (let i = 0; i < 22; i++) out += GLOBAL_ID_ALPHABET[Math.floor(rand() * GLOBAL_ID_ALPHABET.length)];
  return out;
}

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.min(items.length - 1, Math.floor(rand() * items.length))];
}

const round = (v: number, dp = 2) => Number(v.toFixed(dp));

function num(v: number | undefined, dp = 2): string {
  return v === undefined || !Number.isFinite(v) ? "—" : String(round(v, dp));
}

// ---------------------------------------------------------------------------
// Typed object selectors (no casts — the dataset union is narrowed properly)
// ---------------------------------------------------------------------------

function objectsOfType<T extends SpatialObjectType>(dataset: SpatialDataset, type: T): Extract<SpatialObject, { type: T }>[] {
  return dataset.objects.filter((o): o is Extract<SpatialObject, { type: T }> => o.type === type);
}

function roadsOf(dataset: SpatialDataset): RoadObject[] {
  return dataset.objects.filter((o): o is RoadObject => o.type === "road" || o.type === "path");
}

function openSpaceOf(dataset: SpatialDataset): AreaObject[] {
  return dataset.objects.filter((o): o is AreaObject => o.type === "green" || o.type === "water");
}

function parkingOf(dataset: SpatialDataset): AreaObject[] {
  return dataset.objects.filter((o): o is AreaObject => o.type === "parking");
}

function greensOf(dataset: SpatialDataset): AreaObject[] {
  return dataset.objects.filter((o): o is AreaObject => o.type === "green");
}

function objectArea(o: SpatialObject): number {
  const g = o.geometry;
  if (g.kind === "rect") return g.width * g.depth;
  if (g.kind === "polygon") return polygonArea(g.points);
  if (g.kind === "line") return polylineLength(g.points) * g.width;
  return 0;
}

function objectCenter(o: SpatialObject): { x: number; y: number } {
  const g = o.geometry;
  if (g.kind === "rect") return g.center;
  if (g.kind === "point") return g.point;
  return centroid(g.points);
}

function objectLength(o: SpatialObject): number {
  const g = o.geometry;
  if (g.kind === "line") return polylineLength(g.points);
  if (g.kind === "polygon") return polygonPerimeter(g.points);
  if (g.kind === "rect") return 2 * (g.width + g.depth);
  return 0;
}

function refOf(o: SpatialObject): BimPlanningRef {
  return { objectId: o.id, objectType: o.type, objectName: o.name, layer: o.layer };
}

// ---------------------------------------------------------------------------
// Property helpers
// ---------------------------------------------------------------------------

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Property ids are unique inside an element (that is where they are keyed). */
function prop(group: string, label: string, value: string | number, unit?: string): BimProperty {
  return { id: `${slug(group)}-${slug(label)}`, group, label, value: typeof value === "number" ? String(value) : value, unit };
}

const DERIVED_NOTE = "Derived from project geometry (demo model)";

// ---------------------------------------------------------------------------
// Element factory
// ---------------------------------------------------------------------------

interface Factory {
  model: BimModel;
  rand: () => number;
  out: BimElement[];
}

interface ElementInit {
  name: string;
  category: BimCategory;
  kind: BimElement["kind"];
  discipline: BimDiscipline;
  parentId: string | null;
  level?: string | null;
  material?: string;
  area?: number;
  volume?: number;
  height?: number;
  width?: number;
  length?: number;
  floors?: number;
  location?: { x: number; y: number; z: number };
  properties?: BimProperty[];
  planningRef?: BimPlanningRef | null;
  childCount?: number;
  /** Mirrors the source object's visibility — the GIS layers stay the single source of truth. */
  visible?: boolean;
}

function makeElement(f: Factory, path: string, init: ElementInit): BimElement {
  const id = `${f.model.id}:${path}`;
  const element: BimElement = {
    id,
    globalId: globalIdFor(id),
    name: init.name,
    category: init.category,
    kind: init.kind,
    discipline: init.discipline,
    parentId: init.parentId,
    level: init.level ?? null,
    material: init.material,
    area: init.area === undefined ? undefined : round(init.area, 2),
    volume: init.volume === undefined ? undefined : round(init.volume, 3),
    height: init.height === undefined ? undefined : round(init.height, 2),
    width: init.width === undefined ? undefined : round(init.width, 2),
    length: init.length === undefined ? undefined : round(init.length, 2),
    floors: init.floors,
    location: init.location,
    properties: init.properties ?? [],
    visible: init.visible ?? true,
    planningRef: init.planningRef ?? null,
    childCount: init.childCount,
  };
  f.out.push(element);
  return element;
}

// ---------------------------------------------------------------------------
// Buildings — LOD 300 breakdown
// ---------------------------------------------------------------------------

interface LevelCtx {
  shown: boolean;
  center: { x: number; y: number };
  width: number;
  depth: number;
  floorHeight: number;
  facade: string;
  level: string;
  planningRef: BimPlanningRef;
}

function deriveLevelParts(f: Factory, path: string, levelId: string, levelIdx: number, ctx: LevelCtx) {
  const { width, depth, floorHeight, facade, level } = ctx;
  const halfX = width / 2;
  const halfY = depth / 2;
  const baseZ = round(levelIdx * floorHeight, 2);

  makeElement(f, `${path}:lv${levelIdx}:slab`, {
    name: `Slab · ${level}`,
    category: "floor",
    kind: "element",
    discipline: "structure",
    parentId: levelId,
    level,
    material: "Reinforced concrete",
    area: width * depth,
    volume: width * depth * SLAB_THICKNESS_M,
    height: SLAB_THICKNESS_M,
    width,
    length: depth,
    location: { x: round(ctx.center.x, 2), y: round(ctx.center.y, 2), z: baseZ },
    planningRef: ctx.planningRef,
    visible: ctx.shown,
    properties: [
      prop("Dimensions", "Slab area", num(width * depth), "m²"),
      prop("Dimensions", "Thickness", num(SLAB_THICKNESS_M), "m"),
      prop("Pset_SlabCommon", "Concrete grade", "C30/37"),
      prop("Provenance", "Source", DERIVED_NOTE),
    ],
  });

  const sides = [
    { name: "north", length: width, dx: 0, dy: -halfY, bearing: true },
    { name: "east", length: depth, dx: halfX, dy: 0, bearing: false },
    { name: "south", length: width, dx: 0, dy: halfY, bearing: true },
    { name: "west", length: depth, dx: -halfX, dy: 0, bearing: false },
  ];
  sides.forEach((side, i) => {
    makeElement(f, `${path}:lv${levelIdx}:wall${i}`, {
      name: `Facade wall · ${side.name}`,
      category: "wall",
      kind: "element",
      discipline: "architecture",
      parentId: levelId,
      level,
      material: facade,
      area: side.length * floorHeight,
      volume: side.length * floorHeight * WALL_THICKNESS_M,
      height: floorHeight,
      length: side.length,
      width: WALL_THICKNESS_M,
      location: { x: round(ctx.center.x + side.dx, 2), y: round(ctx.center.y + side.dy, 2), z: round(baseZ + floorHeight / 2, 2) },
      planningRef: ctx.planningRef,
      visible: ctx.shown,
      properties: [
        prop("Dimensions", "Wall length", num(side.length), "m"),
        prop("Dimensions", "Storey height", num(floorHeight), "m"),
        prop("Dimensions", "Thickness", num(WALL_THICKNESS_M), "m"),
        prop("Pset_WallCommon", "Is external", "true"),
        prop("Pset_WallCommon", "Load bearing", side.bearing ? "true" : "false"),
        prop("Provenance", "Source", DERIVED_NOTE),
      ],
    });
  });

  for (let c = 0; c < 2; c++) {
    makeElement(f, `${path}:lv${levelIdx}:col${c}`, {
      name: `Column ${String.fromCharCode(65 + c)} · ${level}`,
      category: "column",
      kind: "element",
      discipline: "structure",
      parentId: levelId,
      level,
      material: "Concrete C30/37",
      area: COLUMN_SECTION_M * COLUMN_SECTION_M,
      volume: COLUMN_SECTION_M * COLUMN_SECTION_M * floorHeight,
      height: floorHeight,
      width: COLUMN_SECTION_M,
      length: COLUMN_SECTION_M,
      location: { x: round(ctx.center.x + (c === 0 ? -halfX * 0.5 : halfX * 0.5), 2), y: round(ctx.center.y, 2), z: baseZ },
      planningRef: ctx.planningRef,
      visible: ctx.shown,
      properties: [
        prop("Dimensions", "Section", "400 × 400", "mm"),
        prop("Dimensions", "Height", num(floorHeight), "m"),
        prop("Pset_ColumnCommon", "Concrete grade", "C30/37"),
        prop("Provenance", "Source", DERIVED_NOTE),
      ],
    });
  }

  const windowCount = 3;
  for (let w = 0; w < windowCount; w++) {
    const t = (w + 1) / (windowCount + 1);
    makeElement(f, `${path}:lv${levelIdx}:win${w}`, {
      name: `Window ${String(w + 1).padStart(2, "0")} · ${level}`,
      category: "window",
      kind: "element",
      discipline: "architecture",
      parentId: levelId,
      level,
      material: "Glazed curtain wall",
      area: WINDOW_W_M * WINDOW_H_M,
      height: WINDOW_H_M,
      width: WINDOW_W_M,
      location: { x: round(ctx.center.x - halfX + width * t, 2), y: round(ctx.center.y - halfY, 2), z: round(baseZ + 1, 2) },
      planningRef: ctx.planningRef,
      visible: ctx.shown,
      properties: [
        prop("Dimensions", "Opening width", num(WINDOW_W_M), "m"),
        prop("Dimensions", "Opening height", num(WINDOW_H_M), "m"),
        prop("Pset_WindowCommon", "Glazing", "Double, low-e"),
        prop("Pset_WindowCommon", "Thermal transmittance", "1.4", "W/m²K"),
        prop("Provenance", "Source", DERIVED_NOTE),
      ],
    });
  }

  if (levelIdx === 0) {
    makeElement(f, `${path}:lv0:door`, {
      name: "Entrance door",
      category: "door",
      kind: "element",
      discipline: "architecture",
      parentId: levelId,
      level,
      material: "Aluminium",
      area: 2.31,
      height: 2.1,
      width: 1.1,
      location: { x: round(ctx.center.x, 2), y: round(ctx.center.y - halfY, 2), z: 0 },
      planningRef: ctx.planningRef,
      visible: ctx.shown,
      properties: [
        prop("Dimensions", "Clear width", "1.1", "m"),
        prop("Dimensions", "Clear height", "2.1", "m"),
        prop("Pset_DoorCommon", "Fire rating", "30 min"),
        prop("Pset_DoorCommon", "Handicap accessible", "true"),
        prop("Provenance", "Source", DERIVED_NOTE),
      ],
    });
    return;
  }

  makeElement(f, `${path}:lv${levelIdx}:stair`, {
    name: `Stair flight · ${level}`,
    category: "stair",
    kind: "element",
    discipline: "architecture",
    parentId: levelId,
    level,
    material: "Reinforced concrete",
    height: floorHeight,
    width: 1.2,
    length: round(floorHeight * 1.6, 2),
    location: { x: round(ctx.center.x + halfX * 0.6, 2), y: round(ctx.center.y + halfY * 0.6, 2), z: baseZ },
    planningRef: ctx.planningRef,
    visible: ctx.shown,
    properties: [
      prop("Dimensions", "Rise", num(floorHeight), "m"),
      prop("Dimensions", "Going", num(floorHeight * 1.6), "m"),
      prop("Pset_StairFlightCommon", "Number of risers", String(Math.max(8, Math.round(floorHeight / 0.18)))),
      prop("Provenance", "Source", DERIVED_NOTE),
    ],
  });
}

function deriveBuilding(f: Factory, o: BuildingObject, detailed: boolean, buildingsGroupId: string) {
  const p = o.properties;
  const shown = o.visible;
  const floors = Math.max(1, Math.round(p.floors));
  const floorHeight = p.height / floors;
  const footprint = p.footprint > 0 ? p.footprint : o.geometry.width * o.geometry.depth;
  const path = `bld:${o.id}`;
  const planningRef = refOf(o);
  const facade = pick(f.rand, FACADE_MATERIALS);

  const bld = makeElement(f, path, {
    name: o.name,
    category: "building",
    kind: "building",
    discipline: "architecture",
    parentId: buildingsGroupId,
    material: facade,
    area: footprint,
    volume: footprint * p.height,
    height: p.height,
    width: o.geometry.width,
    length: o.geometry.depth,
    floors,
    location: { x: round(o.geometry.center.x, 2), y: round(o.geometry.center.y, 2), z: 0 },
    planningRef,
    visible: o.visible,
    properties: [
      prop("Identity", "Reference", o.name),
      prop("Identity", "Planning object", `${o.id} · layer ${o.layer}`),
      prop("Classification", "Level of detail", detailed ? "LOD 300 — levels and parts" : "LOD 200 — massing volume"),
      prop("Classification", "Status", p.status),
      prop("Dimensions", "Footprint area", num(footprint), "m²"),
      prop("Dimensions", "Height", num(p.height), "m"),
      prop("Dimensions", "Gross floor area", num(footprint * floors), "m²"),
      prop("Dimensions", "Gross volume", num(footprint * p.height), "m³"),
      prop("Dimensions", "Storeys", String(floors)),
      prop("Dimensions", "Floor-to-floor height", num(floorHeight), "m"),
      prop("Planning", "Land use", p.landUse),
      prop("Planning", "Density", p.density),
      prop("Planning", "Population capacity", String(p.populationCapacity), "people"),
      prop("Environmental", "Solar exposure", String(p.environmental.solarExposure), "%"),
      prop("Environmental", "Heat sensitivity", p.environmental.heatSensitivity),
      prop("Environmental", "Green proximity", num(p.environmental.greenProximityM, 0), "m"),
      prop("Provenance", "Source", DERIVED_NOTE),
    ],
  });

  if (!detailed) return;

  const modelledLevels = Math.min(floors, MAX_LEVELS_PER_BUILDING);
  for (let i = 0; i < modelledLevels; i++) {
    const level = levelName(i);
    const levelEl = makeElement(f, `${path}:lv${i}`, {
      name: level,
      category: "level",
      kind: "group",
      discipline: "architecture",
      parentId: bld.id,
      level,
      area: footprint,
      height: floorHeight,
      floors: 1,
      location: { x: round(o.geometry.center.x, 2), y: round(o.geometry.center.y, 2), z: round(i * floorHeight, 2) },
      planningRef,
      visible: shown,
      properties: [
        prop("Identity", "Level name", level),
        prop("Dimensions", "Elevation", num(i * floorHeight), "m"),
        prop("Dimensions", "Floor-to-floor height", num(floorHeight), "m"),
        prop("Dimensions", "Floor area", num(footprint), "m²"),
        prop("Provenance", "Source", DERIVED_NOTE),
      ],
    });
    deriveLevelParts(f, path, levelEl.id, i, {
      shown,
      center: o.geometry.center,
      width: o.geometry.width,
      depth: o.geometry.depth,
      floorHeight,
      facade,
      level,
      planningRef,
    });
  }

  if (floors > MAX_LEVELS_PER_BUILDING) {
    const rest = floors - modelledLevels;
    makeElement(f, `${path}:typical`, {
      name: `Typical levels ${levelName(modelledLevels)}–${levelName(floors - 1)}`,
      category: "level",
      kind: "group",
      discipline: "architecture",
      parentId: bld.id,
      level: levelName(modelledLevels),
      area: footprint * rest,
      height: floorHeight * rest,
      floors: rest,
      planningRef,
      visible: shown,
      childCount: 0,
      properties: [
        prop("Identity", "Modelled as", "Typical level group"),
        prop("Dimensions", "Levels covered", String(rest)),
        prop("Dimensions", "Aggregate floor area", num(footprint * rest), "m²"),
        prop("Note", "Detail", "Repeating storeys are not expanded individually in this model."),
        prop("Provenance", "Source", DERIVED_NOTE),
      ],
    });
  }

  const roofMat = pick(f.rand, ROOF_MATERIALS);
  makeElement(f, `${path}:roof`, {
    name: `Roof · ${o.name}`,
    category: "roof",
    kind: "element",
    discipline: "architecture",
    parentId: bld.id,
    level: levelName(floors - 1),
    material: roofMat,
    area: footprint,
    volume: footprint * 0.4,
    height: 0.4,
    width: o.geometry.width,
    length: o.geometry.depth,
    location: { x: round(o.geometry.center.x, 2), y: round(o.geometry.center.y, 2), z: round(p.height, 2) },
    planningRef,
    visible: shown,
    properties: [
      prop("Dimensions", "Roof area", num(footprint), "m²"),
      prop("Dimensions", "Build-up thickness", "0.4", "m"),
      prop("Pset_RoofCommon", "Finish", roofMat),
      prop("Pset_RoofCommon", "Rainwater drainage", "Internal outlets"),
      prop("Provenance", "Source", DERIVED_NOTE),
    ],
  });
}

// ---------------------------------------------------------------------------
// Full derivation
// ---------------------------------------------------------------------------

/**
 * Derives the element set of `model` from `dataset`. Pure and deterministic:
 * the same project + model always produces the same elements, ids and GlobalIds.
 */
export function deriveElements(dataset: SpatialDataset, model: BimModel): BimElement[] {
  const f: Factory = { model, rand: rng(hashString(`${model.id}|${dataset.projectId}`)), out: [] };
  const rootId = `${model.id}:root`;

  makeElement(f, "root", {
    name: model.name,
    category: "site",
    kind: "model",
    discipline: "context",
    parentId: null,
    properties: [
      prop("Identity", "Model", model.name),
      prop("Identity", "File", model.fileName),
      prop("Identity", "Format", `${model.format} · ${model.schema}`),
      prop("Identity", "Version", model.version),
      prop("Identity", "Author", model.author),
      prop("Identity", "Project", dataset.projectName),
      prop("Quantities", "Site area", formatArea(dataset.summary.siteAreaHa * 10_000)),
      prop("Quantities", "Buildings on site", String(dataset.summary.buildings)),
      prop("Coordinates", "System", dataset.summary.coordinateSystem),
      prop("Coordinates", "Centre", `${dataset.summary.coordinates.lat.toFixed(4)}, ${dataset.summary.coordinates.lng.toFixed(4)}`),
      prop("Provenance", "Source", DERIVED_NOTE),
      prop("Provenance", "Parser", "No IFC/RVT parser is connected in this release."),
    ],
  });

  // --- site boundary + terrain ---------------------------------------------
  const boundary: BoundaryObject | undefined = objectsOfType(dataset, "boundary")[0];
  if (boundary && boundary.geometry.kind === "polygon") {
    const c = centroid(boundary.geometry.points);
    const area = polygonArea(boundary.geometry.points);
    makeElement(f, "site", {
      name: `${dataset.projectName} site`,
      category: "site",
      kind: "site",
      discipline: "context",
      parentId: rootId,
      area,
      length: polygonPerimeter(boundary.geometry.points),
      location: { x: round(c.x, 2), y: round(c.y, 2), z: 0 },
      planningRef: refOf(boundary),
      visible: boundary.visible,
      properties: [
        prop("Identity", "Boundary object", `${boundary.id} · ${boundary.name}`),
        prop("Dimensions", "Site area", formatArea(area)),
        prop("Dimensions", "Perimeter", num(polygonPerimeter(boundary.geometry.points), 1), "m"),
        prop("Coordinates", "Extent", `${round(dataset.siteBounds.width, 0)} × ${round(dataset.siteBounds.height, 0)} m`),
        prop("Provenance", "Source", DERIVED_NOTE),
      ],
    });
  }

  const terrain: TerrainObject[] = objectsOfType(dataset, "terrain");
  if (terrain.length > 0) {
    const terrainGroup = makeElement(f, "terrain", {
      name: "Terrain model",
      category: "site",
      kind: "group",
      discipline: "context",
      parentId: rootId,
      childCount: terrain.length,
      properties: [
        prop("Identity", "Profiles", String(terrain.length)),
        prop("Note", "Detail", "Elevation profiles imported from the GIS terrain layer."),
        prop("Provenance", "Source", DERIVED_NOTE),
      ],
    });
    terrain.forEach((t, i) => {
      makeElement(f, `terrain:${i}`, {
        name: `Terrain profile ${String(i + 1).padStart(2, "0")}`,
        category: "site",
        kind: "element",
        discipline: "context",
        parentId: terrainGroup.id,
        length: objectLength(t),
        location: { ...objectCenter(t), z: round(t.properties.elevationM, 2) },
        planningRef: refOf(t),
        visible: t.visible,
        properties: [
          prop("Dimensions", "Profile length", num(objectLength(t), 1), "m"),
          prop("Dimensions", "Elevation", num(t.properties.elevationM, 1), "m"),
          prop("Provenance", "Source", DERIVED_NOTE),
        ],
      });
    });
  }

  // --- buildings ------------------------------------------------------------
  const buildings = objectsOfType(dataset, "building");
  const buildingsGroup = makeElement(f, "buildings", {
    name: "Buildings",
    category: "building",
    kind: "group",
    discipline: "architecture",
    parentId: rootId,
    childCount: buildings.length,
    properties: [
      prop("Identity", "Buildings", String(buildings.length)),
      prop("Classification", "Detailed (LOD 300)", String(Math.min(buildings.length, MAX_DETAILED_BUILDINGS))),
      prop("Classification", "Massing (LOD 200)", String(Math.max(0, buildings.length - MAX_DETAILED_BUILDINGS))),
      prop("Note", "Detail", "The largest buildings by footprint are broken down into levels and parts."),
      prop("Provenance", "Source", DERIVED_NOTE),
    ],
  });
  const detailedIds = new Set(
    [...buildings]
      .sort((a, b) => b.properties.footprint - a.properties.footprint)
      .slice(0, MAX_DETAILED_BUILDINGS)
      .map((b) => b.id)
  );
  for (const b of buildings) deriveBuilding(f, b, detailedIds.has(b.id), buildingsGroup.id);

  // --- roads & paths --------------------------------------------------------
  const roads = roadsOf(dataset);
  const roadsGroup = makeElement(f, "roads", {
    name: "Roads & paths",
    category: "road",
    kind: "group",
    discipline: "infrastructure",
    parentId: rootId,
    childCount: roads.length,
    properties: [
      prop("Identity", "Network elements", String(roads.length)),
      prop("Dimensions", "Total length", num(roads.reduce((s, r) => s + r.properties.lengthM, 0), 0), "m"),
      prop("Provenance", "Source", DERIVED_NOTE),
    ],
  });
  for (const o of roads) {
    const rp = o.properties;
    const width = o.geometry.width;
    const length = rp.lengthM > 0 ? rp.lengthM : objectLength(o);
    const material = rp.roadClass === "Pedestrian" ? "Concrete pavers" : rp.roadClass === "Local" ? "Concrete C30/37" : "Bitumen";
    makeElement(f, `road:${o.id}`, {
      name: o.name,
      category: "road",
      kind: "element",
      discipline: "infrastructure",
      parentId: roadsGroup.id,
      material,
      area: length * width,
      length,
      width,
      location: { ...objectCenter(o), z: 0 },
      planningRef: refOf(o),
      visible: o.visible,
      properties: [
        prop("Identity", "Reference", o.name),
        prop("Classification", "Road class", rp.roadClass),
        prop("Classification", "Lanes", String(rp.lanes)),
        prop("Classification", "Status", rp.status),
        prop("Dimensions", "Length", num(length, 1), "m"),
        prop("Dimensions", "Carriageway width", num(width, 1), "m"),
        prop("Dimensions", "Surface area", formatArea(length * width)),
        prop("Provenance", "Source", DERIVED_NOTE),
      ],
    });
  }

  // --- landscape & planting -------------------------------------------------
  const areas = openSpaceOf(dataset);
  const landscapeGroup = makeElement(f, "landscape", {
    name: "Landscape & open space",
    category: "landscape",
    kind: "group",
    discipline: "landscape",
    parentId: rootId,
    childCount: areas.length,
    properties: [
      prop("Identity", "Open-space elements", String(areas.length)),
      prop("Dimensions", "Green coverage", `${dataset.summary.greenCoveragePct}%`),
      prop("Provenance", "Source", DERIVED_NOTE),
    ],
  });
  for (const o of areas) {
    const ap = o.properties;
    const isWater = o.type === "water";
    const area = ap.areaM2 > 0 ? ap.areaM2 : objectArea(o);
    makeElement(f, `land:${o.id}`, {
      name: o.name,
      category: "landscape",
      kind: "element",
      discipline: "landscape",
      parentId: landscapeGroup.id,
      material: isWater ? "Water" : "Grass / planting",
      area,
      length: objectLength(o),
      location: { ...objectCenter(o), z: 0 },
      planningRef: refOf(o),
      visible: o.visible,
      properties: [
        prop("Identity", "Reference", o.name),
        prop("Classification", "Category", ap.category),
        prop("Classification", "Status", ap.status),
        prop("Dimensions", "Area", formatArea(area)),
        prop("Dimensions", "Perimeter", num(objectLength(o), 1), "m"),
        prop("Provenance", "Source", DERIVED_NOTE),
      ],
    });
  }

  const trees: TreeObject[] = objectsOfType(dataset, "tree");
  if (trees.length > 0) {
    const plantingGroup = makeElement(f, "planting", {
      name: "Planting",
      category: "landscape",
      kind: "group",
      discipline: "landscape",
      parentId: rootId,
      childCount: trees.length,
      properties: [
        prop("Identity", "Trees", String(trees.length)),
        prop("Note", "Detail", "Individual trees imported from the GIS tree layer."),
        prop("Provenance", "Source", DERIVED_NOTE),
      ],
    });
    trees.forEach((t, i) => {
      const canopyArea = Math.PI * t.properties.canopyM * t.properties.canopyM;
      makeElement(f, `tree:${t.id}`, {
        name: `Tree ${String(i + 1).padStart(3, "0")}`,
        category: "landscape",
        kind: "element",
        discipline: "landscape",
        parentId: plantingGroup.id,
        height: t.properties.heightM,
        width: t.properties.canopyM * 2,
        area: canopyArea,
        location: { ...objectCenter(t), z: 0 },
        planningRef: refOf(t),
        visible: t.visible,
        properties: [
          prop("Identity", "Source object", t.name),
          prop("Dimensions", "Canopy radius", num(t.properties.canopyM, 1), "m"),
          prop("Dimensions", "Height", num(t.properties.heightM, 1), "m"),
          prop("Dimensions", "Canopy area", num(canopyArea, 1), "m²"),
          prop("Provenance", "Source", DERIVED_NOTE),
        ],
      });
    });
  }

  // --- utilities & networks -------------------------------------------------
  const utilities: UtilityObject[] = objectsOfType(dataset, "utility");
  const transit: TransitObject[] = objectsOfType(dataset, "transit");
  const parking = parkingOf(dataset);
  const infraGroup = makeElement(f, "infra", {
    name: "Utilities & networks",
    category: "infrastructure",
    kind: "group",
    discipline: "mep",
    parentId: rootId,
    childCount: utilities.length + transit.length + parking.length,
    properties: [
      prop("Identity", "Elements", String(utilities.length + transit.length + parking.length)),
      prop("Note", "Detail", "Mapped from GIS networks. No authored MEP model is connected."),
      prop("Provenance", "Source", DERIVED_NOTE),
    ],
  });
  for (const u of utilities) {
    makeElement(f, `util:${u.id}`, {
      name: u.name || `${u.properties.network} network`,
      category: "infrastructure",
      kind: "element",
      discipline: "mep",
      parentId: infraGroup.id,
      length: objectLength(u),
      location: { ...objectCenter(u), z: -1 },
      planningRef: refOf(u),
      visible: u.visible,
      properties: [
        prop("Classification", "Network", u.properties.network),
        prop("Dimensions", "Length", num(objectLength(u), 1), "m"),
        prop("Note", "Detail", "Linear network mapped from GIS — not an authored MEP element."),
        prop("Provenance", "Source", DERIVED_NOTE),
      ],
    });
  }
  for (const t of transit) {
    makeElement(f, `transit:${t.id}`, {
      name: t.name || `${t.properties.mode} alignment`,
      category: "infrastructure",
      kind: "element",
      discipline: "infrastructure",
      parentId: infraGroup.id,
      length: objectLength(t),
      location: { ...objectCenter(t), z: 0 },
      planningRef: refOf(t),
      visible: t.visible,
      properties: [
        prop("Classification", "Mode", t.properties.mode),
        prop("Classification", "Stations", String(t.properties.stations.length)),
        prop("Dimensions", "Alignment length", num(objectLength(t), 1), "m"),
        prop("Provenance", "Source", DERIVED_NOTE),
      ],
    });
  }
  for (const pk of parking) {
    makeElement(f, `parking:${pk.id}`, {
      name: pk.name || "Surface parking",
      category: "infrastructure",
      kind: "element",
      discipline: "infrastructure",
      parentId: infraGroup.id,
      material: "Concrete pavers",
      area: objectArea(pk),
      location: { ...objectCenter(pk), z: 0 },
      planningRef: refOf(pk),
      visible: pk.visible,
      properties: [
        prop("Classification", "Category", pk.properties.category),
        prop("Dimensions", "Area", formatArea(objectArea(pk))),
        prop("Provenance", "Source", DERIVED_NOTE),
      ],
    });
  }

  // --- city context ---------------------------------------------------------
  const context: ContextBuildingObject[] = objectsOfType(dataset, "context-building");
  if (context.length > 0) {
    const contextGroup = makeElement(f, "context", {
      name: "City context",
      category: "building",
      kind: "group",
      discipline: "context",
      parentId: rootId,
      childCount: context.length,
      properties: [
        prop("Identity", "Context buildings", String(context.length)),
        prop("Note", "Detail", "Surrounding volumes from the GIS basemap — not authored in this model."),
        prop("Provenance", "Source", DERIVED_NOTE),
      ],
    });
    for (const c of context) {
      const height = c.properties.height;
      const area = c.geometry.width * c.geometry.depth;
      makeElement(f, `ctx:${c.id}`, {
        name: c.name,
        category: "building",
        kind: "element",
        discipline: "context",
        parentId: contextGroup.id,
        material: "Brick masonry",
        area,
        volume: area * height,
        height,
        width: c.geometry.width,
        length: c.geometry.depth,
        location: { x: round(c.geometry.center.x, 2), y: round(c.geometry.center.y, 2), z: 0 },
        planningRef: refOf(c),
        visible: c.visible,
        properties: [
          prop("Dimensions", "Footprint area", formatArea(area)),
          prop("Dimensions", "Height", num(height, 1), "m"),
          prop("Provenance", "Source", "GIS basemap context (not authored)"),
        ],
      });
    }
  }

  return f.out;
}

// ---------------------------------------------------------------------------
// Index (one pass, reused by tree / filters / search / metrics)
// ---------------------------------------------------------------------------

export interface BimFacetCount {
  id: string;
  label: string;
  count: number;
}

export interface BimFacets {
  categories: BimFacetCount[];
  levels: BimFacetCount[];
  buildings: BimFacetCount[];
  materials: BimFacetCount[];
  disciplines: BimFacetCount[];
}

export interface BimIndex {
  elements: BimElement[];
  byId: Map<string, BimElement>;
  childrenOf: Map<string, BimElement[]>;
  roots: BimElement[];
  /** Lowercase haystack per element — built once, never per keystroke. */
  haystack: Map<string, string>;
  /** element id → id of the building element that owns it (or null). */
  buildingOf: Map<string, string | null>;
  /** Planning object ids this model maps. */
  planningIds: Set<string>;
  facets: BimFacets;
  /** Modelled buildings (architecture discipline — excludes city context). */
  buildings: BimElement[];
}

function tally(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function levelOrder(level: string): number {
  if (level === "Ground") return 0;
  const n = Number(level.replace(/\D/g, "") || "0");
  return level.startsWith("Basement") ? -100 + n : n;
}

export function buildIndex(elements: BimElement[]): BimIndex {
  const byId = new Map<string, BimElement>();
  const childrenOf = new Map<string, BimElement[]>();
  const roots: BimElement[] = [];
  for (const el of elements) {
    byId.set(el.id, el);
    if (el.parentId === null) roots.push(el);
    else {
      const list = childrenOf.get(el.parentId);
      if (list) list.push(el);
      else childrenOf.set(el.parentId, [el]);
    }
  }

  const buildingOf = new Map<string, string | null>();
  const planningIds = new Set<string>();
  const buildings: BimElement[] = [];
  const catCount = new Map<string, number>();
  const levelCount = new Map<string, number>();
  const bldCount = new Map<string, number>();
  const matCount = new Map<string, number>();
  const discCount = new Map<string, number>();
  const haystack = new Map<string, string>();

  for (const el of elements) {
    const isModelledBuilding = el.category === "building" && el.discipline === "architecture" && el.kind === "building";
    let bldId: string | null = isModelledBuilding ? el.id : null;
    if (bldId === null) {
      // parents are always emitted before their children, so one walk is enough
      let cursor = el.parentId;
      while (cursor) {
        const parent = byId.get(cursor);
        if (!parent) break;
        if (parent.category === "building" && parent.discipline === "architecture" && parent.kind === "building") {
          bldId = parent.id;
          break;
        }
        cursor = parent.parentId;
      }
    }
    buildingOf.set(el.id, bldId);
    if (el.planningRef) planningIds.add(el.planningRef.objectId);
    if (isModelledBuilding) buildings.push(el);

    tally(catCount, el.category);
    tally(discCount, el.discipline);
    if (el.level) tally(levelCount, el.level);
    if (bldId) tally(bldCount, bldId);
    if (el.material) tally(matCount, el.material);

    haystack.set(
      el.id,
      `${el.name} ${el.id} ${el.globalId} ${el.category} ${el.discipline} ${el.level ?? ""} ${el.material ?? ""}`.toLowerCase()
    );
  }

  const facets: BimFacets = {
    categories: [...catCount.entries()].map(([id, count]) => ({ id, label: id, count })).sort((a, b) => b.count - a.count),
    levels: [...levelCount.entries()].map(([id, count]) => ({ id, label: id, count })).sort((a, b) => levelOrder(a.id) - levelOrder(b.id)),
    buildings: [...bldCount.entries()].map(([id, count]) => ({ id, label: byId.get(id)?.name ?? id, count })).sort((a, b) => b.count - a.count),
    materials: [...matCount.entries()].map(([id, count]) => ({ id, label: id, count })).sort((a, b) => b.count - a.count),
    disciplines: [...discCount.entries()].map(([id, count]) => ({ id, label: id, count })).sort((a, b) => b.count - a.count),
  };

  return { elements, byId, childrenOf, roots, haystack, buildingOf, planningIds, facets, buildings };
}

// ---------------------------------------------------------------------------
// Tree
// ---------------------------------------------------------------------------

export function buildTree(index: BimIndex): BimTreeNode[] {
  const build = (el: BimElement, depth: number): BimTreeNode => {
    const kids = (index.childrenOf.get(el.id) ?? []).map((c) => build(c, depth + 1));
    return { element: el, depth, children: kids, descendants: kids.reduce((s, k) => s + 1 + k.descendants, 0) };
  };
  return index.roots.map((r) => build(r, 0));
}

/** Root→parent chain of `id` — used to auto-expand the tree on selection. */
export function ancestorIds(index: BimIndex, id: string): string[] {
  const out: string[] = [];
  let cursor = index.byId.get(id)?.parentId ?? null;
  while (cursor) {
    out.unshift(cursor);
    cursor = index.byId.get(cursor)?.parentId ?? null;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Visibility, filters, search
// ---------------------------------------------------------------------------

export function isLayerVisible(el: BimElement, layers: BimLayerVisibility): boolean {
  return layers.model && layers[DISCIPLINE_LAYER[el.discipline]];
}

/** Buildings whose parts are modelled in detail (LOD 300). */
export function detailedBuildingIds(index: BimIndex): Set<string> {
  return new Set(index.buildings.filter((b) => (index.childrenOf.get(b.id) ?? []).length > 0).map((b) => b.id));
}

/** One pass: does this element survive the layer switches and every filter? */
export function filterElements(index: BimIndex, filters: BimFilters, layers: BimLayerVisibility, query: string): BimElement[] {
  const q = query.trim().toLowerCase();
  const cats = new Set(filters.categories);
  const levels = new Set(filters.levels);
  const buildings = new Set(filters.buildings);
  const materials = new Set(filters.materials);
  const out: BimElement[] = [];
  for (const el of index.elements) {
    if (!isLayerVisible(el, layers)) continue;
    if (filters.visibleOnly && !el.visible) continue;
    if (cats.size > 0 && !cats.has(el.category)) continue;
    if (levels.size > 0 && (!el.level || !levels.has(el.level))) continue;
    if (buildings.size > 0) {
      const owner = index.buildingOf.get(el.id) ?? null;
      if (!owner || !buildings.has(owner)) continue;
    }
    if (materials.size > 0 && (!el.material || !materials.has(el.material))) continue;
    if (q.length > 0 && !(index.haystack.get(el.id) ?? "").includes(q)) continue;
    out.push(el);
  }
  return out;
}

export function activeFilterCount(filters: BimFilters): number {
  return (
    (filters.query.trim() ? 1 : 0) +
    (filters.categories.length ? 1 : 0) +
    (filters.levels.length ? 1 : 0) +
    (filters.buildings.length ? 1 : 0) +
    (filters.materials.length ? 1 : 0) +
    (filters.visibleOnly ? 1 : 0)
  );
}

export function searchElements(index: BimIndex, query: string, limit = 40): BimSearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const out: BimSearchResult[] = [];
  for (const el of index.elements) {
    if (!(index.haystack.get(el.id) ?? "").includes(q)) continue;
    const matchedOn: BimSearchResult["matchedOn"] = el.name.toLowerCase().includes(q)
      ? "name"
      : el.id.toLowerCase().includes(q)
        ? "id"
        : el.globalId.toLowerCase().includes(q)
          ? "globalId"
          : el.category.includes(q)
            ? "category"
            : "level";
    out.push({ element: el, matchedOn });
    if (out.length >= limit) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Scene selection — reuses the Step 12/15 renderer, never a second engine
// ---------------------------------------------------------------------------

/** Planning object ids the BIM view currently exposes, honouring layer switches. */
export function visiblePlanningIds(index: BimIndex, layers: BimLayerVisibility): Set<string> {
  const out = new Set<string>();
  for (const el of index.elements) {
    if (el.planningRef && isLayerVisible(el, layers)) out.add(el.planningRef.objectId);
  }
  return out;
}

export function selectSceneObjects(
  dataset: SpatialDataset,
  vizVisible: SpatialObject[],
  modelIds: Set<string>,
  sceneMode: BimSceneMode
): SpatialObject[] {
  if (sceneMode === "city") return vizVisible;
  if (sceneMode === "bim") return dataset.objects.filter((o) => modelIds.has(o.id));
  const vizIds = new Set(vizVisible.map((o) => o.id));
  const extra = dataset.objects.filter((o) => !vizIds.has(o.id) && modelIds.has(o.id));
  return extra.length === 0 ? vizVisible : [...vizVisible, ...extra];
}

// ---------------------------------------------------------------------------
// Quantities
// ---------------------------------------------------------------------------

export interface BimQuantities {
  elements: number;
  buildings: number;
  detailedBuildings: number;
  levels: number;
  walls: number;
  floors: number;
  openings: number;
  grossFloorAreaM2: number;
  volumeM3: number;
  footprintM2: number;
  roadLengthM: number;
  landscapeM2: number;
  mappedPlanningObjects: number;
}

export function computeQuantities(index: BimIndex): BimQuantities {
  const q: BimQuantities = {
    elements: index.elements.length,
    buildings: index.buildings.length,
    detailedBuildings: detailedBuildingIds(index).size,
    levels: 0,
    walls: 0,
    floors: 0,
    openings: 0,
    grossFloorAreaM2: 0,
    volumeM3: 0,
    footprintM2: 0,
    roadLengthM: 0,
    landscapeM2: 0,
    mappedPlanningObjects: index.planningIds.size,
  };
  for (const el of index.elements) {
    switch (el.category) {
      case "level":
        if (el.floors === 1) q.levels += 1;
        break;
      case "wall":
        q.walls += 1;
        break;
      case "floor":
        q.floors += 1;
        break;
      case "door":
      case "window":
        q.openings += 1;
        break;
      case "road":
        if (el.kind === "element") q.roadLengthM += el.length ?? 0;
        break;
      case "landscape":
        if (el.kind === "element" && el.material !== "Water") q.landscapeM2 += el.area ?? 0;
        break;
      default:
        break;
    }
  }
  for (const b of index.buildings) {
    q.footprintM2 += b.area ?? 0;
    q.volumeM3 += b.volume ?? 0;
    q.grossFloorAreaM2 += (b.area ?? 0) * (b.floors ?? 1);
  }
  return q;
}

// ---------------------------------------------------------------------------
// Planning links (BIM ↔ Planning Studio quantities)
// ---------------------------------------------------------------------------

export function planningLinks(index: BimIndex, dataset: SpatialDataset, limit = 60): BimPlanningLink[] {
  const roads = roadsOf(dataset);
  const greens = greensOf(dataset);
  const out: BimPlanningLink[] = [];
  for (const b of index.buildings) {
    const center = b.location;
    let nearestStreet: number | null = null;
    let greenShare: number | null = null;
    if (center) {
      for (const r of roads) {
        for (const p of r.geometry.points) {
          const d = Math.hypot(p.x - center.x, p.y - center.y);
          if (nearestStreet === null || d < nearestStreet) nearestStreet = d;
        }
      }
      let greenArea = 0;
      for (const g of greens) {
        const c = centroid(g.geometry.points);
        if (Math.hypot(c.x - center.x, c.y - center.y) <= GREEN_RADIUS_M) greenArea += polygonArea(g.geometry.points);
      }
      greenShare = Math.min(100, (greenArea / (Math.PI * GREEN_RADIUS_M * GREEN_RADIUS_M)) * 100);
    }
    const valueOf = (label: string) => b.properties.find((p) => p.label === label)?.value ?? "—";
    out.push({
      elementId: b.id,
      bimName: b.name,
      planningObjectId: b.planningRef?.objectId ?? "—",
      planningName: b.planningRef?.objectName ?? "—",
      planningType: b.planningRef?.objectType ?? "—",
      footprintM2: b.area ?? 0,
      heightM: b.height ?? 0,
      floors: b.floors ?? 1,
      grossFloorAreaM2: (b.area ?? 0) * (b.floors ?? 1),
      volumeM3: b.volume ?? 0,
      landUse: valueOf("Land use"),
      density: valueOf("Density"),
      nearestStreetM: nearestStreet === null ? null : round(nearestStreet, 1),
      greenSharePct: greenShare === null ? null : round(greenShare, 1),
    });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Per-building quantities the Analysis service could consume (BIM → Analysis).
 *
 * Walks the already-built index — no geometry is re-derived and no analysis is
 * recomputed here. Facade and roof surfaces are summed from the modelled
 * sub-elements, so they exist only for buildings broken down past LOD 200.
 */
export function analysisInputs(index: BimIndex): BimAnalysisInput[] {
  const out: BimAnalysisInput[] = [];
  for (const b of index.buildings) {
    let facade = 0;
    let roof = 0;
    let levels = 0;
    let sawDetail = false;
    const walk = (id: string) => {
      for (const child of index.childrenOf.get(id) ?? []) {
        if (child.category === "wall") {
          facade += child.area ?? 0;
          sawDetail = true;
        } else if (child.category === "roof") {
          roof += child.area ?? 0;
          sawDetail = true;
        } else if (child.category === "level") {
          levels += 1;
        }
        walk(child.id);
      }
    };
    walk(b.id);
    const valueOf = (label: string) => b.properties.find((p) => p.label === label)?.value ?? null;
    const footprint = b.area ?? null;
    const floors = b.floors ?? null;
    out.push({
      elementId: b.id,
      objectId: b.planningRef?.objectId ?? null,
      name: b.name,
      landUse: valueOf("Land use"),
      floors,
      heightM: b.height ?? null,
      footprintM2: footprint,
      grossFloorAreaM2: footprint !== null && floors !== null ? round(footprint * floors, 2) : null,
      volumeM3: b.volume ?? null,
      facadeAreaM2: sawDetail ? round(facade, 2) : null,
      roofAreaM2: sawDetail ? round(roof, 2) : null,
      levelCount: levels,
      detailed: sawDetail,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Coordination checks — evidence from real modules only
// ---------------------------------------------------------------------------

export interface CoordinationInput {
  dataset: SpatialDataset;
  index: BimIndex;
  quantities: BimQuantities;
  models: BimModel[];
  planningDoc: PlanningDocument | null;
  analysis: AnalysisResult | null;
  optimization: OptimizationState | null;
  reports: ReportConfig[];
  /** What the model could hand the Analysis service (see `analysisInputs`). */
  analysisInputs?: BimAnalysisInput[];
}

/**
 * Every check reports only what the app can actually verify today. Nothing
 * pretends to have run a clash engine or parsed an IFC file — those are
 * `missing` with a reason, which is the truthful state of a frontend release.
 */
export function coordinationChecks(input: CoordinationInput): CoordinationCheck[] {
  const { dataset, index, quantities, models, planningDoc, analysis, optimization, reports } = input;
  const bimInputs = input.analysisInputs ?? [];
  const checks: CoordinationCheck[] = [
    {
      id: "geometry",
      label: "Geometry source",
      status: "ready",
      detail: `${dataset.objects.length} spatial objects · ${dataset.source.kind === "demo" ? "demo dataset" : "local plan"} · ${quantities.mappedPlanningObjects} mapped to model elements`,
    },
  ];

  if (planningDoc) {
    const planById = new Map(planningDoc.objects.map((o) => [o.id, o]));
    let compared = 0;
    let mismatched = 0;
    for (const b of index.buildings) {
      const po = b.planningRef ? planById.get(b.planningRef.objectId) : undefined;
      if (!po || po.type !== "building") continue;
      compared += 1;
      if (Math.abs(po.properties.height - (b.height ?? 0)) > 0.5) mismatched += 1;
    }
    checks.push({
      id: "planning-heights",
      label: "Model ↔ planning heights",
      status: mismatched > 0 ? "warning" : "ready",
      detail:
        compared === 0
          ? "No planning buildings matched the model."
          : mismatched > 0
            ? `${mismatched} of ${compared} buildings differ from the planning record by more than 0.5 m.`
            : `${compared} buildings agree with the planning record.`,
    });
    checks.push({
      id: "planning-doc",
      label: "Planning document",
      status: "ready",
      detail: `${planningDoc.objects.length} planning objects · site ${formatArea(polygonArea(planningDoc.site.boundary))} · ${planningDoc.source === "local" ? "locally saved plan" : "demo plan"}`,
    });
  } else {
    checks.push({
      id: "planning-doc",
      label: "Planning document",
      status: "missing",
      detail: "Planning record not loaded for this project.",
    });
  }

  const detailedCount = bimInputs.filter((i) => i.detailed).length;
  const feedNote =
    bimInputs.length > 0
      ? ` The model can supply height, footprint, floor area, volume${detailedCount > 0 ? " and facade/roof surfaces" : ""} for ${bimInputs.length} building${bimInputs.length === 1 ? "" : "s"}${detailedCount > 0 ? ` (${detailedCount} modelled in detail)` : ""} — Analysis still computes from planning geometry in this release.`
      : "";
  checks.push({
    id: "analysis",
    label: "Analysis results",
    status: analysis ? "ready" : "missing",
    detail: analysis
      ? `${analysis.metrics.length} metrics available for the modelled site (overall score ${Math.round(analysis.overallScore)}/100).${feedNote}`
      : `No analysis run for this project yet — open Analysis to compute metrics.${feedNote}`,
  });

  const scenarios = optimization?.generation?.scenarios ?? [];
  const appliedVersions = optimization?.versions.length ?? 0;
  const selectedNote = optimization?.selectedScenarioId ? ", one selected" : "";
  const versionNote = appliedVersions > 0 ? ", " + appliedVersions + " applied version(s)" : "";
  checks.push({
    id: "optimization",
    label: "Optimization scenario",
    status: scenarios.length > 0 ? "ready" : "missing",
    detail:
      scenarios.length > 0
        ? scenarios.length + " scenarios generated" + selectedNote + versionNote + "."
        : "No scenarios generated — the quantities of this model can feed the Optimization module.",
  });

  checks.push({
    id: "reports",
    label: "Reports",
    status: reports.length > 0 ? "ready" : "missing",
    detail: reports.length > 0 ? `${reports.length} saved report(s) can include the BIM section.` : "No reports saved for this project yet.",
  });

  checks.push({
    id: "mep",
    label: "MEP model",
    status: "missing",
    detail: "Utilities are mapped from GIS networks; no authored MEP model is connected.",
  });

  checks.push({
    id: "clash",
    label: "Clash detection",
    status: "missing",
    detail: "Not available in this release — no geometry intersection engine is connected.",
  });

  const busy = models.find((m) => m.status === "uploading" || m.status === "processing");
  const failed = models.find((m) => m.status === "failed");
  checks.push({
    id: "import",
    label: "Imported model file",
    status: busy ? "processing" : failed ? "warning" : "missing",
    detail: busy
      ? `${busy.fileName} is being processed locally.`
      : failed
        ? `${failed.fileName} could not be processed — ${failed.statusNote ?? "no BIM backend is connected."}`
        : "No IFC/RVT file has been imported; the active model is derived from project geometry.",
  });

  return checks;
}

// ---------------------------------------------------------------------------
// Demo issues (labelled as demo wherever they are shown)
// ---------------------------------------------------------------------------

export function seedIssues(index: BimIndex, model: BimModel): BimIssue[] {
  const rand = rng(hashString(`${model.id}:issues`));
  const now = Date.now();
  const out: BimIssue[] = [];
  ISSUE_TEMPLATES.forEach((tpl, i) => {
    // only authored elements — city context and GIS decoration cannot carry a finding
    const candidates = index.elements.filter((el) => el.category === tpl.category && el.kind === "element" && el.discipline !== "context");
    if (candidates.length === 0) return;
    const el = candidates[Math.floor(rand() * candidates.length)];
    const created = new Date(now - (i + 1) * 86_400_000 - Math.floor(rand() * 40_000_000)).toISOString();
    out.push({
      id: `${model.id}:issue:${tpl.id}`,
      title: tpl.title,
      description: tpl.description,
      severity: tpl.severity,
      elementIds: [el.id],
      status: i === ISSUE_TEMPLATES.length - 1 ? "in-review" : "open",
      location: tpl.locationOf(el.name, el.level),
      createdAt: created,
      updatedAt: created,
      source: "demo",
    });
  });
  return out;
}

// ---------------------------------------------------------------------------
// Version history (derived from the element set, never invented)
// ---------------------------------------------------------------------------

const PART_CATEGORIES: BimCategory[] = ["level", "wall", "floor", "column", "door", "window", "stair"];

/**
 *   v1 — massing, site, landscape and infrastructure only
 *   v2 — + levels and their parts
 *   v3 — + roofs and typical-level groups (the current revision)
 */
export function versionCounts(elements: BimElement[]): { v1: number; v2: number; v3: number } {
  let v1 = 0;
  let v2 = 0;
  for (const el of elements) {
    if (el.category === "roof") continue;
    if (PART_CATEGORIES.includes(el.category)) {
      // typical-level groups only arrived with the roof revision
      if (el.category === "level" && el.floors !== 1) continue;
      v2 += 1;
      continue;
    }
    v1 += 1;
  }
  return { v1, v2, v3: elements.length };
}

/** Bytes one element record occupies in the local demo model (documented estimate). */
export const BYTES_PER_ELEMENT = 340;

export function estimateModelBytes(elementCount: number): number {
  return 18_432 + elementCount * BYTES_PER_ELEMENT;
}

// ---------------------------------------------------------------------------
// Selection sync (tree ↔ viewport ↔ inspector)
// ---------------------------------------------------------------------------

/**
 * True for the element that *is* the planning object, as opposed to one of its
 * derived sub-parts (levels, walls, slabs, roofs …) that share the same
 * planning reference.
 */
function isPrimaryElement(el: BimElement): boolean {
  if (el.kind === "building" || el.kind === "site") return true;
  return !el.id.includes(":lv") && !el.id.endsWith(":roof") && !el.id.endsWith(":typical");
}

/**
 * planning object id → the element that represents it. Clicking a building in
 * the viewport selects its model element; selecting a wall in the tree
 * highlights the building it belongs to. One map, built once per index.
 */
export function primaryElementByPlanningId(index: BimIndex): Map<string, BimElement> {
  const map = new Map<string, BimElement>();
  for (const el of index.elements) {
    const pid = el.planningRef?.objectId;
    if (!pid) continue;
    const existing = map.get(pid);
    if (!existing || (isPrimaryElement(el) && !isPrimaryElement(existing))) map.set(pid, el);
  }
  return map;
}

/**
 * The element set as it existed at a given revision. Mirrors `versionCounts`,
 * so the version panel can show a historical revision instead of only metadata:
 *   1 — massing, site, landscape and infrastructure
 *   2 — + levels and their parts
 *   3 — + roofs and typical-level groups (current)
 */
export function elementsForRevision(elements: BimElement[], revision: number): BimElement[] {
  if (revision >= 3) return elements;
  return elements.filter((el) => {
    if (el.category === "roof") return false;
    if (PART_CATEGORIES.includes(el.category)) {
      if (el.category === "level" && el.floors !== 1) return false;
      return revision >= 2;
    }
    return true;
  });
}

/** Element count per BIM layer (one pass) — the layer panel's badges. */
export function layerCounts(index: BimIndex): Record<BimLayerKey, number> {
  const counts = {
    model: index.elements.length,
    buildings: 0,
    architecture: 0,
    structure: 0,
    mep: 0,
    infrastructure: 0,
    landscape: 0,
    context: 0,
  } satisfies Record<BimLayerKey, number>;
  for (const el of index.elements) {
    if (el.category === "building" && el.discipline === "architecture" && el.kind === "building") counts.buildings += 1;
    counts[DISCIPLINE_LAYER[el.discipline]] += 1;
  }
  return counts;
}
