import type { Bounds, PlanningObject, Point } from "../types/planning.types";

/** Shoelace polygon area (m² when points are metres). */
export function polygonArea(points: Point[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

/** Polyline length (open) in metres. */
export function polylineLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) len += distance(points[i - 1], points[i]);
  return len;
}

export function polygonPerimeter(points: Point[]): number {
  return polylineLength([...points, points[0]]);
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Ray-casting point-in-polygon. */
export function pointInPolygon(p: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const intersects = a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function boundsOf(points: Point[]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function centroid(points: Point[]): Point {
  const n = points.length || 1;
  return {
    x: points.reduce((s, p) => s + p.x, 0) / n,
    y: points.reduce((s, p) => s + p.y, 0) / n,
  };
}

/** Axis-aligned rectangle polygon centred on (cx, cy). */
export function rectPolygon(cx: number, cy: number, w: number, h: number): Point[] {
  return [
    { x: cx - w / 2, y: cy - h / 2 },
    { x: cx + w / 2, y: cy - h / 2 },
    { x: cx + w / 2, y: cy + h / 2 },
    { x: cx - w / 2, y: cy + h / 2 },
  ];
}

/** Rounded blob polygon (used for ponds / informal green areas). */
export function blobPolygon(cx: number, cy: number, rx: number, ry: number, steps = 14, wobble = 0.12, seed = 1): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const k = 1 + wobble * Math.sin(t * 3 + seed) * Math.cos(t * 2 - seed);
    pts.push({ x: cx + Math.cos(t) * rx * k, y: cy + Math.sin(t) * ry * k });
  }
  return pts;
}

export function snap(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Translate any planning object by (dx, dy) — returns a new object. */
export function translateObject<T extends PlanningObject>(obj: T, dx: number, dy: number): T {
  const moved = { ...obj, x: obj.x + dx, y: obj.y + dy };
  if ("points" in obj && Array.isArray(obj.points)) {
    const points = obj.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
    return { ...moved, points } as T;
  }
  return moved as T;
}

/** World-space bounds of an object (used for selection outlines and fit). */
export function objectBounds(obj: PlanningObject): Bounds {
  switch (obj.type) {
    case "building": {
      // Rotation is small in the demo data; approximate with the un-rotated box.
      return { x: obj.x - obj.width / 2, y: obj.y - obj.height / 2, width: obj.width, height: obj.height };
    }
    case "label":
      return { x: obj.x - 20, y: obj.y - 6, width: 40, height: 12 };
    default:
      return boundsOf(obj.points);
  }
}

export function pathFrom(points: Point[], close = false): string {
  if (points.length === 0) return "";
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return close ? `${d} Z` : d;
}

export function formatMetres(m: number): string {
  if (m >= 1000) return `${(m / 1000).toLocaleString("en-US", { maximumFractionDigits: 2 })} km`;
  return `${Math.round(m).toLocaleString("en-US")} m`;
}

export function formatArea(m2: number): string {
  if (m2 >= 10_000) return `${(m2 / 10_000).toLocaleString("en-US", { maximumFractionDigits: 2 })} ha`;
  return `${Math.round(m2).toLocaleString("en-US")} m²`;
}
