import type { AreaObject, BuildingDensity, BuildingObject, LabelObject, LandUse, LayerVisibility, LinearObject, ObjectStatus, PlanningDocument, PlanningObject, Point, SiteDefinition, Bounds } from "../types/planning.types";
import { blobPolygon, boundsOf, pointInPolygon, polylineLength, rectPolygon, distance } from "../lib/geometry";

/**
 * DEMO planning data.
 *
 * Each demo project gets a procedurally generated — but deterministic — site
 * plan: boundary, street grid, blocks, buildings, parks, water and surrounding
 * context. The generator is seeded per project so reloads are stable. None of
 * this is real GIS data; it exists so the studio's interactions can be built
 * and tested before the GIS module lands (GET /api/projects/:id/plan).
 */

// ---------------------------------------------------------------------------
// Deterministic PRNG (mulberry32)
// ---------------------------------------------------------------------------

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Per-project recipes
// ---------------------------------------------------------------------------

export interface PlanningProjectRecipe {
  projectId: string;
  name: string;
  seed: number;
  /** Site width/height in metres. */
  sizeM: { w: number; h: number };
  /** Number of street grid divisions. */
  grid: { cols: number; rows: number };
  /** Bias for building land use. */
  useMix: Partial<Record<LandUse, number>>;
  /** Typical floors [min, max]. */
  floors: [number, number];
  /** Fraction of blocks reserved for parks. */
  parkRatio: number;
  water: "river" | "lake" | "coast" | "none";
  /** Fraction of buildings that are existing (rest proposed). */
  existingRatio: number;
  /** Read-only headline metrics shown in Site Information (demo values). */
  siteInfo: {
    siteAreaHa: number;
    buildings: number;
    greenCoveragePct: number;
    roadNetworkKm: number;
    populationCapacity: number;
    environmentalScore: number;
  };
}

/** Demo projects the studio can open (ids match the Projects module). */
export const PLANNING_RECIPES: PlanningProjectRecipe[] = [
  {
    projectId: "smart-city-masterplan",
    name: "Smart City Masterplan",
    seed: 11,
    sizeM: { w: 860, h: 600 },
    grid: { cols: 5, rows: 4 },
    useMix: { Residential: 0.42, "Mixed Use": 0.22, Commercial: 0.18, Civic: 0.08, Institutional: 0.1 },
    floors: [4, 14],
    parkRatio: 0.18,
    water: "river",
    existingRatio: 0.25,
    siteInfo: { siteAreaHa: 51.0, buildings: 148, greenCoveragePct: 22.3, roadNetworkKm: 18.6, populationCapacity: 12_480, environmentalScore: 84 },
  },
  {
    projectId: "marina-south-innovation-district",
    name: "Marina South Innovation District",
    seed: 23,
    sizeM: { w: 700, h: 420 },
    grid: { cols: 4, rows: 3 },
    useMix: { Commercial: 0.4, "Mixed Use": 0.3, Institutional: 0.15, Residential: 0.1, Civic: 0.05 },
    floors: [8, 24],
    parkRatio: 0.16,
    water: "coast",
    existingRatio: 0.1,
    siteInfo: { siteAreaHa: 24.5, buildings: 86, greenCoveragePct: 18.0, roadNetworkKm: 9.4, populationCapacity: 6_900, environmentalScore: 78 },
  },
  {
    projectId: "riverside-quarter",
    name: "Riverside Quarter",
    seed: 37,
    sizeM: { w: 520, h: 360 },
    grid: { cols: 4, rows: 3 },
    useMix: { Residential: 0.6, "Mixed Use": 0.2, Civic: 0.1, Commercial: 0.1 },
    floors: [3, 7],
    parkRatio: 0.25,
    water: "river",
    existingRatio: 0.35,
    siteInfo: { siteAreaHa: 12.8, buildings: 64, greenCoveragePct: 31.0, roadNetworkKm: 6.1, populationCapacity: 3_400, environmentalScore: 88 },
  },
  {
    projectId: "greenfield-new-town",
    name: "Greenfield New Town",
    seed: 41,
    sizeM: { w: 1200, h: 900 },
    grid: { cols: 6, rows: 5 },
    useMix: { Residential: 0.62, "Mixed Use": 0.12, Commercial: 0.1, Civic: 0.08, Institutional: 0.08 },
    floors: [2, 8],
    parkRatio: 0.22,
    water: "lake",
    existingRatio: 0.05,
    siteInfo: { siteAreaHa: 140.0, buildings: 312, greenCoveragePct: 14.5, roadNetworkKm: 41.2, populationCapacity: 38_000, environmentalScore: 66 },
  },
  {
    projectId: "harbor-living",
    name: "Harbor Living",
    seed: 53,
    sizeM: { w: 420, h: 300 },
    grid: { cols: 3, rows: 3 },
    useMix: { Residential: 0.7, "Mixed Use": 0.2, Civic: 0.1 },
    floors: [4, 9],
    parkRatio: 0.2,
    water: "coast",
    existingRatio: 0.8,
    siteInfo: { siteAreaHa: 9.4, buildings: 42, greenCoveragePct: 27.6, roadNetworkKm: 3.8, populationCapacity: 2_600, environmentalScore: 90 },
  },
  {
    projectId: "tech-park-expansion",
    name: "Tech Park Expansion",
    seed: 61,
    sizeM: { w: 620, h: 400 },
    grid: { cols: 4, rows: 3 },
    useMix: { Commercial: 0.55, Institutional: 0.2, "Mixed Use": 0.15, Civic: 0.1 },
    floors: [5, 12],
    parkRatio: 0.15,
    water: "none",
    existingRatio: 0.45,
    siteInfo: { siteAreaHa: 18.2, buildings: 58, greenCoveragePct: 20.0, roadNetworkKm: 7.2, populationCapacity: 9_800, environmentalScore: 74 },
  },
  {
    projectId: "waterfront-promenade",
    name: "Waterfront Promenade",
    seed: 71,
    sizeM: { w: 560, h: 240 },
    grid: { cols: 5, rows: 2 },
    useMix: { "Mixed Use": 0.4, Commercial: 0.3, Civic: 0.2, Residential: 0.1 },
    floors: [2, 6],
    parkRatio: 0.3,
    water: "coast",
    existingRatio: 0.5,
    siteInfo: { siteAreaHa: 7.6, buildings: 28, greenCoveragePct: 34.0, roadNetworkKm: 3.1, populationCapacity: 1_200, environmentalScore: 86 },
  },
  {
    projectId: "central-station-area",
    name: "Central Station Area",
    seed: 83,
    sizeM: { w: 760, h: 480 },
    grid: { cols: 5, rows: 3 },
    useMix: { "Mixed Use": 0.35, Commercial: 0.3, Residential: 0.2, Civic: 0.1, Institutional: 0.05 },
    floors: [6, 22],
    parkRatio: 0.12,
    water: "none",
    existingRatio: 0.6,
    siteInfo: { siteAreaHa: 33.0, buildings: 96, greenCoveragePct: 12.0, roadNetworkKm: 11.9, populationCapacity: 15_600, environmentalScore: 62 },
  },
  {
    projectId: "logistics-hub",
    name: "Logistics Hub Masterplan",
    seed: 97,
    sizeM: { w: 1100, h: 800 },
    grid: { cols: 4, rows: 3 },
    useMix: { Industrial: 0.7, Commercial: 0.2, Civic: 0.1 },
    floors: [1, 3],
    parkRatio: 0.1,
    water: "none",
    existingRatio: 0.3,
    siteInfo: { siteAreaHa: 96.0, buildings: 54, greenCoveragePct: 16.0, roadNetworkKm: 22.4, populationCapacity: 4_100, environmentalScore: 70 },
  },
  {
    projectId: "riverside-town-archive",
    name: "Riverside Town Concept",
    seed: 101,
    sizeM: { w: 540, h: 380 },
    grid: { cols: 4, rows: 3 },
    useMix: { Residential: 0.65, "Mixed Use": 0.15, Civic: 0.1, Commercial: 0.1 },
    floors: [2, 6],
    parkRatio: 0.2,
    water: "river",
    existingRatio: 0.2,
    siteInfo: { siteAreaHa: 15.0, buildings: 70, greenCoveragePct: 15.0, roadNetworkKm: 6.4, populationCapacity: 3_900, environmentalScore: 68 },
  },
];

export const DEFAULT_LAYERS: LayerVisibility = {
  roads: true,
  buildings: true,
  green: true,
  water: true,
  terrain: true,
  transit: false,
  utilities: false,
};

/** Margin of surrounding context drawn around the site (metres). */
const CONTEXT_MARGIN = 220;

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

function pickUse(rand: () => number, mix: Partial<Record<LandUse, number>>): LandUse {
  const entries = Object.entries(mix) as [LandUse, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [use, w] of entries) {
    r -= w;
    if (r <= 0) return use;
  }
  return entries[0][0];
}

function densityFor(floors: number): BuildingDensity {
  if (floors <= 3) return "Low";
  if (floors < 8) return "Medium";
  return "High";
}

function statusFor(rand: () => number, existingRatio: number): ObjectStatus {
  const r = rand();
  if (r < existingRatio) return "Existing";
  if (r < existingRatio + 0.1) return "Approved";
  if (r < existingRatio + 0.18) return "Under Review";
  return "Proposed";
}

function pad(n: number): string {
  return n.toString().padStart(3, "0");
}

interface Generated {
  site: SiteDefinition;
  objects: PlanningObject[];
}

function generate(recipe: PlanningProjectRecipe): Generated {
  const rand = rng(recipe.seed);
  const { w: W, h: H } = recipe.sizeM;
  const ox = CONTEXT_MARGIN;
  const oy = CONTEXT_MARGIN;

  // --- boundary: a softened rectangle with two chamfered corners ------------
  const chamfer = Math.min(W, H) * 0.14;
  const boundary: Point[] = [
    { x: ox + chamfer, y: oy },
    { x: ox + W, y: oy },
    { x: ox + W, y: oy + H - chamfer * 1.4 },
    { x: ox + W - chamfer * 1.4, y: oy + H },
    { x: ox, y: oy + H },
    { x: ox, y: oy + chamfer },
  ];
  const bounds = boundsOf(boundary);
  const world = { x: 0, y: 0, width: W + CONTEXT_MARGIN * 2, height: H + CONTEXT_MARGIN * 2 };

  const objects: PlanningObject[] = [];
  let bIndex = 0;
  let gIndex = 0;

  // --- water feature ----------------------------------------------------------
  let waterPoly: Point[] | null = null;
  if (recipe.water === "river") {
    // A gently meandering corridor aligned with a cross-street line (rows * 0.7 → between rows)
    const rowLine = Math.max(1, Math.round(recipe.grid.rows * 0.7));
    const yBase = oy + (rowLine * H) / recipe.grid.rows; // same line the street grid skips (riverRow)
    const top: Point[] = [];
    const bottom: Point[] = [];
    const steps = 9;
    for (let i = 0; i <= steps; i++) {
      const x = i / steps;
      const wave = Math.sin(x * Math.PI * 1.6 + recipe.seed) * 10;
      top.push({ x: x * world.width, y: yBase + wave - 16 });
      bottom.push({ x: x * world.width, y: yBase + wave + 16 });
    }
    waterPoly = [...top, ...bottom.reverse()];
  } else if (recipe.water === "lake") {
    waterPoly = blobPolygon(ox + W * 0.72, oy + H * 0.36, W * 0.11, H * 0.1, 16, 0.14, recipe.seed);
  } else if (recipe.water === "coast") {
    const yBase = oy + H * 0.86;
    const top: Point[] = [];
    for (let i = 0; i <= 8; i++) {
      const x = i / 8;
      top.push({ x: x * world.width, y: yBase + Math.sin(x * Math.PI * 2.2 + recipe.seed) * H * 0.035 });
    }
    waterPoly = [...top, { x: world.width, y: world.height }, { x: 0, y: world.height }];
  }
  if (waterPoly) {
    objects.push({
      id: "water-1",
      type: "water",
      name: recipe.water === "river" ? "River corridor" : recipe.water === "lake" ? "Central lake" : "Waterfront",
      x: 0,
      y: 0,
      points: waterPoly,
      properties: { category: recipe.water === "river" ? "River" : recipe.water === "lake" ? "Lake" : "Sea", status: "Existing" },
    } satisfies AreaObject);
  }

  // --- street grid ------------------------------------------------------------
  const cols = recipe.grid.cols;
  const rows = recipe.grid.rows;
  const cellW = W / cols;
  const cellH = H / rows;
  const streets: LinearObject[] = [];
  const ROAD_W = 14;

  /** True when a rectangle (centre + corners) is inside the site and on dry land. */
  const rectOnLand = (cx: number, cy: number, w: number, h: number): boolean => {
    const pts = [
      { x: cx, y: cy },
      { x: cx - w / 2, y: cy - h / 2 },
      { x: cx + w / 2, y: cy - h / 2 },
      { x: cx - w / 2, y: cy + h / 2 },
      { x: cx + w / 2, y: cy + h / 2 },
    ];
    return pts.every((q) => pointInPolygon(q, boundary) && !(waterPoly && pointInPolygon(q, waterPoly)));
  };

  /**
   * Split a straight street into the runs that lie inside the site and on dry
   * land. Rivers are bridged (not clipped); the sea and lakes end a street on
   * the quay/shore, so a street may come back as several segments.
   */
  const clipsWater = recipe.water === "coast" || recipe.water === "lake";
  const clipStreet = (a: Point, b: Point): Point[][] => {
    const dry = (p: Point) => pointInPolygon(p, boundary) && !(clipsWater && waterPoly && pointInPolygon(p, waterPoly));
    const lerp = (t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    const steps = 96;
    const runs: [number, number][] = [];
    let runStart = -1;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const isDry = dry(lerp(t));
      if (isDry && runStart < 0) runStart = t;
      if ((!isDry || i === steps) && runStart >= 0) {
        runs.push([runStart, isDry ? t : (i - 1) / steps]);
        runStart = -1;
      }
    }
    const refine = (tDry: number, tWet: number): number => {
      for (let k = 0; k < 10; k++) {
        const m = (tDry + tWet) / 2;
        if (dry(lerp(m))) tDry = m;
        else tWet = m;
      }
      return tDry;
    };
    const len = distance(a, b) || 1;
    const setback = (ROAD_W * 0.9) / len;
    const wetAt = (t: number) => !!(clipsWater && waterPoly && pointInPolygon(lerp(Math.max(0, Math.min(1, t))), waterPoly));
    const segments: Point[][] = [];
    for (const [tf, tl] of runs) {
      const t0 = tf > 0 ? refine(tf, tf - 1 / steps) : 0;
      const t1 = tl < 1 ? refine(tl, tl + 1 / steps) : 1;
      // a street that meets water stops on the quay, not in the water
      const s0 = t0 > 0 && wetAt(t0 - 1 / steps) ? Math.min(t1, t0 + setback) : t0;
      const s1 = t1 < 1 && wetAt(t1 + 1 / steps) ? Math.max(t0, t1 - setback) : t1;
      const p0 = lerp(s0);
      const p1 = lerp(s1);
      if (distance(p0, p1) >= Math.min(cellW, cellH) * 0.6) segments.push([p0, p1]);
    }
    return segments;
  };

  const suffix = (n: number, i: number) => (n > 1 ? String.fromCharCode(97 + i) : "");
  for (let c = 1; c < cols; c++) {
    const x = ox + c * cellW;
    const segs = clipStreet({ x, y: oy - 1 }, { x, y: oy + H + 1 });
    segs.forEach((pts, i) => {
      streets.push({
        id: `road-v${c}${suffix(segs.length, i)}`,
        type: "road",
        name: `${c % 2 === 0 ? "Avenue" : "Street"} ${String.fromCharCode(64 + c)}${segs.length > 1 ? ` (${i + 1})` : ""}`,
        x,
        y: (pts[0].y + pts[1].y) / 2,
        points: pts,
        width: c % 2 === 0 ? ROAD_W + 6 : ROAD_W,
        properties: { roadClass: c % 2 === 0 ? "Collector" : "Local", lanes: c % 2 === 0 ? 4 : 2, status: "Proposed" },
      });
    });
  }
  const riverRow = recipe.water === "river" ? Math.max(1, Math.round(recipe.grid.rows * 0.7)) : -1;
  for (let r = 1; r < rows; r++) {
    if (r === riverRow) continue; // the river corridor replaces this cross street (avenues bridge it)
    const y = oy + r * cellH;
    const segs = clipStreet({ x: ox - 1, y }, { x: ox + W + 1, y });
    const arterial = r === Math.ceil(rows / 2);
    segs.forEach((pts, i) => {
      streets.push({
        id: `road-h${r}${suffix(segs.length, i)}`,
        type: "road",
        name: `${arterial ? "Central Boulevard" : `${r}${r === 1 ? "st" : r === 2 ? "nd" : r === 3 ? "rd" : "th"} Cross Road`}${segs.length > 1 ? ` (${i + 1})` : ""}`,
        x: (pts[0].x + pts[1].x) / 2,
        y,
        points: pts,
        width: arterial ? ROAD_W + 10 : ROAD_W,
        properties: { roadClass: arterial ? "Arterial" : "Local", lanes: arterial ? 4 : 2, status: "Proposed" },
      });
    });
  }
  objects.push(...streets);

  // --- blocks → parks, plazas, parking, buildings ------------------------------
  const inset = ROAD_W;
  const [fMin, fMax] = recipe.floors;

  const blockKinds: ("park" | "plaza" | "parking" | "buildings")[] = [];
  const nBlocks = cols * rows;
  const nParks = Math.max(1, Math.round(nBlocks * recipe.parkRatio));
  for (let i = 0; i < nBlocks; i++) blockKinds.push("buildings");
  // parks spread out deterministically
  for (let i = 0; i < nParks; i++) blockKinds[Math.floor(((i + 0.5) / nParks) * nBlocks)] = "park";
  blockKinds[Math.floor(nBlocks / 2)] = blockKinds[Math.floor(nBlocks / 2)] === "park" ? "park" : "plaza";
  if (nBlocks > 8) blockKinds[nBlocks - 1] = "parking";

  const treeZonePolys: Point[][] = [];

  // Greenway (diagonal pedestrian spine) — defined up-front so buildings keep clear of it.
  const greenwayPts: Point[] = [
    { x: ox + 20, y: oy + H * 0.2 },
    { x: ox + W * 0.35, y: oy + H * 0.42 },
    { x: ox + W * 0.62, y: oy + H * 0.46 },
    { x: ox + W - 20, y: oy + H * 0.3 },
  ].filter((p) => pointInPolygon(p, boundary) && !(waterPoly && pointInPolygon(p, waterPoly)));
  const distToGreenway = (p: Point): number => {
    let best = Infinity;
    for (let i = 1; i < greenwayPts.length; i++) {
      const a = greenwayPts[i - 1];
      const b = greenwayPts[i];
      const vx = b.x - a.x;
      const vy = b.y - a.y;
      const len2 = vx * vx + vy * vy || 1;
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2));
      best = Math.min(best, Math.hypot(p.x - (a.x + vx * t), p.y - (a.y + vy * t)));
    }
    return best;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bx = ox + c * cellW + inset;
      const by = oy + r * cellH + inset;
      const bw = cellW - inset * 2;
      const bh = cellH - inset * 2;
      const center = { x: bx + bw / 2, y: by + bh / 2 };

      // skip blocks outside the chamfered boundary or mostly under water
      if (!pointInPolygon(center, boundary)) continue;
      if (waterPoly && pointInPolygon(center, waterPoly)) continue;
      const wetCorners = waterPoly
        ? [{ x: bx, y: by }, { x: bx + bw, y: by }, { x: bx, y: by + bh }, { x: bx + bw, y: by + bh }].filter((k) => pointInPolygon(k, waterPoly)).length
        : 0;
      if (wetCorners >= 3) continue;

      const kind = blockKinds[r * cols + c];

      const wholeBlockDry = rectOnLand(center.x, center.y, bw, bh);
      const effectiveKind = kind === "buildings" || wholeBlockDry ? kind : "buildings";

      if (effectiveKind === "park") {
        gIndex++;
        objects.push({
          id: `green-${gIndex}`,
          type: "green",
          name: gIndex === 1 ? "Central Park" : `Neighbourhood Park ${gIndex}`,
          x: center.x,
          y: center.y,
          points: rectPolygon(center.x, center.y, bw, bh),
          properties: { category: "Park", status: "Proposed" },
        } satisfies AreaObject);
        treeZonePolys.push(blobPolygon(center.x - bw * 0.2, center.y + bh * 0.15, bw * 0.22, bh * 0.28, 12, 0.18, recipe.seed + gIndex));
        continue;
      }
      if (effectiveKind === "plaza") {
        objects.push({
          id: "plaza-1",
          type: "public-space",
          name: "Civic Plaza",
          x: center.x,
          y: center.y,
          points: rectPolygon(center.x, center.y, bw, bh),
          properties: { category: "Plaza", status: "Proposed" },
        } satisfies AreaObject);
        // a civic building on the plaza (on whichever half is clear of the greenway)
        bIndex++;
        const fl = Math.max(2, Math.round(fMin + (fMax - fMin) * 0.4));
        const upper = { x: center.x, y: center.y - bh * 0.22 };
        const lower = { x: center.x, y: center.y + bh * 0.22 };
        const civicAt = distToGreenway(upper) >= distToGreenway(lower) ? upper : lower;
        objects.push({
          id: `b-${pad(bIndex)}`,
          type: "building",
          name: `B-${pad(bIndex)}`,
          x: civicAt.x,
          y: civicAt.y,
          width: bw * 0.42,
          height: bh * 0.3,
          properties: { floors: fl, height: fl * 3.6, footprint: Math.round(bw * 0.42 * bh * 0.3), landUse: "Civic", density: densityFor(fl), status: "Approved" },
        } satisfies BuildingObject);
        continue;
      }
      if (effectiveKind === "parking") {
        objects.push({
          id: "parking-1",
          type: "parking",
          name: "Surface Parking P1",
          x: center.x,
          y: center.y,
          points: rectPolygon(center.x, center.y, bw * 0.9, bh * 0.8),
          properties: { category: "Surface parking", status: "Proposed" },
        } satisfies AreaObject);
        continue;
      }

      // buildings: perimeter block with 2–5 volumes
      const n = 2 + Math.floor(rand() * 4);
      const gap = 6;
      const depth = Math.min(bh * 0.36, 34);
      for (let i = 0; i < n; i++) {
        const slotW = (bw - gap * (n - 1)) / n;
        const x = bx + i * (slotW + gap) + slotW / 2;
        const onTop = rand() > 0.35;
        const y = onTop ? by + depth / 2 : by + bh - depth / 2;
        const fl = Math.round(fMin + rand() * (fMax - fMin));
        const bwid = slotW * (0.7 + rand() * 0.3);
        const bdep = depth * (0.7 + rand() * 0.3);
        const p = { x, y };
        if (!rectOnLand(x, y, bwid, bdep)) continue;
        if (distToGreenway(p) < Math.max(bwid, bdep) * 0.6 + 6) continue; // keep the greenway clear
        bIndex++;
        objects.push({
          id: `b-${pad(bIndex)}`,
          type: "building",
          name: `B-${pad(bIndex)}`,
          x,
          y,
          width: bwid,
          height: bdep,
          rotation: 0,
          properties: {
            floors: fl,
            height: Math.round(fl * 3.5),
            footprint: Math.round(bwid * bdep),
            landUse: pickUse(rand, recipe.useMix),
            density: densityFor(fl),
            status: statusFor(rand, recipe.existingRatio),
          },
        } satisfies BuildingObject);
      }
      // a courtyard green in some blocks
      if (rand() > 0.55 && distToGreenway(center) > bh * 0.2 + 8 && rectOnLand(center.x, center.y, bw * 0.5, bh * 0.22)) {
        gIndex++;
        objects.push({
          id: `green-${gIndex}`,
          type: "green",
          name: `Courtyard Green ${gIndex}`,
          x: center.x,
          y: center.y,
          points: rectPolygon(center.x, center.y, bw * 0.5, bh * 0.22),
          properties: { category: "Courtyard", status: "Proposed" },
        } satisfies AreaObject);
      }
    }
  }

  // The documented inspector example: Building B-014 — Residential, 8 floors, 28 m, Proposed.
  const example = objects.find((o): o is BuildingObject => o.type === "building" && o.name === "B-014");
  if (example) {
    const ratio = example.width / example.height;
    const depth = Math.sqrt(1240 / ratio);
    example.width = Math.round(depth * ratio * 10) / 10;
    example.height = Math.round(depth * 10) / 10;
    example.properties = { ...example.properties, floors: 8, height: 28, footprint: 1240, landUse: "Residential", density: densityFor(8), status: "Proposed" };
  }

  treeZonePolys.forEach((poly, i) => {
    objects.push({
      id: `trees-${i + 1}`,
      type: "tree-zone",
      name: `Tree Zone ${i + 1}`,
      x: poly[0].x,
      y: poly[0].y,
      points: poly,
      properties: { category: "Tree planting", status: "Proposed" },
    } satisfies AreaObject);
  });

  // --- pedestrian paths (diagonal greenway) -------------------------------------
  if (greenwayPts.length >= 2) {
    objects.push({
      id: "path-1",
      type: "path",
      name: "Greenway",
      x: ox + W / 2,
      y: oy + H / 2,
      points: greenwayPts,
      width: 4,
      properties: { roadClass: "Pedestrian", lanes: 0, status: "Proposed" },
    } satisfies LinearObject);
  }

  // --- labels -----------------------------------------------------------------
  const labels: LabelObject[] = [
    { id: "label-site", type: "label", name: "Site label", x: ox + W * 0.5, y: oy - 26, properties: { text: recipe.name } },
    { id: "label-north", type: "label", name: "Context label", x: ox + W * 0.5, y: oy - 90, properties: { text: "Existing neighbourhood" } },
  ];
  objects.push(...labels);

  // --- surrounding context ------------------------------------------------------
  const ctxBlocks = [];
  const cRand = rng(recipe.seed + 7);
  for (let i = 0; i < 26; i++) {
    const side = i % 4;
    const bw = 40 + cRand() * 70;
    const bh = 30 + cRand() * 50;
    let x = 0;
    let y = 0;
    if (side === 0) {
      x = cRand() * (world.width - bw);
      y = 30 + cRand() * (CONTEXT_MARGIN - 110);
    } else if (side === 1) {
      x = cRand() * (world.width - bw);
      y = oy + H + 60 + cRand() * (CONTEXT_MARGIN - 110);
    } else if (side === 2) {
      x = 20 + cRand() * (CONTEXT_MARGIN - 90);
      y = cRand() * (world.height - bh);
    } else {
      x = ox + W + 50 + cRand() * (CONTEXT_MARGIN - 110);
      y = cRand() * (world.height - bh);
    }
    const rect = { x, y, width: bw, height: bh };
    if (waterPoly && pointInPolygon({ x: x + bw / 2, y: y + bh / 2 }, waterPoly)) continue;
    ctxBlocks.push(rect);
  }

  const ctxRoads = [
    { points: [{ x: 0, y: oy - 40 }, { x: world.width, y: oy - 40 }], width: 22 },
    { points: [{ x: ox - 48, y: 0 }, { x: ox - 48, y: world.height }], width: 18 },
    { points: [{ x: ox + W + 60, y: 0 }, { x: ox + W + 60, y: world.height }], width: 16 },
    { points: [{ x: 0, y: oy + H + 70 }, { x: world.width, y: oy + H + 70 }], width: 16 },
  ];

  const contours: Point[][] = [];
  for (let k = 0; k < 6; k++) {
    const line: Point[] = [];
    for (let i = 0; i <= 12; i++) {
      const x = (i / 12) * world.width;
      line.push({ x, y: 60 + k * (world.height / 6.5) + Math.sin(x / 140 + k + recipe.seed) * 26 });
    }
    contours.push(line);
  }

  const transitLine: Point[] = [
    { x: 0, y: oy - 40 },
    { x: ox + W * 0.3, y: oy - 40 },
    { x: ox + W * 0.42, y: oy + H * 0.5 },
    { x: ox + W * 0.42, y: world.height },
  ];
  const stations = [
    { point: { x: ox + W * 0.3, y: oy - 40 }, name: "North Gate" },
    { point: { x: ox + W * 0.42, y: oy + H * 0.5 }, name: `${recipe.name.split(" ")[0]} Central` },
  ];

  const utilities: Point[][] = streets
    .filter((s) => s.id.startsWith("road-h"))
    .map((s) => s.points.map((p) => ({ x: p.x, y: p.y + 5 })));

  const streetTrees: Point[] = [];
  for (let i = 0; i < 40; i++) {
    const x = ox + (i / 40) * W;
    streetTrees.push({ x, y: oy - 18 });
    if (i % 2 === 0) streetTrees.push({ x, y: oy + H + 18 });
  }

  // developable blocks (drawn as light plates under the buildings)
  const blockPlates: Bounds[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bx = ox + c * cellW + inset * 0.55;
      const by = oy + r * cellH + inset * 0.55;
      const bw = cellW - inset * 1.1;
      const bh = cellH - inset * 1.1;
      const center = { x: bx + bw / 2, y: by + bh / 2 };
      if (!pointInPolygon(center, boundary)) continue;
      if (waterPoly && pointInPolygon(center, waterPoly)) continue;
      const wet = waterPoly
        ? [{ x: bx, y: by }, { x: bx + bw, y: by }, { x: bx, y: by + bh }, { x: bx + bw, y: by + bh }].filter((k) => pointInPolygon(k, waterPoly)).length
        : 0;
      if (wet >= 3) continue;
      blockPlates.push({ x: bx, y: by, width: bw, height: bh });
    }
  }

  const site: SiteDefinition = {
    boundary,
    bounds,
    world,
    context: { blocks: ctxBlocks, roads: ctxRoads, contours, transit: { line: transitLine, stations }, utilities, streetTrees, blockPlates },
    coordinateSystem: "Demo / Local",
    boundaryStatus: "Defined",
  };

  return { site, objects };
}

// ---------------------------------------------------------------------------
// Public API used by the service
// ---------------------------------------------------------------------------

const cache = new Map<string, Generated>();

export function getRecipe(projectId: string): PlanningProjectRecipe | undefined {
  return PLANNING_RECIPES.find((r) => r.projectId === projectId);
}

export function buildDemoDocument(projectId: string): PlanningDocument | null {
  const recipe = getRecipe(projectId);
  if (!recipe) return null;
  let gen = cache.get(projectId);
  if (!gen) {
    gen = generate(recipe);
    cache.set(projectId, gen);
  }
  return {
    projectId,
    site: gen.site,
    objects: gen.objects.map((o) => ({ ...o })),
    layers: { ...DEFAULT_LAYERS },
    savedAtIso: null,
    source: "demo",
  };
}

/** Site + context for projects the studio knows only by id (e.g. user-created). */
export function buildBlankSite(sizeHa: number): SiteDefinition {
  const side = Math.sqrt(Math.max(sizeHa, 1) * 10_000);
  const W = Math.round(side * 1.25);
  const H = Math.round(side * 0.8);
  const recipe: PlanningProjectRecipe = {
    projectId: "blank",
    name: "New site",
    seed: 5,
    sizeM: { w: W, h: H },
    grid: { cols: 1, rows: 1 },
    useMix: { Residential: 1 },
    floors: [1, 1],
    parkRatio: 0,
    water: "none",
    existingRatio: 0,
    siteInfo: { siteAreaHa: sizeHa, buildings: 0, greenCoveragePct: 0, roadNetworkKm: 0, populationCapacity: 0, environmentalScore: 0 },
  };
  return generate(recipe).site;
}

/** Road network length of a document in km (roads only, not paths). */
export function roadNetworkKm(objects: PlanningObject[]): number {
  const m = objects.filter((o): o is LinearObject => o.type === "road").reduce((s, r) => s + polylineLength(r.points), 0);
  return Math.round((m / 1000) * 10) / 10;
}
