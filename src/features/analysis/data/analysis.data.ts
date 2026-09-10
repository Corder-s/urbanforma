import {
  Accessibility,
  Building2,
  Cloud,
  Footprints,
  Gauge,
  LandPlot,
  Leaf,
  Route,
  Ruler,
  Sun,
  Thermometer,
  Trees,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { AnalysisCategoryGroup, AnalysisCategoryId, AnalysisMode, MetricStatus, OverlayType, RunStep } from "../types/analysis.types";

/**
 * Static vocabulary for the analysis workspace: categories, modes, the run
 * sequence, colour ramps and the DEMO project profiles the engine calibrates
 * to. No UI code in here; no geometry either (that is the engine's job).
 */

// ---------------------------------------------------------------------------
// Categories / modes
// ---------------------------------------------------------------------------

export interface AnalysisCategoryDef {
  id: AnalysisCategoryId;
  label: string;
  group: AnalysisCategoryGroup;
  mode: AnalysisMode;
  icon: LucideIcon;
  overlay: OverlayType | null;
  /** One-line description shown under the category title. */
  blurb: string;
}

export const CATEGORIES: AnalysisCategoryDef[] = [
  { id: "overview", label: "Performance Overview", group: "Overview", mode: "overview", icon: Gauge, overlay: null, blurb: "Composite urban performance of the current plan." },
  { id: "solar", label: "Solar Exposure", group: "Environment", mode: "environment", icon: Sun, overlay: "solar", blurb: "Relative solar availability across the site." },
  { id: "heat", label: "Heat", group: "Environment", mode: "environment", icon: Thermometer, overlay: "heat", blurb: "Conceptual heat zones from surface and massing." },
  { id: "wind", label: "Wind", group: "Environment", mode: "environment", icon: Wind, overlay: "wind", blurb: "Prevailing flow and pedestrian comfort." },
  { id: "green", label: "Green Coverage", group: "Environment", mode: "environment", icon: Leaf, overlay: "green", blurb: "Parks, trees, corridors and other green." },
  { id: "carbon", label: "Carbon", group: "Environment", mode: "environment", icon: Cloud, overlay: "carbon", blurb: "Estimated carbon intensity by contributor." },
  { id: "density", label: "Density", group: "Urban Form", mode: "density", icon: Building2, overlay: "density", blurb: "People, floor area and utilisation." },
  { id: "height", label: "Building Height", group: "Urban Form", mode: "density", icon: Ruler, overlay: "height", blurb: "Height profile of the planned buildings." },
  { id: "landuse", label: "Land Use", group: "Urban Form", mode: "density", icon: LandPlot, overlay: "landuse", blurb: "Distribution of uses across the plan." },
  { id: "openspace", label: "Open Space", group: "Urban Form", mode: "density", icon: Trees, overlay: "openspace", blurb: "Public and private open space and its reach." },
  { id: "accessibility", label: "Accessibility", group: "Mobility", mode: "mobility", icon: Accessibility, overlay: "accessibility", blurb: "Reach of major roads and transit." },
  { id: "roads", label: "Road Network", group: "Mobility", mode: "mobility", icon: Route, overlay: "roads", blurb: "Hierarchy and length of the street network." },
  { id: "walkability", label: "Walkability", group: "Mobility", mode: "mobility", icon: Footprints, overlay: "walkability", blurb: "Everyday destinations within a short walk." },
];

export const CATEGORY_GROUPS: AnalysisCategoryGroup[] = ["Overview", "Environment", "Urban Form", "Mobility"];

export function getCategory(id: AnalysisCategoryId): AnalysisCategoryDef {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

export function isCategoryId(v: string | null): v is AnalysisCategoryId {
  return !!v && CATEGORIES.some((c) => c.id === v);
}

export const MODES: { id: AnalysisMode; label: string; /** Category opened when the mode is chosen. */ entry: AnalysisCategoryId }[] = [
  { id: "overview", label: "Overview", entry: "overview" },
  { id: "environment", label: "Environment", entry: "solar" },
  { id: "mobility", label: "Mobility", entry: "accessibility" },
  { id: "density", label: "Density", entry: "density" },
];

// ---------------------------------------------------------------------------
// Run sequence (spec §18) — local demo processing, no network
// ---------------------------------------------------------------------------

export const RUN_STEPS: RunStep[] = [
  { id: "prepare", label: "Preparing spatial data", weight: 1 },
  { id: "environment", label: "Analyzing environment", weight: 1.6 },
  { id: "form", label: "Analyzing urban form", weight: 1.2 },
  { id: "mobility", label: "Calculating mobility indicators", weight: 1.2 },
  { id: "results", label: "Generating results", weight: 0.8 },
];

/** Total run duration in ms (normal / reduced motion). */
export const RUN_DURATION_MS = 2600;
export const RUN_DURATION_REDUCED_MS = 420;

// ---------------------------------------------------------------------------
// Status vocabulary (icon + label always accompany colour)
// ---------------------------------------------------------------------------

export const STATUS_META: Record<MetricStatus, { label: string; tone: "green" | "amber" | "blue" | "neutral"; dot: string }> = {
  good: { label: "Good", tone: "green", dot: "bg-success" },
  moderate: { label: "Moderate", tone: "amber", dot: "bg-warning" },
  attention: { label: "Needs attention", tone: "amber", dot: "bg-danger" },
  info: { label: "Reference", tone: "neutral", dot: "bg-faint" },
};

export function statusForScore(score: number): MetricStatus {
  return score >= 75 ? "good" : score >= 55 ? "moderate" : "attention";
}

// ---------------------------------------------------------------------------
// Colour ramps (restrained; every overlay also carries labels/symbols)
// ---------------------------------------------------------------------------

export const RAMPS: Record<Exclude<OverlayType, "landuse" | "roads">, string[]> = {
  solar: ["#FFF7E6", "#FBD38D", "#F59E0B", "#C2410C"],
  heat: ["#DBEAFE", "#FDE68A", "#FB923C", "#DC2626"],
  wind: ["#F0F9FF", "#7DD3FC", "#0284C7", "#075985"],
  green: ["#F0FDF4", "#86EFAC", "#22C55E", "#15803D"],
  carbon: ["#F1F5F9", "#CBD5E1", "#64748B", "#334155"],
  density: ["#EFF6FF", "#93C5FD", "#2563EB", "#1E3A8A"],
  height: ["#ECFEFF", "#67E8F9", "#0891B2", "#155E75"],
  openspace: ["#BBF7D0", "#FDE68A", "#FECACA"],
  accessibility: ["#FEE2E2", "#FDE68A", "#BBF7D0", "#4ADE80"],
  walkability: ["#FEE2E2", "#FDE68A", "#BBF7D0", "#4ADE80"],
};

export const ROAD_CLASS_COLOR: Record<string, string> = {
  Arterial: "#1D4ED8",
  Collector: "#3B82F6",
  Local: "#93C5FD",
  Pedestrian: "#A7F3D0",
};

// ---------------------------------------------------------------------------
// Demo project profiles — headline numbers the engine calibrates to
// ---------------------------------------------------------------------------

export interface AnalysisProfile {
  overall: number;
  breakdown: { environment: number; mobility: number; urbanform: number; green: number; carbon: number };
  solar: { avg: number; high: number; moderate: number; low: number; peak: string };
  heat: { risk: "Low" | "Medium" | "High"; index: number; high: number; moderate: number; low: number };
  wind: { comfort: number; avgSpeed: number; comfortable: number; higher: number; lower: number; prevailing: string; concern: string };
  green: { target: number; trees: number; parks: number; corridors: number; other: number };
  carbon: { performance: number; annualTCO2e: number; buildings: number; mobility: number; infrastructure: number; other: number };
  density: { far: number; avgFloors: number; utilization: number };
  landUse: { residential: number; commercial: number; mixed: number; civic: number; green: number; infrastructure: number };
  openSpace: { total: number; publicShare: number; privateShare: number; within5: number; within10: number };
  mobility: { within5MinRoad: number; walkability: number; transitAccess: string; intersectionDensity: string };
  baseline: { overall: number; environment: number; greenCoverage: number; walkability: number; carbon: number; heatIndex: number; windComfort: number };
  /** Reading applied to the densest zone so the walkthrough example is reproducible. */
  featuredZone: { solar: number; far: number; avgFloors: number; population: number };
}

/** Walkthrough project — values match the Step 13 specification. */
const SMART_CITY: AnalysisProfile = {
  overall: 84,
  breakdown: { environment: 86, mobility: 78, urbanform: 82, green: 91, carbon: 74 },
  solar: { avg: 78, high: 42, moderate: 38, low: 20, peak: "12:00–14:00" },
  heat: { risk: "Medium", index: 68, high: 18, moderate: 47, low: 35 },
  wind: { comfort: 81, avgSpeed: 3.8, comfortable: 72, higher: 12, lower: 16, prevailing: "SW → NE", concern: "High-rise edges" },
  green: { target: 25, trees: 8.4, parks: 2.7, corridors: 1.9, other: 0.8 },
  carbon: { performance: 72, annualTCO2e: 18400, buildings: 52, mobility: 28, infrastructure: 12, other: 8 },
  density: { far: 0.62, avgFloors: 7.8, utilization: 68 },
  landUse: { residential: 42, commercial: 18, mixed: 12, civic: 8, green: 15, infrastructure: 5 },
  openSpace: { total: 31, publicShare: 18, privateShare: 13, within5: 68, within10: 91 },
  mobility: { within5MinRoad: 84, walkability: 79, transitAccess: "Demo", intersectionDensity: "Demo" },
  baseline: { overall: 71, environment: 74, greenCoverage: 16.8, walkability: 64, carbon: 61, heatIndex: 74, windComfort: 76 },
  featuredZone: { solar: 82, far: 0.78, avgFloors: 9, population: 3120 },
};

function variant(p: Partial<{ [K in keyof AnalysisProfile]: Partial<AnalysisProfile[K]> }>): AnalysisProfile {
  const out: AnalysisProfile = JSON.parse(JSON.stringify(SMART_CITY));
  for (const key of Object.keys(p) as (keyof AnalysisProfile)[]) {
    const patch = p[key];
    if (patch && typeof patch === "object") Object.assign(out[key] as object, patch);
    else if (patch !== undefined) (out as unknown as Record<string, unknown>)[key] = patch;
  }
  return out;
}

export const ANALYSIS_PROFILES: Record<string, AnalysisProfile> = {
  "smart-city-masterplan": SMART_CITY,
  "marina-south-innovation-district": variant({
    overall: 79,
    breakdown: { environment: 80, mobility: 82, urbanform: 78, green: 72, carbon: 70 },
    solar: { avg: 74, high: 36, moderate: 41, low: 23 },
    heat: { risk: "Medium", index: 64, high: 15, moderate: 44, low: 41 },
    wind: { comfort: 69, avgSpeed: 5.1, comfortable: 58, higher: 27, lower: 15, prevailing: "S → N", concern: "Waterfront towers" },
    green: { target: 22, trees: 3.1, parks: 1.2, corridors: 0.7, other: 0.4 },
    carbon: { performance: 68, annualTCO2e: 11200, buildings: 58, mobility: 24, infrastructure: 11, other: 7 },
    density: { far: 1.14, avgFloors: 11.2, utilization: 74 },
    landUse: { residential: 28, commercial: 34, mixed: 16, civic: 6, green: 11, infrastructure: 5 },
    openSpace: { total: 24, publicShare: 15, privateShare: 9, within5: 74, within10: 96 },
    mobility: { within5MinRoad: 91, walkability: 83 },
    baseline: { overall: 66, environment: 68, greenCoverage: 12.4, walkability: 71, carbon: 58, heatIndex: 70, windComfort: 66 },
    featuredZone: { solar: 76, far: 1.42, avgFloors: 14, population: 2680 },
  }),
  "riverside-quarter": variant({
    overall: 86,
    breakdown: { environment: 89, mobility: 76, urbanform: 84, green: 94, carbon: 80 },
    solar: { avg: 80, high: 46, moderate: 37, low: 17 },
    heat: { risk: "Low", index: 52, high: 8, moderate: 36, low: 56 },
    wind: { comfort: 86, avgSpeed: 3.1, comfortable: 80, higher: 6, lower: 14, prevailing: "W → E", concern: "River corridor gusts" },
    green: { target: 30, trees: 2.4, parks: 1.1, corridors: 0.6, other: 0.2 },
    carbon: { performance: 79, annualTCO2e: 5100, buildings: 49, mobility: 30, infrastructure: 13, other: 8 },
    density: { far: 0.71, avgFloors: 5.4, utilization: 61 },
    landUse: { residential: 51, commercial: 9, mixed: 10, civic: 7, green: 19, infrastructure: 4 },
    openSpace: { total: 38, publicShare: 24, privateShare: 14, within5: 81, within10: 98 },
    mobility: { within5MinRoad: 78, walkability: 77 },
    baseline: { overall: 72, environment: 76, greenCoverage: 24.5, walkability: 62, carbon: 66, heatIndex: 60, windComfort: 82 },
    featuredZone: { solar: 84, far: 0.92, avgFloors: 7, population: 1180 },
  }),
  "greenfield-new-town": variant({
    overall: 77,
    breakdown: { environment: 82, mobility: 66, urbanform: 78, green: 84, carbon: 71 },
    solar: { avg: 83, high: 52, moderate: 34, low: 14 },
    heat: { risk: "Low", index: 49, high: 6, moderate: 33, low: 61 },
    wind: { comfort: 78, avgSpeed: 4.2, comfortable: 70, higher: 14, lower: 16, prevailing: "SW → NE", concern: "Exposed northern edge" },
    green: { target: 20, trees: 9.6, parks: 6.2, corridors: 3.4, other: 1.1 },
    carbon: { performance: 70, annualTCO2e: 41200, buildings: 46, mobility: 36, infrastructure: 11, other: 7 },
    density: { far: 0.38, avgFloors: 4.1, utilization: 57 },
    landUse: { residential: 58, commercial: 8, mixed: 7, civic: 6, green: 15, infrastructure: 6 },
    openSpace: { total: 34, publicShare: 19, privateShare: 15, within5: 59, within10: 84 },
    mobility: { within5MinRoad: 71, walkability: 64 },
    baseline: { overall: 60, environment: 70, greenCoverage: 9.5, walkability: 48, carbon: 55, heatIndex: 54, windComfort: 74 },
    featuredZone: { solar: 85, far: 0.54, avgFloors: 5, population: 1460 },
  }),
  "harbor-living": variant({
    overall: 80,
    breakdown: { environment: 81, mobility: 79, urbanform: 80, green: 76, carbon: 76 },
    solar: { avg: 76, high: 40, moderate: 39, low: 21 },
    heat: { risk: "Medium", index: 61, high: 12, moderate: 45, low: 43 },
    wind: { comfort: 72, avgSpeed: 4.8, comfortable: 62, higher: 22, lower: 16, prevailing: "SW → NE", concern: "Quay-edge funnelling" },
    green: { target: 25, trees: 1.6, parks: 0.9, corridors: 0.4, other: 0.2 },
    carbon: { performance: 75, annualTCO2e: 3900, buildings: 50, mobility: 29, infrastructure: 13, other: 8 },
    density: { far: 0.84, avgFloors: 6.9, utilization: 66 },
    landUse: { residential: 46, commercial: 14, mixed: 14, civic: 5, green: 16, infrastructure: 5 },
    openSpace: { total: 33, publicShare: 21, privateShare: 12, within5: 77, within10: 97 },
    mobility: { within5MinRoad: 86, walkability: 80 },
    baseline: { overall: 68, environment: 70, greenCoverage: 18.2, walkability: 66, carbon: 63, heatIndex: 66, windComfort: 69 },
    featuredZone: { solar: 79, far: 1.05, avgFloors: 8, population: 940 },
  }),
  "tech-park-expansion": variant({
    overall: 73,
    breakdown: { environment: 74, mobility: 68, urbanform: 76, green: 70, carbon: 69 },
    solar: { avg: 81, high: 48, moderate: 36, low: 16 },
    heat: { risk: "Medium", index: 66, high: 17, moderate: 48, low: 35 },
    wind: { comfort: 80, avgSpeed: 3.6, comfortable: 74, higher: 9, lower: 17, prevailing: "W → E", concern: "Open car-park frontages" },
    green: { target: 25, trees: 2.0, parks: 0.8, corridors: 0.6, other: 0.3 },
    carbon: { performance: 67, annualTCO2e: 9800, buildings: 61, mobility: 25, infrastructure: 9, other: 5 },
    density: { far: 0.66, avgFloors: 5.8, utilization: 72 },
    landUse: { residential: 6, commercial: 52, mixed: 12, civic: 5, green: 20, infrastructure: 5 },
    openSpace: { total: 29, publicShare: 12, privateShare: 17, within5: 61, within10: 88 },
    mobility: { within5MinRoad: 88, walkability: 62 },
    baseline: { overall: 64, environment: 66, greenCoverage: 15.0, walkability: 51, carbon: 60, heatIndex: 71, windComfort: 78 },
    featuredZone: { solar: 83, far: 0.88, avgFloors: 7, population: 1720 },
  }),
  "waterfront-promenade": variant({
    overall: 85,
    breakdown: { environment: 88, mobility: 84, urbanform: 80, green: 90, carbon: 82 },
    solar: { avg: 79, high: 44, moderate: 38, low: 18 },
    heat: { risk: "Low", index: 50, high: 7, moderate: 35, low: 58 },
    wind: { comfort: 74, avgSpeed: 4.6, comfortable: 64, higher: 20, lower: 16, prevailing: "S → N", concern: "Promenade exposure" },
    green: { target: 30, trees: 1.4, parks: 0.8, corridors: 0.3, other: 0.1 },
    carbon: { performance: 81, annualTCO2e: 1900, buildings: 44, mobility: 32, infrastructure: 15, other: 9 },
    density: { far: 0.58, avgFloors: 4.6, utilization: 55 },
    landUse: { residential: 34, commercial: 16, mixed: 12, civic: 6, green: 27, infrastructure: 5 },
    openSpace: { total: 44, publicShare: 33, privateShare: 11, within5: 92, within10: 100 },
    mobility: { within5MinRoad: 82, walkability: 86 },
    baseline: { overall: 70, environment: 75, greenCoverage: 29.0, walkability: 72, carbon: 68, heatIndex: 55, windComfort: 70 },
    featuredZone: { solar: 81, far: 0.74, avgFloors: 6, population: 420 },
  }),
  "central-station-area": variant({
    overall: 76,
    breakdown: { environment: 70, mobility: 92, urbanform: 80, green: 58, carbon: 78 },
    solar: { avg: 69, high: 31, moderate: 42, low: 27 },
    heat: { risk: "High", index: 77, high: 29, moderate: 46, low: 25 },
    wind: { comfort: 71, avgSpeed: 4.0, comfortable: 60, higher: 23, lower: 17, prevailing: "SW → NE", concern: "Tower cluster downdraughts" },
    green: { target: 20, trees: 2.2, parks: 0.9, corridors: 0.6, other: 0.3 },
    carbon: { performance: 77, annualTCO2e: 24600, buildings: 63, mobility: 17, infrastructure: 13, other: 7 },
    density: { far: 1.62, avgFloors: 12.4, utilization: 81 },
    landUse: { residential: 24, commercial: 36, mixed: 22, civic: 7, green: 7, infrastructure: 4 },
    openSpace: { total: 19, publicShare: 13, privateShare: 6, within5: 71, within10: 95 },
    mobility: { within5MinRoad: 96, walkability: 88 },
    baseline: { overall: 63, environment: 60, greenCoverage: 5.5, walkability: 79, carbon: 62, heatIndex: 80, windComfort: 68 },
    featuredZone: { solar: 72, far: 2.1, avgFloors: 16, population: 3860 },
  }),
  "logistics-hub": variant({
    overall: 64,
    breakdown: { environment: 62, mobility: 70, urbanform: 66, green: 54, carbon: 58 },
    solar: { avg: 86, high: 58, moderate: 31, low: 11 },
    heat: { risk: "High", index: 79, high: 34, moderate: 44, low: 22 },
    wind: { comfort: 76, avgSpeed: 4.4, comfortable: 68, higher: 18, lower: 14, prevailing: "W → E", concern: "Large open yards" },
    green: { target: 15, trees: 6.1, parks: 2.3, corridors: 4.8, other: 2.2 },
    carbon: { performance: 56, annualTCO2e: 36800, buildings: 41, mobility: 43, infrastructure: 11, other: 5 },
    density: { far: 0.29, avgFloors: 1.8, utilization: 63 },
    landUse: { residential: 2, commercial: 9, mixed: 3, civic: 4, green: 16, infrastructure: 66 },
    openSpace: { total: 22, publicShare: 6, privateShare: 16, within5: 38, within10: 66 },
    mobility: { within5MinRoad: 94, walkability: 41 },
    baseline: { overall: 55, environment: 56, greenCoverage: 8.0, walkability: 36, carbon: 50, heatIndex: 82, windComfort: 74 },
    featuredZone: { solar: 88, far: 0.36, avgFloors: 2, population: 310 },
  }),
  "riverside-town-archive": variant({
    overall: 74,
    breakdown: { environment: 78, mobility: 70, urbanform: 74, green: 72, carbon: 72 },
    solar: { avg: 77, high: 41, moderate: 39, low: 20 },
    heat: { risk: "Medium", index: 60, high: 11, moderate: 46, low: 43 },
    green: { target: 22, trees: 1.9, parks: 0.7, corridors: 0.5, other: 0.2 },
    density: { far: 0.58, avgFloors: 5.1, utilization: 60 },
    baseline: { overall: 65, environment: 70, greenCoverage: 11.0, walkability: 60, carbon: 62, heatIndex: 66, windComfort: 78 },
    featuredZone: { solar: 80, far: 0.7, avgFloors: 6, population: 860 },
  }),
};

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

export const ANALYSIS_RUN_KEY = "urbanforma.analysis.lastRun";
export const ANALYSIS_PREFS_KEY = "urbanforma.analysis.prefs";
export const ANALYSIS_LAST_PROJECT_KEY = "urbanforma.analysis.lastProjectId";

/** Minutes of walking per metre (≈ 80 m per minute). */
export const WALK_M_PER_MIN = 80;
