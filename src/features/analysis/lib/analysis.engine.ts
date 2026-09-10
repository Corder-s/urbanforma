import { centroid, pointInPolygon, polygonArea, polylineLength } from "../../planning/lib/geometry";
import { LAND_USE_STYLE } from "../../visualization/data/visualization.data";
import type { AreaObject, Bounds, BuildingObject, PoiObject, Point, RoadObject, SpatialDataset, TransitObject, TreeObject } from "../../visualization/types/visualization.types";
import { ANALYSIS_PROFILES, RAMPS, ROAD_CLASS_COLOR, statusForScore, WALK_M_PER_MIN, type AnalysisProfile } from "../data/analysis.data";
import type {
  AnalysisFinding,
  AnalysisMetric,
  AnalysisOverlay,
  AnalysisResult,
  ComparisonRow,
  MetricStatus,
  OverlayLegend,
  PlanningConsideration,
  WindVector,
  ZoneCell,
  ZoneDetail,
} from "../types/analysis.types";

/**
 * DEMO analysis engine.
 *
 * Reads the shared SpatialDataset (never a copy of it), derives a coarse zone
 * grid over the site and computes illustrative indicators per zone / per
 * building with simple heuristics: built share, floor area, green share,
 * distance to roads, transit, open space and points of interest.
 *
 * The spatial *pattern* of every overlay comes from the plan geometry; the
 * headline shares and scores are calibrated to the project's demo profile so
 * the numbers on the cards and the picture on the map agree.
 *
 * None of this is a physical simulation (no solar model, no CFD, no routing,
 * no carbon accounting). A future backend returns the same AnalysisResult
 * shape from real engines and the UI stays unchanged.
 */

export const ENGINE_VERSION = "demo-1.0";

// ---------------------------------------------------------------------------
// Deterministic helpers
// ---------------------------------------------------------------------------

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function noise(seed: string): number {
  return (hash(seed) % 10000) / 10000; // 0–1
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function distToPolyline(p: Point, pts: Point[]): number {
  let d = Infinity;
  for (let i = 1; i < pts.length; i++) d = Math.min(d, distToSegment(p, pts[i - 1], pts[i]));
  return d;
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): Point | null {
  const den = (a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x);
  if (Math.abs(den) < 1e-9) return null;
  const t = ((a.x - c.x) * (c.y - d.y) - (a.y - c.y) * (c.x - d.x)) / den;
  const u = -((a.x - b.x) * (a.y - c.y) - (a.y - b.y) * (a.x - c.x)) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
}

/** Parse "SW → NE" into the bearing the wind travels toward (degrees, 0 = north, clockwise). */
function bearingFrom(prevailing: string): number {
  const to = prevailing.split("→")[1]?.trim() ?? "NE";
  const table: Record<string, number> = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };
  return table[to] ?? 45;
}

/**
 * Re-map values so that coverage-weighted class shares match `shares`
 * (ascending classes; thresholds at 1/3 and 2/3). The ranking — i.e. the
 * spatial pattern — is preserved; only the scale is calibrated.
 */
function calibrateShares(cells: { value: number; weight: number }[], shares: number[]): void {
  const total = shares.reduce((s, v) => s + v, 0) || 1;
  const cum: number[] = [];
  shares.reduce((acc, s) => {
    cum.push((acc + s) / total);
    return acc + s;
  }, 0);
  const sorted = [...cells].sort((a, b) => a.value - b.value);
  const weightTotal = sorted.reduce((s, c) => s + c.weight, 0) || 1;
  let acc = 0;
  const n = shares.length;
  for (const c of sorted) {
    const mid = (acc + c.weight / 2) / weightTotal; // cumulative rank 0–1
    acc += c.weight;
    let k = 0;
    while (k < n - 1 && mid > cum[k]) k++;
    const lo = k === 0 ? 0 : cum[k - 1];
    const hi = cum[k];
    const within = hi > lo ? (mid - lo) / (hi - lo) : 0.5;
    c.value = (k + 0.08 + within * 0.84) / n; // inside class k, never on the boundary
  }
}

/** Shift values (clamped) until the weighted mean equals `target` (0–1). */
function calibrateMean(cells: { value: number; weight: number }[], target: number): void {
  const wsum = cells.reduce((s, c) => s + c.weight, 0) || 1;
  const mean = (shift: number) => cells.reduce((s, c) => s + clamp01(c.value + shift) * c.weight, 0) / wsum;
  let lo = -1;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (mean(mid) < target) lo = mid;
    else hi = mid;
  }
  const shift = (lo + hi) / 2;
  for (const c of cells) c.value = clamp01(c.value + shift);
}

// ---------------------------------------------------------------------------
// Zone grid
// ---------------------------------------------------------------------------

interface ZoneFeatures {
  id: string;
  label: string;
  row: number;
  col: number;
  bounds: Bounds;
  center: Point;
  coverage: number;
  areaM2: number;
  builtM2: number;
  floorM2: number;
  buildings: BuildingObject[];
  maxFloors: number;
  avgFloors: number;
  greenM2: number;
  canopyM2: number;
  roadM: number;
  parkingM2: number;
  waterNear: boolean;
  arterialDistM: number;
  transitDistM: number;
  openSpaceDistM: number;
  poiWithin800: number;
  population: number;
}

function buildZones(data: SpatialDataset): ZoneFeatures[] {
  const boundary = data.objects.find((o) => o.type === "boundary");
  const poly = boundary && boundary.geometry.kind === "polygon" ? boundary.geometry.points : null;
  const sb = data.siteBounds;
  const target = Math.max(70, Math.min(140, Math.sqrt((sb.width * sb.height) / 36)));
  const cols = Math.max(3, Math.min(9, Math.round(sb.width / target)));
  const rows = Math.max(3, Math.min(9, Math.round(sb.height / target)));
  const cw = sb.width / cols;
  const ch = sb.height / rows;

  const buildings = data.objects.filter((o): o is BuildingObject => o.type === "building");
  const greens = data.objects.filter((o): o is AreaObject => o.type === "green");
  const parkings = data.objects.filter((o): o is AreaObject => o.type === "parking");
  const waters = data.objects.filter((o): o is AreaObject => o.type === "water");
  const plazas = data.objects.filter((o): o is AreaObject => o.type === "block" && /plaza/i.test(o.properties.category));
  const trees = data.objects.filter((o): o is TreeObject => o.type === "tree");
  const roads = data.objects.filter((o): o is RoadObject => o.type === "road" && !o.id.startsWith("ctx-"));
  const arterials = roads.filter((r) => r.properties.roadClass === "Arterial" || r.properties.roadClass === "Collector");
  const transit = data.objects.find((o): o is TransitObject => o.type === "transit");
  const stations = transit?.properties.stations.map((s) => s.point) ?? [];
  const pois = data.objects.filter((o): o is PoiObject => o.type === "poi");
  const openSpaces = [...greens, ...plazas].map((g) => ({ c: centroid(g.geometry.points), r: Math.sqrt(polygonArea(g.geometry.points)) / 2 }));

  const inCell = (p: Point, b: Bounds) => p.x >= b.x && p.x < b.x + b.width && p.y >= b.y && p.y < b.y + b.height;
  const zones: ZoneFeatures[] = [];
  const letters = "ABCDEFGHIJ";

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bounds: Bounds = { x: sb.x + c * cw, y: sb.y + r * ch, width: cw, height: ch };
      // coverage: fraction of a 5×5 sample grid inside the boundary polygon
      let inside = 0;
      for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
        const p = { x: bounds.x + ((i + 0.5) / 5) * cw, y: bounds.y + ((j + 0.5) / 5) * ch };
        if (!poly || pointInPolygon(p, poly)) inside++;
      }
      const coverage = inside / 25;
      if (coverage < 0.12) continue;
      const center = { x: bounds.x + cw / 2, y: bounds.y + ch / 2 };
      const cellBuildings = buildings.filter((b) => inCell(b.geometry.center, bounds));
      const builtM2 = cellBuildings.reduce((s, b) => s + b.properties.footprint, 0);
      const floorM2 = cellBuildings.reduce((s, b) => s + b.properties.footprint * b.properties.floors, 0);
      const maxFloors = cellBuildings.reduce((m, b) => Math.max(m, b.properties.floors), 0);
      const avgFloors = cellBuildings.length ? cellBuildings.reduce((s, b) => s + b.properties.floors, 0) / cellBuildings.length : 0;
      const greenM2 = greens.filter((g) => inCell(centroid(g.geometry.points), bounds)).reduce((s, g) => s + g.properties.areaM2, 0);
      const canopyM2 = trees.filter((t) => inCell(t.geometry.point, bounds)).reduce((s, t) => s + Math.PI * t.properties.canopyM ** 2, 0);
      const parkingM2 = parkings.filter((g) => inCell(centroid(g.geometry.points), bounds)).reduce((s, g) => s + g.properties.areaM2, 0);
      let roadM = 0;
      for (const rd of roads) {
        const pts = rd.geometry.points;
        for (let i = 1; i < pts.length; i++) {
          // sample the segment at 10 points and count those inside the cell
          const segLen = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
          let k = 0;
          for (let s = 0; s < 10; s++) {
            const t = (s + 0.5) / 10;
            if (inCell({ x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t }, bounds)) k++;
          }
          roadM += (segLen * k) / 10;
        }
      }
      const waterNear = waters.some((w) => w.geometry.points.some((p) => Math.hypot(p.x - center.x, p.y - center.y) < Math.max(cw, ch) * 0.9));
      const arterialDistM = arterials.length ? Math.min(...arterials.map((a) => distToPolyline(center, a.geometry.points))) : 400;
      const transitDistM = stations.length ? Math.min(...stations.map((s) => Math.hypot(s.x - center.x, s.y - center.y))) : 900;
      const openSpaceDistM = openSpaces.length ? Math.min(...openSpaces.map((o) => Math.max(0, Math.hypot(o.c.x - center.x, o.c.y - center.y) - o.r))) : 700;
      const poiWithin800 = pois.filter((p) => Math.hypot(p.geometry.point.x - center.x, p.geometry.point.y - center.y) < 800).length;
      const population = cellBuildings.reduce((s, b) => s + b.properties.populationCapacity, 0);
      zones.push({
        id: `zone-${letters[r]}${c + 1}`,
        label: `Zone ${letters[r]}${c + 1}`,
        row: r,
        col: c,
        bounds,
        center,
        coverage,
        areaM2: cw * ch * coverage,
        builtM2,
        floorM2,
        buildings: cellBuildings,
        maxFloors,
        avgFloors,
        greenM2,
        canopyM2,
        roadM,
        parkingM2,
        waterNear,
        arterialDistM,
        transitDistM,
        openSpaceDistM,
        poiWithin800,
        population,
      });
    }
  }
  return zones;
}

/** Plain-language position of a zone within the site ("central", "north-east"). */
/**
 * Where the strongest (or weakest) quarter of an overlay sits on the site —
 * a coverage-weighted centroid of the top cells, so a finding describes the
 * cluster ("central zones") rather than a single outlier cell.
 */
export function clusterPosition(zones: ZoneCell[], site: Bounds, highest = true): { position: string; peak: ZoneCell } | null {
  if (zones.length === 0) return null;
  const sorted = [...zones].sort((a, b) => (highest ? b.value - a.value : a.value - b.value));
  const pick = sorted.slice(0, Math.max(3, Math.round(zones.length / 4)));
  let sx = 0;
  let sy = 0;
  let sw = 0;
  for (const z of pick) {
    const w = (highest ? z.value : 1 - z.value) * (0.5 + 0.5 * z.coverage) + 0.001;
    sx += (z.bounds.x + z.bounds.width / 2) * w;
    sy += (z.bounds.y + z.bounds.height / 2) * w;
    sw += w;
  }
  // A cluster spans several cells, so use a slightly wider central band than a single zone label.
  return { position: zonePosition({ x: sx / sw, y: sy / sw, width: 0, height: 0 }, site, 0.3), peak: sorted[0] };
}

export function zonePosition(bounds: Bounds, site: Bounds, band = 0.34): string {
  const cx = (bounds.x + bounds.width / 2 - site.x) / site.width;
  const cy = (bounds.y + bounds.height / 2 - site.y) / site.height;
  const ns = cy < band ? "north" : cy > 1 - band ? "south" : "";
  const ew = cx < band ? "west" : cx > 1 - band ? "east" : "";
  if (!ns && !ew) return "central";
  return [ns, ew].filter(Boolean).join("-");
}

// ---------------------------------------------------------------------------
// Overlays
// ---------------------------------------------------------------------------

interface RawCell {
  z: ZoneFeatures;
  value: number;
  weight: number;
}

function legendRamp(title: string, ramp: string[], labels: string[], minLabel?: string, maxLabel?: string): OverlayLegend {
  return { title, kind: "ramp", stops: ramp.map((color, i) => ({ t: i / (ramp.length - 1), color, label: labels[i] ?? "" })), minLabel, maxLabel };
}

function legendClasses(title: string, entries: { color: string; label: string }[]): OverlayLegend {
  return { title, kind: "classes", stops: entries.map((e, i) => ({ t: i / Math.max(1, entries.length - 1), color: e.color, label: e.label })) };
}

function cells(raw: RawCell[]): ZoneCell[] {
  return raw.map((r) => ({ id: r.z.id, bounds: r.z.bounds, coverage: r.z.coverage, value: clamp01(r.value) }));
}

function buildOverlays(data: SpatialDataset, zones: ZoneFeatures[], profile: AnalysisProfile, projectId: string): { overlays: AnalysisOverlay[]; maxFar: number; maxHeight: number } {
  const buildings = data.objects.filter((o): o is BuildingObject => o.type === "building");
  const maxFloorM2 = Math.max(1, ...zones.map((z) => z.floorM2));
  const maxRoadM = Math.max(1, ...zones.map((z) => z.roadM));
  const maxHeight = Math.max(3, ...buildings.map((b) => b.properties.height));
  const maxFloors = Math.max(1, ...buildings.map((b) => b.properties.floors));
  const far = (z: ZoneFeatures) => (z.areaM2 > 0 ? z.floorM2 / z.areaM2 : 0);
  const maxFar = Math.max(0.01, ...zones.map(far));
  const densityNorm = (z: ZoneFeatures) => z.floorM2 / maxFloorM2;
  const greenShare = (z: ZoneFeatures) => clamp01((z.greenM2 + z.canopyM2 * 0.6) / Math.max(1, z.areaM2));
  const hardShare = (z: ZoneFeatures) => clamp01((z.builtM2 + z.parkingM2 + z.roadM * 9) / Math.max(1, z.areaM2));
  const n = (z: ZoneFeatures, k: string) => (noise(`${projectId}:${z.id}:${k}`) - 0.5) * 2; // −1…1

  const overlays: AnalysisOverlay[] = [];

  // --- solar: open, low-density ground reads brighter; tall neighbours shade ------------------
  const solar: RawCell[] = zones.map((z) => ({ z, weight: z.areaM2, value: 0.92 - 0.5 * densityNorm(z) - 0.12 * greenShare(z) + 0.06 * n(z, "solar") }));
  calibrateShares(solar, [profile.solar.low, profile.solar.moderate, profile.solar.high]);
  const solarBuildings: Record<string, number> = {};
  for (const b of buildings) solarBuildings[b.id] = clamp01(b.properties.environmental.solarExposure / 100);
  overlays.push({
    id: "solar",
    type: "solar",
    title: "Solar exposure",
    zones: cells(solar),
    buildings: solarBuildings,
    min: 0,
    max: 100,
    legend: legendRamp("Solar exposure", RAMPS.solar, ["Low", "", "Moderate", "High"], "Low", "High"),
    paints: ["zones"],
  });

  // --- heat: hard surfaces + massing, cooled by green and water ------------------------------
  const heat: RawCell[] = zones.map((z) => ({ z, weight: z.areaM2, value: 0.2 + 0.55 * hardShare(z) + 0.2 * densityNorm(z) - 0.4 * greenShare(z) - (z.waterNear ? 0.15 : 0) + 0.05 * n(z, "heat") }));
  calibrateShares(heat, [profile.heat.low, profile.heat.moderate, profile.heat.high]);
  overlays.push({
    id: "heat",
    type: "heat",
    title: "Heat zones",
    zones: cells(heat),
    buildings: {},
    min: 0,
    max: 100,
    legend: { ...legendRamp("Relative heat", RAMPS.heat, ["Low", "", "Moderate", "High"], "Low", "High"), symbols: [{ swatch: "hatch", label: "High-heat zone", color: "#DC2626" }] },
    paints: ["zones"],
  });

  // --- wind: prevailing flow, faster in open ground and at tall edges ------------------------
  const bearing = bearingFrom(profile.wind.prevailing);
  const wind: RawCell[] = zones.map((z) => {
    const edge = z.maxFloors >= 12 ? 0.22 : z.maxFloors >= 8 ? 0.08 : 0;
    return { z, weight: z.areaM2, value: 0.5 + 0.35 * (1 - densityNorm(z)) - 0.2 * greenShare(z) + edge + 0.08 * n(z, "wind") };
  });
  calibrateShares(wind, [profile.wind.lower, profile.wind.comfortable, profile.wind.higher]);
  const vectors: WindVector[] = wind.map((c) => {
    const deflect = (n(c.z, "deflect") * 14 + (c.z.maxFloors >= 10 ? n(c.z, "edge") * 18 : 0));
    return { origin: c.z.center, bearing: bearing + deflect, speed: clamp01(c.value) };
  });
  overlays.push({
    id: "wind",
    type: "wind",
    title: "Wind comfort",
    zones: cells(wind),
    buildings: {},
    vectors,
    min: 0,
    max: 100,
    legend: { ...legendClasses("Relative wind speed", [{ color: RAMPS.wind[1], label: "Lower" }, { color: RAMPS.wind[2], label: "Comfortable" }, { color: RAMPS.wind[3], label: "Higher" }]), symbols: [{ swatch: "arrow", label: `Prevailing ${profile.wind.prevailing}`, color: "#075985" }] },
    paints: ["zones", "vectors"],
  });

  // --- green: share of green per zone + the green objects themselves ------------------------
  const maxGreen = Math.max(0.01, ...zones.map(greenShare));
  const green: RawCell[] = zones.map((z) => ({ z, weight: z.areaM2, value: greenShare(z) / maxGreen }));
  overlays.push({
    id: "green",
    type: "green",
    title: "Green coverage",
    zones: cells(green),
    buildings: {},
    highlight: data.objects.filter((o) => o.type === "green" || o.type === "tree").map((o) => o.id),
    min: 0,
    max: Math.round(maxGreen * 100),
    legend: { ...legendRamp("Green share per zone", RAMPS.green, ["None", "", "", "Highest"], "0%", `${Math.round(maxGreen * 100)}%`), symbols: [{ swatch: "outline", label: "Parks, green areas, tree planting", color: "#15803D" }] },
    paints: ["zones", "areas"],
  });

  // --- carbon: floor area (operational) + road surface (embodied/mobility) − green ------------
  const carbonFactor: Record<string, number> = { Commercial: 1.2, Residential: 1, "Mixed Use": 1.1, Civic: 0.9, Institutional: 0.9, Industrial: 1.4 };
  const carbon: RawCell[] = zones.map((z) => ({ z, weight: z.areaM2, value: 0.6 * densityNorm(z) + 0.25 * (z.roadM / maxRoadM) + 0.15 * (1 - greenShare(z)) }));
  const maxCarbon = Math.max(0.01, ...carbon.map((c) => c.value));
  for (const c of carbon) c.value /= maxCarbon;
  const carbonBuildings: Record<string, number> = {};
  const maxBuildingCarbon = Math.max(1, ...buildings.map((b) => b.properties.footprint * b.properties.floors * (carbonFactor[b.properties.landUse] ?? 1)));
  for (const b of buildings) carbonBuildings[b.id] = clamp01((b.properties.footprint * b.properties.floors * (carbonFactor[b.properties.landUse] ?? 1)) / maxBuildingCarbon);
  overlays.push({
    id: "carbon",
    type: "carbon",
    title: "Carbon intensity",
    zones: cells(carbon),
    buildings: carbonBuildings,
    min: 0,
    max: 100,
    legend: { ...legendRamp("Relative carbon intensity", RAMPS.carbon, ["Lower", "", "", "Higher"], "Lower", "Higher"), symbols: [{ swatch: "dot", label: "Largest building contributors", color: "#334155" }] },
    paints: ["zones", "buildings"],
  });

  // --- density / height / land use --------------------------------------------------------------
  const density: RawCell[] = zones.map((z) => ({ z, weight: z.areaM2, value: far(z) / maxFar }));
  const densityBuildings: Record<string, number> = {};
  for (const b of buildings) densityBuildings[b.id] = clamp01(b.properties.floors / maxFloors);
  overlays.push({
    id: "density",
    type: "density",
    title: "Building density",
    zones: cells(density),
    buildings: densityBuildings,
    min: 0,
    max: round1(maxFar),
    legend: legendRamp("Floor area ratio per zone", RAMPS.density, ["Low", "", "", "High"], "0", `${maxFar.toFixed(2)} FAR`),
    paints: ["zones", "buildings"],
  });

  const heightBuildings: Record<string, number> = {};
  for (const b of buildings) heightBuildings[b.id] = clamp01(b.properties.height / maxHeight);
  overlays.push({
    id: "height",
    type: "height",
    title: "Building height",
    zones: [],
    buildings: heightBuildings,
    min: 3,
    max: Math.round(maxHeight),
    legend: legendRamp("Building height", RAMPS.height, ["Low-rise", "", "", "Tallest"], "3 m", `${Math.round(maxHeight)} m`),
    paints: ["buildings"],
  });

  const landUseBuildings: Record<string, number> = {};
  const uses = Object.keys(LAND_USE_STYLE);
  for (const b of buildings) landUseBuildings[b.id] = uses.indexOf(b.properties.landUse) / Math.max(1, uses.length - 1);
  overlays.push({
    id: "landuse",
    type: "landuse",
    title: "Land use",
    zones: [],
    buildings: landUseBuildings,
    min: 0,
    max: uses.length - 1,
    legend: legendClasses(
      "Land use",
      uses.map((u) => ({ color: LAND_USE_STYLE[u as keyof typeof LAND_USE_STYLE].stroke, label: u }))
    ),
    paints: ["buildings"],
  });

  // --- open space reach (walk minutes) ---------------------------------------------------------
  const open: RawCell[] = zones.map((z) => ({ z, weight: z.areaM2, value: z.openSpaceDistM / WALK_M_PER_MIN / 12 })); // 0 = adjacent, 1 = 12+ min
  calibrateShares(open, [profile.openSpace.within5, profile.openSpace.within10 - profile.openSpace.within5, 100 - profile.openSpace.within10]);
  overlays.push({
    id: "openspace",
    type: "openspace",
    title: "Open space access",
    zones: cells(open),
    buildings: {},
    highlight: data.objects.filter((o) => o.type === "green" || (o.type === "block" && /plaza/i.test(o.properties.category))).map((o) => o.id),
    min: 0,
    max: 12,
    legend: { ...legendClasses("Walk to nearest open space", [{ color: RAMPS.openspace[0], label: "Within 5 min" }, { color: RAMPS.openspace[1], label: "5–10 min" }, { color: RAMPS.openspace[2], label: "Over 10 min" }]), symbols: [{ swatch: "outline", label: "Open space", color: "#15803D" }] },
    paints: ["zones", "areas"],
  });

  // --- accessibility: major roads + transit --------------------------------------------------------
  const access: RawCell[] = zones.map((z) => {
    const roadMin = z.arterialDistM / WALK_M_PER_MIN;
    const transitMin = z.transitDistM / WALK_M_PER_MIN;
    return { z, weight: z.areaM2, value: clamp01(1 - (0.6 * Math.min(1, roadMin / 6) + 0.4 * Math.min(1, transitMin / 12))) };
  });
  calibrateMean(access, profile.mobility.within5MinRoad / 100);
  overlays.push({
    id: "accessibility",
    type: "accessibility",
    title: "Accessibility",
    zones: cells(access),
    buildings: {},
    min: 0,
    max: 100,
    legend: { ...legendClasses("Reach of major roads and transit", [{ color: RAMPS.accessibility[0], label: "Limited" }, { color: RAMPS.accessibility[1], label: "Fair" }, { color: RAMPS.accessibility[2], label: "Good" }, { color: RAMPS.accessibility[3], label: "Excellent" }]), symbols: [{ swatch: "dot", label: "Transit station (planned)", color: "#1D4ED8" }] },
    paints: ["zones"],
  });

  // --- roads: hierarchy ----------------------------------------------------------------------------
  overlays.push({
    id: "roads",
    type: "roads",
    title: "Road network",
    zones: [],
    buildings: {},
    min: 0,
    max: 1,
    legend: { ...legendClasses("Road hierarchy", Object.entries(ROAD_CLASS_COLOR).map(([label, color]) => ({ color, label }))), symbols: [{ swatch: "dot", label: "Intersection (demo geometry)", color: "#0F172A" }] },
    paints: ["roads"],
  });

  // --- walkability: destinations, street density, green nearby -----------------------------------------
  const walk: RawCell[] = zones.map((z) => ({ z, weight: z.areaM2, value: 0.45 * Math.min(1, z.poiWithin800 / 4) + 0.3 * (z.roadM / maxRoadM) + 0.25 * Math.min(1, greenShare(z) * 3) + 0.04 * n(z, "walk") }));
  calibrateMean(walk, profile.mobility.walkability / 100);
  overlays.push({
    id: "walkability",
    type: "walkability",
    title: "Walkability",
    zones: cells(walk),
    buildings: {},
    min: 0,
    max: 100,
    legend: { ...legendClasses("Walkability", [{ color: RAMPS.walkability[0], label: "Low" }, { color: RAMPS.walkability[1], label: "Fair" }, { color: RAMPS.walkability[2], label: "Good" }, { color: RAMPS.walkability[3], label: "Excellent" }]), symbols: [{ swatch: "dot", label: "Everyday destination (POI)", color: "#1D4ED8" }] },
    paints: ["zones"],
  });

  return { overlays, maxFar, maxHeight };
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

function metric(m: Omit<AnalysisMetric, "status"> & { status?: MetricStatus }): AnalysisMetric {
  return { ...m, status: m.status ?? (m.score !== undefined ? statusForScore(m.score) : "info") };
}

function buildMetrics(data: SpatialDataset, profile: AnalysisProfile, roadsByClass: { label: string; km: number }[], intersections: number, height: { avgFloors: number; avgM: number; tallest: BuildingObject | null; over10Pct: number }): AnalysisMetric[] {
  const s = data.summary;
  const greenGap = round1(profile.green.target - s.greenCoveragePct);
  const grossDensity = s.siteAreaHa > 0 ? Math.round(s.populationCapacity / s.siteAreaHa) : 0;
  const heatScore = 100 - profile.heat.index;
  const p = profile;

  return [
    metric({
      id: "overall",
      category: "overview",
      name: "Urban Performance Score",
      value: p.overall,
      unit: "score",
      score: p.overall,
      description: "Composite of environment, mobility, urban form, green infrastructure and carbon.",
      interpretation: `The current plan scores ${p.overall} / 100 on the demo composite — ${p.overall >= 80 ? "a strong overall position with a few focused improvement areas" : p.overall >= 65 ? "a sound baseline with clear opportunities" : "an early-stage plan with several areas to develop"}.`,
      keyFactors: ["Green infrastructure", "Environmental comfort", "Mobility and access", "Carbon performance"],
      recommendation: "Prioritise the lowest breakdown scores first — they move the composite most.",
    }),
    metric({
      id: "solar-avg",
      category: "solar",
      name: "Solar Exposure",
      value: p.solar.avg,
      unit: "score",
      score: p.solar.avg,
      description: "Average relative solar availability across development areas.",
      interpretation: p.solar.avg >= 75 ? "Good solar availability across most development areas." : "Solar availability is uneven; taller blocks shade parts of the site.",
      breakdown: [
        { label: "High Exposure Areas", value: p.solar.high, unit: "percent" },
        { label: "Moderate Areas", value: p.solar.moderate, unit: "percent" },
        { label: "Low Exposure Areas", value: p.solar.low, unit: "percent" },
      ],
      keyFactors: ["Building orientation", "Block spacing", "Tall neighbours"],
      recommendation: "Preserve high-exposure areas for uses that benefit from daylight and rooftop generation.",
    }),
    metric({
      id: "solar-peak",
      category: "solar",
      name: "Peak Exposure",
      value: NaN,
      unit: "text",
      text: p.solar.peak,
      status: "info",
      description: "Time window with the highest average exposure (demo).",
      interpretation: "Midday peak is typical for a low-latitude site with open block layouts.",
    }),
    metric({
      id: "heat-risk",
      category: "heat",
      name: "Heat Risk",
      value: NaN,
      unit: "text",
      text: p.heat.risk,
      status: p.heat.risk === "Low" ? "good" : p.heat.risk === "Medium" ? "moderate" : "attention",
      description: "Qualitative heat risk for the site as a whole.",
      interpretation: p.heat.risk === "High" ? "Dense, hard-surfaced areas dominate the site and raise heat exposure." : p.heat.risk === "Medium" ? "High-density built areas are contributing to increased heat exposure." : "Vegetation and water keep heat exposure low across most of the site.",
      breakdown: [
        { label: "High Heat Areas", value: p.heat.high, unit: "percent" },
        { label: "Moderate", value: p.heat.moderate, unit: "percent" },
        { label: "Low", value: p.heat.low, unit: "percent" },
      ],
      keyFactors: ["Hard surfaces", "Building concentration", "Low vegetation"],
      recommendation: "Increase tree canopy and shaded public space.",
    }),
    metric({
      id: "heat-index",
      category: "heat",
      name: "Average Heat Index",
      value: p.heat.index,
      unit: "score",
      score: heatScore,
      status: p.heat.risk === "Low" ? "good" : p.heat.risk === "Medium" ? "moderate" : "attention",
      description: "Relative heat index, 0 (coolest) to 100 (hottest).",
      interpretation: `${p.heat.high}% of the site falls into the high-heat class, concentrated where massing and paving coincide.`,
      keyFactors: ["Building concentration", "Paved surfaces", "Vegetation"],
      recommendation: "Increase green and open space, improve shading along key pedestrian routes.",
    }),
    metric({
      id: "wind-comfort",
      category: "wind",
      name: "Wind Comfort",
      value: p.wind.comfort,
      unit: "score",
      score: p.wind.comfort,
      description: "Share of the site within a comfortable pedestrian wind range.",
      interpretation: p.wind.comfort >= 75 ? "Comfortable pedestrian conditions across most of the site." : "Several areas sit outside the comfortable range, mostly around taller blocks.",
      breakdown: [
        { label: "Comfortable Areas", value: p.wind.comfortable, unit: "percent" },
        { label: "Higher Wind Areas", value: p.wind.higher, unit: "percent" },
        { label: "Lower Wind Areas", value: p.wind.lower, unit: "percent" },
      ],
      keyFactors: ["Prevailing direction", "Building edges", "Open ground"],
      recommendation: `Soften ${p.wind.concern.toLowerCase()} with setbacks, canopies or planting.`,
    }),
    metric({
      id: "wind-speed",
      category: "wind",
      name: "Average Wind Speed",
      value: p.wind.avgSpeed,
      unit: "m/s",
      status: "info",
      description: "Indicative mean speed at pedestrian height (demo).",
      interpretation: `Prevailing direction ${p.wind.prevailing}. Potential concern: ${p.wind.concern.toLowerCase()}.`,
    }),
    metric({
      id: "wind-direction",
      category: "wind",
      name: "Prevailing Direction",
      value: NaN,
      unit: "text",
      text: p.wind.prevailing,
      status: "info",
      description: "Dominant seasonal flow used for the demo field.",
      interpretation: `Comfort: ${p.wind.comfort >= 75 ? "Good" : p.wind.comfort >= 60 ? "Fair" : "Limited"}. Potential concern: ${p.wind.concern}.`,
    }),
    metric({
      id: "green-coverage",
      category: "green",
      name: "Green Coverage",
      value: s.greenCoveragePct,
      unit: "percent",
      score: Math.round(Math.min(100, (s.greenCoveragePct / p.green.target) * 90)),
      status: greenGap <= 0 ? "good" : greenGap <= 4 ? "moderate" : "attention",
      description: "Share of the site covered by parks, planting and other green.",
      interpretation: greenGap > 0 ? `Green coverage is ${greenGap} percentage points below the ${p.green.target}% target.` : `Green coverage meets the ${p.green.target}% target.`,
      breakdown: [
        { label: "Trees", value: p.green.trees, unit: "ha" },
        { label: "Parks", value: p.green.parks, unit: "ha" },
        { label: "Green Corridors", value: p.green.corridors, unit: "ha" },
        { label: "Other Green", value: p.green.other, unit: "ha" },
      ],
      keyFactors: ["Park provision", "Street trees", "Courtyard planting"],
      recommendation: "Increase green corridors along the main streets and connect courtyards.",
    }),
    metric({ id: "green-target", category: "green", name: "Target", value: p.green.target, unit: "percent", status: "info", description: "Project sustainability target for green coverage.", interpretation: "Set in the project's planning preferences." }),
    metric({ id: "green-gap", category: "green", name: "Gap", value: Math.max(0, greenGap), unit: "percent", status: greenGap <= 0 ? "good" : "attention", description: "Percentage points still needed to reach the target.", interpretation: greenGap > 0 ? `${greenGap} percentage points ≈ ${round1((greenGap / 100) * s.siteAreaHa)} ha of additional green.` : "Target achieved." }),
    metric({
      id: "carbon-performance",
      category: "carbon",
      name: "Carbon Performance",
      value: p.carbon.performance,
      unit: "score",
      score: p.carbon.performance,
      description: "Relative carbon performance of the plan (estimated, demo).",
      interpretation: `Buildings account for about ${p.carbon.buildings}% of the estimated impact; mobility ${p.carbon.mobility}%.`,
      breakdown: [
        { label: "Buildings", value: p.carbon.buildings, unit: "percent" },
        { label: "Mobility", value: p.carbon.mobility, unit: "percent" },
        { label: "Infrastructure", value: p.carbon.infrastructure, unit: "percent" },
        { label: "Other", value: p.carbon.other, unit: "percent" },
      ],
      keyFactors: ["Floor area and use mix", "Trip distances", "Road and utility construction"],
      recommendation: "Prioritise low-carbon building systems in the largest commercial volumes.",
    }),
    metric({ id: "carbon-annual", category: "carbon", name: "Estimated Annual Impact", value: p.carbon.annualTCO2e, unit: "tCO2e", status: "info", description: "Order-of-magnitude estimate — demo value, not carbon accounting.", interpretation: "Indicative only; real accounting requires energy and transport models." }),
    metric({ id: "density-gross", category: "density", name: "Gross Density", value: grossDensity, unit: "people/ha", status: "info", description: "Population capacity divided by site area.", interpretation: `${s.populationCapacity.toLocaleString("en-US")} people across ${s.siteAreaHa} ha.` }),
    metric({ id: "density-far", category: "density", name: "Building Density", value: p.density.far, unit: "FAR", status: "info", description: "Site-wide floor area ratio.", interpretation: p.density.far >= 1 ? "A compact, urban intensity." : "A moderate intensity with room for infill." }),
    metric({ id: "density-floors", category: "density", name: "Average Height", value: p.density.avgFloors, unit: "floors", status: "info", description: "Mean number of floors across planned buildings.", interpretation: `Buildings range from ${Math.max(1, Math.round(height.avgFloors * 0.4))} to ${height.tallest?.properties.floors ?? 0} floors.` }),
    metric({ id: "density-utilization", category: "density", name: "Site Utilization", value: p.density.utilization, unit: "percent", score: p.density.utilization, status: p.density.utilization >= 60 ? "good" : "moderate", description: "Share of developable land in active use.", interpretation: "Balanced utilisation leaves space for open space and later phases." }),
    metric({ id: "height-avg", category: "height", name: "Average Height", value: round1(height.avgM), unit: "text", text: `${round1(height.avgM)} m · ${round1(height.avgFloors)} floors`, status: "info", description: "Mean height of planned buildings.", interpretation: `${Math.round(height.over10Pct)}% of buildings have 10 floors or more.` }),
    metric({ id: "height-tallest", category: "height", name: "Tallest Building", value: height.tallest?.properties.height ?? 0, unit: "text", text: height.tallest ? `${height.tallest.name} · ${height.tallest.properties.floors} floors` : "—", status: "info", description: "Tallest planned building on the site.", interpretation: height.tallest ? `${height.tallest.properties.landUse}, ${height.tallest.properties.height} m.` : "No buildings yet." }),
    metric({ id: "height-over10", category: "height", name: "Buildings over 10 floors", value: Math.round(height.over10Pct), unit: "percent", status: "info", description: "Share of tall buildings.", interpretation: "Taller volumes concentrate along the main streets." }),
    metric({
      id: "landuse-mix",
      category: "landuse",
      name: "Land Use Mix",
      value: p.landUse.residential,
      unit: "percent",
      status: "info",
      description: "Distribution of uses across the plan area.",
      interpretation: `Residential leads at ${p.landUse.residential}%, followed by commercial (${p.landUse.commercial}%) and green (${p.landUse.green}%).`,
      breakdown: [
        { label: "Residential", value: p.landUse.residential, unit: "percent" },
        { label: "Commercial", value: p.landUse.commercial, unit: "percent" },
        { label: "Mixed Use", value: p.landUse.mixed, unit: "percent" },
        { label: "Public / Civic", value: p.landUse.civic, unit: "percent" },
        { label: "Green", value: p.landUse.green, unit: "percent" },
        { label: "Infrastructure", value: p.landUse.infrastructure, unit: "percent" },
      ],
    }),
    metric({
      id: "openspace-total",
      category: "openspace",
      name: "Open Space",
      value: p.openSpace.total,
      unit: "percent",
      score: Math.min(100, Math.round(p.openSpace.total * 2.6)),
      description: "Public and private open space as a share of the site.",
      interpretation: `${p.openSpace.within5}% of the site is within a 5-minute walk of open space; ${p.openSpace.within10}% within 10 minutes.`,
      breakdown: [
        { label: "Public open space", value: p.openSpace.publicShare, unit: "percent" },
        { label: "Private open space", value: p.openSpace.privateShare, unit: "percent" },
        { label: "Within 5 min", value: p.openSpace.within5, unit: "percent" },
        { label: "Within 10 min", value: p.openSpace.within10, unit: "percent" },
      ],
      keyFactors: ["Park distribution", "Block permeability", "Courtyard access"],
      recommendation: "Add pocket parks where the 5-minute reach is weakest.",
    }),
    metric({ id: "openspace-public", category: "openspace", name: "Public Open Space", value: p.openSpace.publicShare, unit: "percent", status: "info", description: "Publicly accessible open space.", interpretation: "Parks, plazas and the waterfront." }),
    metric({ id: "openspace-private", category: "openspace", name: "Private Open Space", value: p.openSpace.privateShare, unit: "percent", status: "info", description: "Courtyards and private gardens.", interpretation: "Counted for coverage, not for public reach." }),
    metric({
      id: "access-road",
      category: "accessibility",
      name: "Population within 5 min of a major road",
      value: p.mobility.within5MinRoad,
      unit: "percent",
      score: p.mobility.within5MinRoad,
      description: "Share of capacity within a 5-minute walk of an arterial or collector.",
      interpretation: p.mobility.within5MinRoad >= 80 ? "Most residents and workers are close to the primary street network." : "Inner blocks sit further from the primary network.",
      keyFactors: ["Street hierarchy", "Block size", "Transit alignment"],
      recommendation: "Keep the arterial frontages active and add mid-block links where blocks are long.",
    }),
    metric({ id: "access-transit", category: "accessibility", name: "Transit access", value: NaN, unit: "text", text: p.mobility.transitAccess, status: "info", description: "Reach of the planned metro line.", interpretation: "Reference only — a routing engine will replace this reading." }),
    metric({
      id: "roads-length",
      category: "roads",
      name: "Road Network",
      value: s.roadNetworkKm,
      unit: "km",
      status: "info",
      description: "Total length of planned streets (excluding paths).",
      interpretation: `${roadsByClass.map((r) => `${r.label} ${r.km} km`).join(" · ")}.`,
      breakdown: roadsByClass.map((r) => ({ label: r.label, value: r.km, unit: "km" as const })),
    }),
    metric({ id: "roads-intersections", category: "roads", name: "Intersection density", value: intersections, unit: "text", text: p.mobility.intersectionDensity, status: "info", description: "Junctions per km² — reference value until a network model exists.", interpretation: `${intersections} intersections found in the demo geometry.` }),
    metric({
      id: "walkability",
      category: "walkability",
      name: "Walkability",
      value: p.mobility.walkability,
      unit: "score",
      score: p.mobility.walkability,
      description: "Everyday destinations, street density and green within a short walk.",
      interpretation: p.mobility.walkability >= 75 ? "Walkability is strongest around the central mixed-use area." : "Walkability drops in the outer blocks where destinations are sparse.",
      keyFactors: ["Points of interest", "Street density", "Green nearby"],
      recommendation: "Improve shaded pedestrian connections between the centre and outer blocks.",
    }),
  ];
}

// ---------------------------------------------------------------------------
// Result assembly
// ---------------------------------------------------------------------------

export function runDemoAnalysis(data: SpatialDataset, generatedAt: string): AnalysisResult {
  const profile = ANALYSIS_PROFILES[data.projectId] ?? ANALYSIS_PROFILES["smart-city-masterplan"];
  const zones = buildZones(data);
  const { overlays, maxHeight } = buildOverlays(data, zones, profile, data.projectId);
  const buildings = data.objects.filter((o): o is BuildingObject => o.type === "building");
  const roads = data.objects.filter((o): o is RoadObject => o.type === "road" && !o.id.startsWith("ctx-"));

  // road hierarchy + intersections (demo geometry)
  const classes = ["Arterial", "Collector", "Local", "Pedestrian"];
  const roadsByClass = classes
    .map((label) => ({ label, km: round1(roads.filter((r) => r.properties.roadClass === label).reduce((s, r) => s + polylineLength(r.geometry.points), 0) / 1000) }))
    .filter((r) => r.km > 0);
  let intersections = 0;
  for (let i = 0; i < roads.length; i++) for (let j = i + 1; j < roads.length; j++) {
    const a = roads[i].geometry.points;
    const b = roads[j].geometry.points;
    for (let k = 1; k < a.length; k++) for (let l = 1; l < b.length; l++) if (segmentsIntersect(a[k - 1], a[k], b[l - 1], b[l])) intersections++;
  }

  const avgFloors = buildings.length ? buildings.reduce((s, b) => s + b.properties.floors, 0) / buildings.length : 0;
  const avgM = buildings.length ? buildings.reduce((s, b) => s + b.properties.height, 0) / buildings.length : 0;
  const tallest = buildings.reduce<BuildingObject | null>((t, b) => (!t || b.properties.height > t.properties.height ? b : t), null);
  const over10Pct = buildings.length ? (buildings.filter((b) => b.properties.floors >= 10).length / buildings.length) * 100 : 0;

  const metrics = buildMetrics(data, profile, roadsByClass, intersections, { avgFloors, avgM, tallest, over10Pct });

  // density distribution by floor band
  const bands: [string, number, number][] = [["1–3", 1, 3], ["4–7", 4, 7], ["8–12", 8, 12], ["13–20", 13, 20], ["21+", 21, 999]];
  const densityDistribution = bands.map(([band, lo, hi]) => {
    const n = buildings.filter((b) => b.properties.floors >= lo && b.properties.floors <= hi).length;
    return { band, buildings: n, share: buildings.length ? Math.round((n / buildings.length) * 100) : 0 };
  });

  const landUse = [
    { landUse: "Residential", share: profile.landUse.residential, color: LAND_USE_STYLE.Residential.stroke },
    { landUse: "Commercial", share: profile.landUse.commercial, color: LAND_USE_STYLE.Commercial.stroke },
    { landUse: "Mixed Use", share: profile.landUse.mixed, color: LAND_USE_STYLE["Mixed Use"].stroke },
    { landUse: "Public / Civic", share: profile.landUse.civic, color: LAND_USE_STYLE.Civic.stroke },
    { landUse: "Green", share: profile.landUse.green, color: "#22C55E" },
    { landUse: "Infrastructure", share: profile.landUse.infrastructure, color: "#94A3B8" },
  ];

  // findings — derived from the overlays + headline numbers
  const site = data.siteBounds;
  const hottest = clusterPosition(overlays.find((o) => o.id === "heat")!.zones, site);
  const walkBest = clusterPosition(overlays.find((o) => o.id === "walkability")!.zones, site);
  const greenGap = round1(profile.green.target - data.summary.greenCoveragePct);
  const findings: AnalysisFinding[] = [];
  findings.push(
    greenGap > 0
      ? { id: "f-green", category: "green", status: "attention", text: `Green coverage (${data.summary.greenCoveragePct}%) is below the current sustainability target of ${profile.green.target}%.` }
      : { id: "f-green", category: "green", status: "good", text: `Green coverage (${data.summary.greenCoveragePct}%) meets the ${profile.green.target}% sustainability target.` }
  );
  if (hottest) findings.push({ id: "f-heat", category: "heat", status: profile.heat.risk === "Low" ? "moderate" : "attention", text: `${cap(hottest.position)} development zones show higher heat exposure (peak in ${hottest.peak.id.replace("zone-", "Zone ")}).` });
  findings.push({ id: "f-solar", category: "solar", status: profile.solar.high + profile.solar.moderate >= 70 ? "good" : "moderate", text: profile.solar.high + profile.solar.moderate >= 70 ? "Most buildings have good solar exposure." : "Solar exposure is limited in the denser blocks." });
  if (walkBest) {
    const dominant = dominantUse(buildings, walkBest.peak.bounds);
    findings.push({ id: "f-walk", category: "walkability", status: "good", text: `Walkability is strongest around the ${walkBest.position} ${dominant ? dominant.toLowerCase() : "mixed-use"} area.` });
  }
  if (profile.wind.higher >= 15) findings.push({ id: "f-wind", category: "wind", status: "moderate", text: `${profile.wind.higher}% of the site sees higher wind speeds, mainly at ${profile.wind.concern.toLowerCase()}.` });
  findings.push({ id: "f-carbon", category: "carbon", status: profile.carbon.performance >= 75 ? "good" : "moderate", text: `Buildings are the largest estimated carbon contributor (${profile.carbon.buildings}%), ahead of mobility (${profile.carbon.mobility}%).` });

  const considerations: PlanningConsideration[] = [];
  if (greenGap > 0) considerations.push({ id: "c-corridors", category: "green", title: "Increase green corridors", detail: `Closing the ${greenGap} pp gap needs roughly ${round1((greenGap / 100) * data.summary.siteAreaHa)} ha of additional green — street trees and linked courtyards are the quickest wins.` });
  if (profile.heat.risk !== "Low") considerations.push({ id: "c-shade", category: "heat", title: "Improve shaded pedestrian connections", detail: "Continuous canopy or arcades along the main east–west routes reduce exposure where people walk most." });
  if (profile.heat.high >= 12) considerations.push({ id: "c-heat", category: "heat", title: "Review high-density heat zones", detail: `The high-heat class covers ${profile.heat.high}% of the site; consider lighter surfaces and planting in those blocks.` });
  considerations.push({ id: "c-solar", category: "solar", title: "Preserve high-solar-exposure areas", detail: `${profile.solar.high}% of the site has high exposure — keep these areas for housing, schools and rooftop generation.` });
  if (profile.wind.higher >= 15) considerations.push({ id: "c-wind", category: "wind", title: "Soften high-rise edges", detail: "Podiums, setbacks and windbreak planting at tall building corners keep pedestrian comfort within range." });
  if (profile.carbon.performance < 75) considerations.push({ id: "c-carbon", category: "carbon", title: "Prioritise low-carbon building systems", detail: "The largest commercial volumes dominate the estimate; efficient envelopes and shared energy make the biggest difference." });
  if (profile.openSpace.within5 < 70) considerations.push({ id: "c-open", category: "openspace", title: "Improve open-space reach in outer blocks", detail: `${100 - profile.openSpace.within5}% of the site is more than 5 minutes from open space — pocket parks close that gap.` });

  // "Environmental Score" is the product-wide name for the composite (see Project Details).
  const comparison: ComparisonRow[] = [
    { id: "cmp-overall", label: "Environmental Score", current: profile.overall, baseline: profile.baseline.overall, unit: "score", higherIsBetter: true },
    { id: "cmp-green", label: "Green Coverage", current: data.summary.greenCoveragePct, baseline: profile.baseline.greenCoverage, unit: "percent", higherIsBetter: true },
    { id: "cmp-walk", label: "Walkability", current: profile.mobility.walkability, baseline: profile.baseline.walkability, unit: "score", higherIsBetter: true },
    { id: "cmp-carbon", label: "Carbon Performance", current: profile.carbon.performance, baseline: profile.baseline.carbon, unit: "score", higherIsBetter: true },
    { id: "cmp-heat", label: "Heat Index", current: profile.heat.index, baseline: profile.baseline.heatIndex, unit: "score", higherIsBetter: false },
    { id: "cmp-wind", label: "Wind Comfort", current: profile.wind.comfort, baseline: profile.baseline.windComfort, unit: "score", higherIsBetter: true },
  ];

  // demo revision trend: baseline → current with a deterministic wobble
  const labels = ["Concept", "Rev A", "Rev B", "Rev C", "Rev D", "Current"];
  const trend = labels.map((label, i) => {
    const t = i / (labels.length - 1);
    const e = 1 - Math.pow(1 - t, 2);
    const w = i === 0 || i === labels.length - 1 ? 0 : (noise(`${data.projectId}:trend:${i}`) - 0.5) * 3;
    return {
      label,
      environment: Math.round(profile.baseline.environment + (profile.breakdown.environment - profile.baseline.environment) * e + w),
      carbon: Math.round(profile.baseline.carbon + (profile.carbon.performance - profile.baseline.carbon) * e + w),
      green: round1(profile.baseline.greenCoverage + (data.summary.greenCoveragePct - profile.baseline.greenCoverage) * e + w * 0.4),
    };
  });

  return {
    projectId: data.projectId,
    projectName: data.projectName,
    overallScore: profile.overall,
    breakdown: [
      { id: "environment", label: "Environment", score: profile.breakdown.environment, category: "solar" },
      { id: "mobility", label: "Mobility", score: profile.breakdown.mobility, category: "accessibility" },
      { id: "urbanform", label: "Urban Form", score: profile.breakdown.urbanform, category: "density" },
      { id: "green", label: "Green Infrastructure", score: profile.breakdown.green, category: "green" },
      { id: "carbon", label: "Carbon", score: profile.breakdown.carbon, category: "carbon" },
    ],
    metrics,
    overlays,
    findings,
    considerations,
    comparison,
    trend,
    densityDistribution,
    landUse,
    zones: zones.map((z) => ({ id: z.id, bounds: z.bounds, coverage: z.coverage })),
    generatedAt,
    engine: { kind: "demo", version: ENGINE_VERSION, note: `Demo heuristics over the plan geometry (max height ${Math.round(maxHeight)} m) — not a physical simulation` },
  };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function dominantUse(buildings: BuildingObject[], bounds: Bounds): string | null {
  const counts = new Map<string, number>();
  for (const b of buildings) {
    const c = b.geometry.center;
    if (c.x >= bounds.x && c.x < bounds.x + bounds.width && c.y >= bounds.y && c.y < bounds.y + bounds.height) counts.set(b.properties.landUse, (counts.get(b.properties.landUse) ?? 0) + 1);
  }
  let best: string | null = null;
  let n = 0;
  for (const [k, v] of counts) if (v > n) { best = k; n = v; }
  return best;
}

// ---------------------------------------------------------------------------
// Zone detail (right panel when a zone is selected)
// ---------------------------------------------------------------------------

export function zoneDetail(result: AnalysisResult, data: SpatialDataset, zoneId: string): ZoneDetail | null {
  const zone = result.zones.find((z) => z.id === zoneId);
  if (!zone) return null;
  const profile = ANALYSIS_PROFILES[data.projectId] ?? ANALYSIS_PROFILES["smart-city-masterplan"];
  const v = (overlayId: string) => result.overlays.find((o) => o.id === overlayId)?.zones.find((z) => z.id === zoneId)?.value ?? 0;
  const buildings = data.objects.filter((o): o is BuildingObject => {
    if (o.type !== "building") return false;
    const c = o.geometry.center;
    return c.x >= zone.bounds.x && c.x < zone.bounds.x + zone.bounds.width && c.y >= zone.bounds.y && c.y < zone.bounds.y + zone.bounds.height;
  });
  const areaM2 = zone.bounds.width * zone.bounds.height * zone.coverage;
  const floorM2 = buildings.reduce((s, b) => s + b.properties.footprint * b.properties.floors, 0);
  const rawFar = areaM2 > 0 ? floorM2 / areaM2 : 0;
  // Scale so the densest zone reports the profile's featured FAR / population (documented walkthrough values).
  const densityOverlay = result.overlays.find((o) => o.id === "density")!;
  const densestId = focusZoneId(result, data, "density");
  const densest = densestId ? densityOverlay.zones.find((z) => z.id === densestId) ?? null : null;
  const isFeatured = densest?.id === zoneId;
  const densestFar = densest ? Math.max(0.01, farOf(result, data, densest.id)) : 1;
  const densestPop = densest ? Math.max(1, popOf(data, densest.bounds)) : 1;
  const far = isFeatured ? profile.featuredZone.far : round1((rawFar / densestFar) * profile.featuredZone.far * 100) / 100 || round1(rawFar * 100) / 100;
  const rawPop = buildings.reduce((s, b) => s + b.properties.populationCapacity, 0);
  const population = isFeatured ? profile.featuredZone.population : Math.round((rawPop / densestPop) * profile.featuredZone.population / 10) * 10;
  const rawAvgFloors = buildings.length ? buildings.reduce((s, b) => s + b.properties.floors, 0) / buildings.length : 0;
  const avgFloors = isFeatured ? profile.featuredZone.avgFloors : Math.round(rawAvgFloors);
  const dv = densityOverlay.zones.find((z) => z.id === zoneId)?.value ?? 0;
  const density: ZoneDetail["density"] = dv >= 0.7 ? "High" : dv >= 0.35 ? "Medium" : "Low";
  // The solar walkthrough value belongs to the brightest developed zone, not the densest one.
  const solar = focusZoneId(result, data, "solar") === zoneId ? profile.featuredZone.solar : Math.round(45 + v("solar") * 55);
  const mix = new Map<string, number>();
  for (const b of buildings) mix.set(b.properties.landUse, (mix.get(b.properties.landUse) ?? 0) + 1);
  const landUseMix = [...mix.entries()].map(([landUse, n]) => ({ landUse, share: Math.round((n / Math.max(1, buildings.length)) * 100) })).sort((a, b) => b.share - a.share);
  return {
    zoneId,
    label: `${zoneId.replace("zone-", "Zone ")} · ${zonePosition(zone.bounds, data.siteBounds)}`,
    solar,
    heat: Math.round(35 + v("heat") * 60),
    wind: Math.round(100 - Math.abs(v("wind") - 0.5) * 120),
    density,
    far,
    avgFloors,
    populationCapacity: population,
    greenShare: Math.round(v("green") * (result.overlays.find((o) => o.id === "green")?.max ?? 30)),
    walkMinutesToOpenSpace: round1(v("openspace") * 12),
    buildingCount: buildings.length,
    landUseMix,
  };
}

function farOf(result: AnalysisResult, data: SpatialDataset, zoneId: string): number {
  const zone = result.zones.find((z) => z.id === zoneId);
  if (!zone) return 0;
  const areaM2 = zone.bounds.width * zone.bounds.height * zone.coverage;
  const floorM2 = data.objects.reduce((s, o) => {
    if (o.type !== "building") return s;
    const c = o.geometry.center;
    return c.x >= zone.bounds.x && c.x < zone.bounds.x + zone.bounds.width && c.y >= zone.bounds.y && c.y < zone.bounds.y + zone.bounds.height ? s + o.properties.footprint * o.properties.floors : s;
  }, 0);
  return areaM2 > 0 ? floorM2 / areaM2 : 0;
}

function popOf(data: SpatialDataset, bounds: Bounds): number {
  return data.objects.reduce((s, o) => {
    if (o.type !== "building") return s;
    const c = o.geometry.center;
    return c.x >= bounds.x && c.x < bounds.x + bounds.width && c.y >= bounds.y && c.y < bounds.y + bounds.height ? s + o.properties.populationCapacity : s;
  }, 0);
}

/** Id of the densest zone — used as the discoverable "focus zone" on the map. */
/**
 * The zone the map suggests inspecting for an overlay: its peak cell among
 * zones that contain at least one building and sit mostly inside the site.
 * Also anchors the documented walkthrough values (see `zoneDetail`).
 */
export function focusZoneId(result: AnalysisResult, data: SpatialDataset, overlayId: string): string | null {
  const overlay = result.overlays.find((o) => o.id === overlayId);
  if (!overlay || overlay.zones.length === 0) return null;
  const built = new Set<string>();
  for (const o of data.objects) {
    if (o.type !== "building") continue;
    const c = o.geometry.center;
    for (const z of overlay.zones) {
      if (built.has(z.id)) continue;
      if (c.x >= z.bounds.x && c.x < z.bounds.x + z.bounds.width && c.y >= z.bounds.y && c.y < z.bounds.y + z.bounds.height) {
        built.add(z.id);
        break;
      }
    }
  }
  const candidates = overlay.zones.filter((z) => built.has(z.id) && z.coverage > 0.5);
  const pool = candidates.length > 0 ? candidates : overlay.zones;
  return pool.reduce<ZoneCell | null>((m, z) => (!m || z.value > m.value ? z : m), null)?.id ?? null;
}

/** Colour for a normalised value on a ramp (piecewise-linear interpolation). */
export function rampColor(ramp: string[], t: number): string {
  const x = clamp01(t) * (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(x));
  const f = x - i;
  const a = hexToRgb(ramp[i]);
  const b = hexToRgb(ramp[i + 1]);
  const mix = a.map((c, k) => Math.round(c + (b[k] - c) * f));
  return `#${mix.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
