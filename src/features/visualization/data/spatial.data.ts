import type { PlanningDocument, PlanningObject } from "../../planning/types/planning.types";
import { centroid, pointInPolygon, polygonArea, polylineLength } from "../../planning/lib/geometry";
import type {
  AreaObject,
  BoundaryObject,
  BuildingObject,
  ContextBuildingObject,
  Density,
  LandUse,
  PoiObject,
  Point,
  RoadObject,
  SiteSummary,
  SpatialDataset,
  SpatialObject,
  TerrainObject,
  TransitObject,
  TreeObject,
  UtilityObject,
} from "../types/visualization.types";

/**
 * DEMO spatial data.
 *
 * The visualization consumes the same procedurally generated site model as the
 * Planning Studio (`planning.data.ts`) — including a user's locally saved plan
 * edits — and lifts it into the engine-neutral SpatialObject model, adding the
 * things a GIS view needs that a plan does not carry: trees, terrain elevation,
 * points of interest, context building heights and per-building demo
 * indicators. None of this is measured data.
 */

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

/** Typical floor bands per land use (spec §3) used when a plan gives no height. */
const FLOOR_BANDS: Record<LandUse, [number, number]> = {
  Residential: [6, 12],
  Commercial: [8, 20],
  "Mixed Use": [6, 16],
  Civic: [3, 8],
  Institutional: [3, 8],
  Industrial: [2, 4],
};

const PEOPLE_PER_M2: Record<LandUse, number> = {
  Residential: 0.0423,
  Commercial: 0.02,
  "Mixed Use": 0.028,
  Civic: 0.012,
  Institutional: 0.015,
  Industrial: 0.006,
};

function densityFor(floors: number): Density {
  return floors >= 8 ? "High" : floors >= 4 ? "Medium" : "Low";
}

/** Headline water area per demo project (ha) — demo constants like the other site metrics. */
const WATER_AREA_HA: Record<string, number> = {
  "smart-city-masterplan": 4.8,
  "marina-south-innovation-district": 3.6,
  "riverside-quarter": 2.1,
  "greenfield-new-town": 3.6,
  "harbor-living": 2.2,
  "tech-park-expansion": 0,
  "waterfront-promenade": 2.4,
  "central-station-area": 0,
  "logistics-hub": 0,
  "riverside-town-archive": 1.9,
};

// ---------------------------------------------------------------------------
// Conversion from the planning document
// ---------------------------------------------------------------------------

interface BuildOptions {
  projectName: string;
  coordinates: { lat: number; lng: number };
  /** Headline metrics from the project recipe (demo values). */
  siteInfo: { siteAreaHa: number; buildings: number; greenCoveragePct: number; roadNetworkKm: number; populationCapacity: number };
  source: SpatialDataset["source"];
}

export function buildSpatialDataset(doc: PlanningDocument, opts: BuildOptions): SpatialDataset {
  const rand = rng(hash(doc.projectId));
  const { site } = doc;
  const objects: SpatialObject[] = [];

  // --- site boundary -----------------------------------------------------------
  objects.push({
    id: "site-boundary",
    type: "boundary",
    name: `${opts.projectName} — site boundary`,
    geometry: { kind: "polygon", points: site.boundary },
    properties: { note: "Demo boundary in a local metre grid" },
    layer: "boundary",
    selectable: true,
    visible: true,
  } satisfies BoundaryObject);

  // --- planning objects → spatial objects --------------------------------------
  const planned: PlanningObject[] = doc.objects;
  for (const o of planned) {
    switch (o.type) {
      case "building": {
        const footprint = Math.max(1, Math.round(o.properties.footprint));
        const floors = Math.max(1, o.properties.floors);
        const height = o.properties.height > 0 ? o.properties.height : floors * 3.5;
        const seed = rng(hash(o.id));
        // B-014 is the walkthrough example used across the product; keep its demo indicators stable.
        const solar = o.name === "B-014" ? 78 : Math.round(55 + seed() * 40);
        const heat: BuildingObject["properties"]["environmental"]["heatSensitivity"] = solar > 85 ? "High" : solar > 68 ? "Medium" : "Low";
        objects.push({
          id: o.id,
          type: "building",
          name: o.name,
          geometry: { kind: "rect", center: { x: o.x, y: o.y }, width: o.width, depth: o.height, rotation: o.rotation },
          properties: {
            landUse: o.properties.landUse,
            floors,
            height: Math.round(height),
            footprint,
            density: densityFor(floors),
            status: o.properties.status,
            populationCapacity: Math.round(footprint * floors * PEOPLE_PER_M2[o.properties.landUse]),
            environmental: { solarExposure: solar, heatSensitivity: heat, greenProximityM: Math.round(30 + seed() * 170) },
          },
          layer: "buildings",
          selectable: true,
          visible: true,
        } satisfies BuildingObject);
        break;
      }
      case "road":
      case "path": {
        objects.push({
          id: o.id,
          type: o.type,
          name: o.name,
          geometry: { kind: "line", points: o.points, width: o.width },
          properties: { roadClass: o.properties.roadClass, lanes: o.properties.lanes, lengthM: Math.round(polylineLength(o.points)), status: o.properties.status },
          layer: "roads",
          selectable: true,
          visible: true,
        } satisfies RoadObject);
        break;
      }
      case "green":
      case "tree-zone": {
        const isPark = /park/i.test(o.properties.category) || /park/i.test(o.name);
        objects.push({
          id: o.id,
          type: "green",
          name: o.name,
          geometry: { kind: "polygon", points: o.points },
          properties: { category: o.type === "tree-zone" ? "Tree planting" : o.properties.category, areaM2: Math.round(polygonArea(o.points)), status: o.properties.status },
          layer: isPark ? "parks" : "green",
          selectable: true,
          visible: true,
        } satisfies AreaObject);
        // tree-zones become individual trees for the 3-D view
        if (o.type === "tree-zone") {
          const c = centroid(o.points);
          const count = Math.min(14, Math.max(6, Math.round(polygonArea(o.points) / 260)));
          const local = rng(hash(o.id));
          for (let i = 0; i < count; i++) {
            const p = { x: c.x + (local() - 0.5) * 40, y: c.y + (local() - 0.5) * 40 };
            if (!pointInPolygon(p, o.points)) continue;
            objects.push({
              id: `${o.id}-t${i}`,
              type: "tree",
              name: `Tree ${o.name} ${i + 1}`,
              geometry: { kind: "point", point: p },
              properties: { canopyM: 3 + local() * 2.5, heightM: 7 + local() * 5 },
              layer: "trees",
              selectable: false,
              visible: true,
            } satisfies TreeObject);
          }
        }
        break;
      }
      case "water": {
        objects.push({
          id: o.id,
          type: "water",
          name: o.name,
          geometry: { kind: "polygon", points: o.points },
          properties: { category: o.properties.category, areaM2: Math.round(polygonArea(o.points)), status: o.properties.status },
          layer: "water",
          selectable: true,
          visible: true,
        } satisfies AreaObject);
        break;
      }
      case "parking": {
        objects.push({
          id: o.id,
          type: "parking",
          name: o.name,
          geometry: { kind: "polygon", points: o.points },
          properties: { category: o.properties.category, areaM2: Math.round(polygonArea(o.points)), status: o.properties.status },
          layer: "parking",
          selectable: true,
          visible: true,
        } satisfies AreaObject);
        break;
      }
      case "public-space": {
        objects.push({
          id: o.id,
          type: "block",
          name: o.name,
          geometry: { kind: "polygon", points: o.points },
          properties: { category: o.properties.category, areaM2: Math.round(polygonArea(o.points)), status: o.properties.status },
          layer: "blocks",
          selectable: true,
          visible: true,
        } satisfies AreaObject);
        break;
      }
      default:
        break; // labels / measures / parcels are planning-only annotations
    }
  }

  // --- block plates (developable blocks) ---------------------------------------
  site.context.blockPlates.forEach((b, i) => {
    objects.push({
      id: `block-${i + 1}`,
      type: "block",
      name: `Block ${i + 1}`,
      geometry: { kind: "polygon", points: [{ x: b.x, y: b.y }, { x: b.x + b.width, y: b.y }, { x: b.x + b.width, y: b.y + b.height }, { x: b.x, y: b.y + b.height }] },
      properties: { category: "Development block", areaM2: Math.round(b.width * b.height), status: "Proposed" },
      layer: "blocks",
      selectable: true,
      visible: true,
    } satisfies AreaObject);
  });

  // --- street trees along the site edges ---------------------------------------
  site.context.streetTrees.forEach((t, i) => {
    if (i % 2 === 1) return; // thin the row for the 3-D view
    objects.push({
      id: `street-tree-${i}`,
      type: "tree",
      name: `Street tree ${i + 1}`,
      geometry: { kind: "point", point: t },
      properties: { canopyM: 3.2, heightM: 8 },
      layer: "trees",
      selectable: false,
      visible: true,
    } satisfies TreeObject);
  });

  // --- surrounding context -------------------------------------------------------
  site.context.blocks.forEach((b, i) => {
    const h = 8 + Math.round(rand() * 22);
    objects.push({
      id: `ctx-building-${i + 1}`,
      type: "context-building",
      name: `Existing building ${i + 1}`,
      geometry: { kind: "rect", center: { x: b.x + b.width / 2, y: b.y + b.height / 2 }, width: b.width * 0.86, depth: b.height * 0.86 },
      properties: { height: h, note: "Surrounding context (indicative)" },
      layer: "context-buildings",
      selectable: false,
      visible: true,
    } satisfies ContextBuildingObject);
  });
  site.context.roads.forEach((r, i) => {
    objects.push({
      id: `ctx-road-${i + 1}`,
      type: "road",
      name: ["Ring Road North", "Western Avenue", "Eastern Avenue", "Ring Road South"][i] ?? `Context road ${i + 1}`,
      geometry: { kind: "line", points: r.points, width: r.width },
      properties: { roadClass: i === 0 ? "Arterial" : "Collector", lanes: i === 0 ? 6 : 4, lengthM: Math.round(polylineLength(r.points)), status: "Existing" },
      layer: "roads",
      selectable: true,
      visible: true,
    } satisfies RoadObject);
  });

  // --- terrain contours (demo elevations) -------------------------------------
  // The planning generator's contours cross the site; the plan reads better with
  // the ground relief kept to the surroundings, so clip them to the outside.
  const contourSegments = clipOutside(site.context.contours, site.boundary);
  contourSegments.forEach((seg, i) => {
    objects.push({
      id: `contour-${i + 1}`,
      type: "terrain",
      name: `Contour ${seg.elevationM} m`,
      geometry: { kind: "line", points: seg.points, width: 1 },
      properties: { elevationM: seg.elevationM, note: "Indicative contour" },
      layer: "terrain",
      selectable: false,
      visible: true,
    } satisfies TerrainObject);
  });

  // --- transit + utilities -------------------------------------------------------
  objects.push({
    id: "transit-1",
    type: "transit",
    name: "Metro Line 2 (planned)",
    geometry: { kind: "line", points: site.context.transit.line, width: 6 },
    properties: { mode: "Metro", stations: site.context.transit.stations },
    layer: "transit",
    selectable: true,
    visible: true,
  } satisfies TransitObject);
  site.context.utilities.forEach((line, i) => {
    objects.push({
      id: `utility-${i + 1}`,
      type: "utility",
      name: `Utility corridor ${i + 1}`,
      geometry: { kind: "line", points: line, width: 2 },
      properties: { network: i % 2 === 0 ? "Water & sewer" : "Power & data" },
      layer: "utilities",
      selectable: true,
      visible: true,
    } satisfies UtilityObject);
  });

  // --- points of interest --------------------------------------------------------
  const sb = site.bounds;
  const pois: { name: string; category: PoiObject["properties"]["category"]; description: string; at: Point }[] = [
    {
      name: "North Gate Station",
      category: "Transit",
      description: "Planned metro interchange at the northern edge.",
      // beside (not on) the transit station marker so the two labels never collide
      at: (() => {
        const st = site.context.transit.stations[0]?.point;
        return st ? { x: st.x + 42, y: st.y + 26 } : { x: sb.x + sb.width * 0.3, y: sb.y - 40 };
      })(),
    },
    { name: "Community School", category: "Education", description: "Primary school serving the western blocks.", at: { x: sb.x + sb.width * 0.18, y: sb.y + sb.height * 0.62 } },
    { name: "Health Centre", category: "Health", description: "Neighbourhood clinic with 24 h urgent care.", at: { x: sb.x + sb.width * 0.82, y: sb.y + sb.height * 0.36 } },
    { name: "Arts Pavilion", category: "Culture", description: "Flexible exhibition and performance space on the plaza.", at: { x: sb.x + sb.width * 0.5, y: sb.y + sb.height * 0.5 } },
    { name: "Market Hall", category: "Commerce", description: "Covered market anchoring the high street.", at: { x: sb.x + sb.width * 0.66, y: sb.y + sb.height * 0.14 } },
    { name: "Waterfront Steps", category: "Recreation", description: "Terraced public access to the water.", at: { x: sb.x + sb.width * 0.36, y: sb.y + sb.height * 0.86 } },
  ];
  pois.forEach((p, i) => {
    objects.push({
      id: `poi-${i + 1}`,
      type: "poi",
      name: p.name,
      geometry: { kind: "point", point: p.at },
      properties: { category: p.category, description: p.description },
      layer: "poi",
      selectable: true,
      visible: true,
    } satisfies PoiObject);
  });

  // --- summary -------------------------------------------------------------------
  const waterM2 = objects.filter((o): o is AreaObject => o.type === "water").reduce((s, o) => s + o.properties.areaM2, 0);
  const summary: SiteSummary = {
    siteAreaHa: opts.siteInfo.siteAreaHa,
    buildings: opts.siteInfo.buildings,
    greenCoveragePct: opts.siteInfo.greenCoveragePct,
    roadNetworkKm: opts.siteInfo.roadNetworkKm,
    waterAreaHa: WATER_AREA_HA[doc.projectId] ?? Math.round((waterM2 / 10_000) * 10) / 10,
    populationCapacity: opts.siteInfo.populationCapacity,
    coordinates: opts.coordinates,
    coordinateSystem: "Local / Demo",
  };

  return {
    projectId: doc.projectId,
    projectName: opts.projectName,
    world: site.world,
    siteBounds: site.bounds,
    objects,
    summary,
    source: opts.source,
    generatedAtIso: new Date().toISOString(),
  };
}

/**
 * Split polylines into the pieces lying outside a polygon (sampled every
 * ~10 m). Good enough for indicative contours; not a GIS clip.
 */
function clipOutside(lines: Point[][], polygon: Point[]): { points: Point[]; elevationM: number }[] {
  const out: { points: Point[]; elevationM: number }[] = [];
  lines.forEach((line, li) => {
    const elevationM = 12 + li * 2;
    let current: Point[] = [];
    const flush = () => {
      if (current.length > 1) out.push({ points: current, elevationM });
      current = [];
    };
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i];
      const b = line[i + 1];
      const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 10));
      for (let k = 0; k <= steps; k++) {
        const p = { x: a.x + ((b.x - a.x) * k) / steps, y: a.y + ((b.y - a.y) * k) / steps };
        if (pointInPolygon(p, polygon)) flush();
        else current.push(p);
      }
    }
    flush();
  });
  return out;
}
