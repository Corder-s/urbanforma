import type { Bounds, Geometry, Point, SpatialObject } from "../types/visualization.types";

/** Geometry helpers shared by both renderers (pure, engine-neutral). */

export function pathFrom(points: Point[], close = false): string {
  if (points.length === 0) return "";
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return close ? `${d} Z` : d;
}

export function rectCorners(center: Point, width: number, depth: number, rotation = 0): Point[] {
  const hw = width / 2;
  const hd = depth / 2;
  const r = (rotation * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return [
    { x: -hw, y: -hd },
    { x: hw, y: -hd },
    { x: hw, y: hd },
    { x: -hw, y: hd },
  ].map((p) => ({ x: center.x + p.x * cos - p.y * sin, y: center.y + p.x * sin + p.y * cos }));
}

export function geometryCenter(g: Geometry): Point {
  switch (g.kind) {
    case "point":
      return g.point;
    case "rect":
      return g.center;
    case "line":
    case "polygon": {
      const pts = g.points;
      if (pts.length === 0) return { x: 0, y: 0 };
      const s = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
      return { x: s.x / pts.length, y: s.y / pts.length };
    }
  }
}

export function geometryBounds(g: Geometry): Bounds {
  const pts = g.kind === "point" ? [g.point] : g.kind === "rect" ? rectCorners(g.center, g.width, g.depth, g.rotation) : g.points;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: minX, y: minY, width: Math.max(maxX - minX, 1), height: Math.max(maxY - minY, 1) };
}

export function objectCenter(o: SpatialObject): Point {
  return geometryCenter(o.geometry);
}

export function formatMetres(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

export function formatArea(m2: number): string {
  return m2 >= 10_000 ? `${(m2 / 10_000).toFixed(1)} ha` : `${Math.round(m2).toLocaleString("en-US")} m²`;
}

/** Human type label for inspector/search. */
export const TYPE_LABEL: Record<SpatialObject["type"], string> = {
  building: "Building",
  road: "Road",
  path: "Path",
  green: "Green area",
  water: "Water",
  tree: "Tree",
  boundary: "Site boundary",
  poi: "Point of interest",
  terrain: "Terrain",
  block: "Block",
  "context-building": "Surrounding building",
  parking: "Parking",
  transit: "Transit",
  utility: "Utility",
};
