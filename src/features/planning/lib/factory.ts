import type {
  AreaObject,
  AreaObjectType,
  BuildingObject,
  LabelObject,
  LandUse,
  LinearObject,
  MeasureObject,
  PlanningObject,
  Point,
  ToolId,
} from "../types/planning.types";
import { blobPolygon, rectPolygon } from "./geometry";

/**
 * Creates demo planning objects for the active tool. Pure functions: they
 * only look at the existing objects to pick unique ids and running names.
 */

let counter = 0;
function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}`;
}

function nextName(objects: PlanningObject[], prefix: string, pad = 3): string {
  const used = new Set(objects.map((o) => o.name));
  let n = objects.filter((o) => o.name.startsWith(prefix)).length + 1;
  let name = `${prefix}${n.toString().padStart(pad, "0")}`;
  while (used.has(name)) {
    n += 1;
    name = `${prefix}${n.toString().padStart(pad, "0")}`;
  }
  return name;
}

function countOf(objects: PlanningObject[], type: PlanningObject["type"]): number {
  return objects.filter((o) => o.type === type).length;
}

const BUILDING_TOOLS: Partial<Record<ToolId, { landUse: LandUse; floors: number; w: number; h: number }>> = {
  building: { landUse: "Residential", floors: 8, w: 40, h: 31 },
  residential: { landUse: "Residential", floors: 6, w: 36, h: 24 },
  commercial: { landUse: "Commercial", floors: 10, w: 44, h: 32 },
  "mixed-use": { landUse: "Mixed Use", floors: 8, w: 42, h: 30 },
  civic: { landUse: "Civic", floors: 3, w: 48, h: 36 },
};

const AREA_TOOLS: Partial<Record<ToolId, { type: AreaObjectType; category: string; prefix: string; w: number; h: number; blob?: boolean }>> = {
  parcel: { type: "parcel", category: "Parcel", prefix: "Parcel ", w: 70, h: 50 },
  parking: { type: "parking", category: "Surface parking", prefix: "Parking P", w: 56, h: 34 },
  "public-space": { type: "public-space", category: "Plaza", prefix: "Public Space ", w: 50, h: 40 },
  green: { type: "green", category: "Park", prefix: "Green Area ", w: 60, h: 44 },
  "tree-zone": { type: "tree-zone", category: "Tree planting", prefix: "Tree Zone ", w: 24, h: 18, blob: true },
  water: { type: "water", category: "Pond", prefix: "Water ", w: 34, h: 24, blob: true },
};

/** Object created by a single click with a "place" tool (null when the tool does not place). */
export function createObjectAt(tool: ToolId, p: Point, objects: PlanningObject[]): PlanningObject | null {
  const b = BUILDING_TOOLS[tool];
  if (b) {
    const density = b.floors <= 3 ? "Low" : b.floors <= 8 ? "Medium" : "High";
    const building: BuildingObject = {
      id: uid("b"),
      type: "building",
      name: nextName(objects, "B-"),
      x: p.x,
      y: p.y,
      width: b.w,
      height: b.h,
      rotation: 0,
      properties: {
        floors: b.floors,
        height: Math.round(b.floors * 3.5),
        footprint: Math.round(b.w * b.h),
        landUse: b.landUse,
        density,
        status: "Proposed",
      },
    };
    return building;
  }

  const a = AREA_TOOLS[tool];
  if (a) {
    const n = countOf(objects, a.type) + 1;
    const area: AreaObject = {
      id: uid(a.type),
      type: a.type,
      name: `${a.prefix}${n}`,
      x: p.x,
      y: p.y,
      points: a.blob ? blobPolygon(p.x, p.y, a.w / 2, a.h / 2, 14, 0.14, n) : rectPolygon(p.x, p.y, a.w, a.h),
      properties: { category: a.category, status: "Proposed" },
    };
    return area;
  }

  if (tool === "label") {
    const label: LabelObject = {
      id: uid("label"),
      type: "label",
      name: `Label ${countOf(objects, "label") + 1}`,
      x: p.x,
      y: p.y,
      properties: { text: "New label" },
    };
    return label;
  }

  return null;
}

/** Object created from a finished multi-point draft (roads, paths, measurements). */
export function createLineObject(tool: ToolId, points: Point[], objects: PlanningObject[]): PlanningObject | null {
  if (points.length < 2) return null;
  const anchor = points[0];
  if (tool === "road" || tool === "path") {
    const isRoad = tool === "road";
    const line: LinearObject = {
      id: uid(tool),
      type: tool,
      name: isRoad ? `New Road ${countOf(objects, "road") + 1}` : `Path ${countOf(objects, "path") + 1}`,
      x: anchor.x,
      y: anchor.y,
      points,
      width: isRoad ? 12 : 4,
      properties: { roadClass: isRoad ? "Local" : "Pedestrian", lanes: isRoad ? 2 : 0, status: "Proposed" },
    };
    return line;
  }
  if (tool === "measure") {
    const m: MeasureObject = {
      id: uid("measure"),
      type: "measure",
      name: `Measurement ${countOf(objects, "measure") + 1}`,
      x: anchor.x,
      y: anchor.y,
      points: [points[0], points[1]],
    };
    return m;
  }
  return null;
}

/** Deep-enough copy of an object with a fresh id and name, offset by (dx, dy). */
export function cloneObject(obj: PlanningObject, objects: PlanningObject[], dx = 14, dy = 14): PlanningObject {
  const id = uid(obj.type);
  const shift = (pts: Point[]) => pts.map((p) => ({ x: p.x + dx, y: p.y + dy }));
  switch (obj.type) {
    case "building":
      return { ...obj, id, name: nextName(objects, "B-"), x: obj.x + dx, y: obj.y + dy, properties: { ...obj.properties } };
    case "label":
      return { ...obj, id, name: `${obj.name} copy`, x: obj.x + dx, y: obj.y + dy, properties: { ...obj.properties } };
    case "measure":
      return { ...obj, id, name: `${obj.name} copy`, x: obj.x + dx, y: obj.y + dy, points: [shift(obj.points)[0], shift(obj.points)[1]] };
    case "road":
    case "path":
      return { ...obj, id, name: `${obj.name} copy`, x: obj.x + dx, y: obj.y + dy, points: shift(obj.points), properties: { ...obj.properties } };
    default:
      return { ...obj, id, name: `${obj.name} copy`, x: obj.x + dx, y: obj.y + dy, points: shift(obj.points), properties: { ...obj.properties } };
  }
}

export const TYPE_LABEL: Record<PlanningObject["type"], string> = {
  building: "Building",
  road: "Road",
  path: "Path",
  parking: "Parking",
  "public-space": "Public Space",
  green: "Green Area",
  "tree-zone": "Tree Zone",
  water: "Water",
  parcel: "Parcel",
  label: "Label",
  measure: "Measurement",
};
