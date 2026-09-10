import type { Bounds, Point } from "../../visualization/types/visualization.types";

/**
 * Environmental & Urban Analysis domain model.
 *
 * The analysis module never owns spatial geometry: it reads the Step 12
 * SpatialDataset and produces typed, DEMO indicators on top of it.
 *
 *   SpatialDataset → analysis engine (demo heuristics) → AnalysisResult
 *                                                         ├─ metrics
 *                                                         ├─ overlays  → AnalysisMap (2-D) / CityView tint (3-D)
 *                                                         └─ findings / considerations
 *
 * Nothing here is a scientific simulation. Values are illustrative and are
 * labelled as such in the UI. A real engine (solar, CFD, routing, carbon
 * accounting) would return the same shapes from the future backend.
 */

// ---------------------------------------------------------------------------
// Categories / navigation
// ---------------------------------------------------------------------------

export type AnalysisMode = "overview" | "environment" | "mobility" | "density";

export type AnalysisCategoryId =
  | "overview"
  | "solar"
  | "heat"
  | "wind"
  | "green"
  | "carbon"
  | "density"
  | "height"
  | "landuse"
  | "openspace"
  | "accessibility"
  | "roads"
  | "walkability";

export type AnalysisCategoryGroup = "Overview" | "Environment" | "Urban Form" | "Mobility";

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

/** Status vocabulary — always rendered with an icon/label, never colour alone. */
export type MetricStatus = "good" | "moderate" | "attention" | "info";

export type MetricUnit = "score" | "percent" | "ha" | "km" | "m/s" | "people/ha" | "FAR" | "floors" | "text" | "tCO2e";

export interface AnalysisMetric {
  id: string;
  category: AnalysisCategoryId;
  name: string;
  /** Primary numeric value (or NaN for text-only metrics, see `text`). */
  value: number;
  unit: MetricUnit;
  /** 0–100 normalised score when the metric can be scored. */
  score?: number;
  /** Text value for qualitative metrics ("Medium", "SW → NE", "Demo"). */
  text?: string;
  status: MetricStatus;
  /** One-line meaning of the metric. */
  description: string;
  /** Project-specific reading of the value (demo copy). */
  interpretation: string;
  /** Optional breakdown rows shown under the metric (e.g. High / Moderate / Low areas). */
  breakdown?: { label: string; value: number; unit: MetricUnit; text?: string }[];
  keyFactors?: string[];
  recommendation?: string;
}

// ---------------------------------------------------------------------------
// Overlays (what the map draws)
// ---------------------------------------------------------------------------

export type OverlayType = "solar" | "heat" | "wind" | "green" | "carbon" | "density" | "height" | "landuse" | "openspace" | "accessibility" | "roads" | "walkability";

export interface LegendStop {
  /** Position 0–1 along the ramp. */
  t: number;
  color: string;
  label: string;
}

export interface OverlayLegend {
  title: string;
  /** "ramp" draws a continuous bar; "classes" draws discrete swatches. */
  kind: "ramp" | "classes";
  stops: LegendStop[];
  /** Optional min / max captions for ramps ("0" … "100"). */
  minLabel?: string;
  maxLabel?: string;
  /** Extra symbols (arrows, hatch, outlines) that the overlay uses beside colour. */
  symbols?: { swatch: "arrow" | "outline" | "hatch" | "dot" | "dashed"; label: string; color: string }[];
}

/** Per-zone cell of the coarse analysis grid over the site. */
export interface ZoneCell {
  id: string;
  bounds: Bounds;
  /** Fraction of the cell inside the site boundary (0–1). */
  coverage: number;
  /** Normalised 0–1 intensity for the active overlay. */
  value: number;
}

/** Per-object value (buildings mostly), keyed by SpatialObject id. */
export type ObjectValues = Record<string, number>;

export interface WindVector {
  origin: Point;
  /** Direction in degrees (0 = north, clockwise), map convention. */
  bearing: number;
  /** 0–1 relative speed. */
  speed: number;
}

export interface AnalysisOverlay {
  id: string;
  type: OverlayType;
  title: string;
  /** Coarse zone grid values (heat, solar, density, accessibility …). */
  zones: ZoneCell[];
  /** Per-building values (0–1) for building-coloured overlays. */
  buildings: ObjectValues;
  /** Extra vector field for wind. */
  vectors?: WindVector[];
  /** Highlighted object ids (green / openspace overlays). */
  highlight?: string[];
  min: number;
  max: number;
  legend: OverlayLegend;
  /** Which things the overlay paints so the map can mute the rest. */
  paints: ("zones" | "buildings" | "vectors" | "areas" | "roads")[];
}

// ---------------------------------------------------------------------------
// Findings / considerations / comparison
// ---------------------------------------------------------------------------

export interface AnalysisFinding {
  id: string;
  text: string;
  category: AnalysisCategoryId;
  status: MetricStatus;
}

export interface PlanningConsideration {
  id: string;
  title: string;
  detail: string;
  category: AnalysisCategoryId;
}

export interface ComparisonRow {
  id: string;
  label: string;
  current: number;
  baseline: number;
  unit: MetricUnit;
  /** True when a larger value is better (drives the delta icon/wording). */
  higherIsBetter: boolean;
}

export interface ScoreBreakdown {
  id: "environment" | "mobility" | "urbanform" | "green" | "carbon";
  label: string;
  score: number;
  /** Which category the breakdown links to in the navigation. */
  category: AnalysisCategoryId;
}

// ---------------------------------------------------------------------------
// Result + zone detail
// ---------------------------------------------------------------------------

export interface ZoneDetail {
  zoneId: string;
  label: string;
  /** Per-category readings for the selected zone (demo). */
  solar: number;
  heat: number;
  wind: number;
  density: "Low" | "Medium" | "High";
  far: number;
  avgFloors: number;
  populationCapacity: number;
  greenShare: number;
  walkMinutesToOpenSpace: number;
  buildingCount: number;
  landUseMix: { landUse: string; share: number }[];
}

export interface AnalysisResult {
  projectId: string;
  projectName: string;
  overallScore: number;
  breakdown: ScoreBreakdown[];
  metrics: AnalysisMetric[];
  overlays: AnalysisOverlay[];
  findings: AnalysisFinding[];
  considerations: PlanningConsideration[];
  comparison: ComparisonRow[];
  /** Small time series for the "environmental trend" chart (demo). */
  trend: { label: string; environment: number; carbon: number; green: number }[];
  /** Density distribution histogram (share of buildings per floor band). */
  densityDistribution: { band: string; share: number; buildings: number }[];
  landUse: { landUse: string; share: number; color: string }[];
  /** Zone grid shared by all overlays (geometry only). */
  zones: { id: string; bounds: Bounds; coverage: number }[];
  generatedAt: string;
  /** Provenance — always demo in this version. */
  engine: { kind: "demo"; version: string; note: string };
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export type AnalysisStatus = "idle" | "running" | "complete" | "error";

export interface RunStep {
  id: string;
  label: string;
  /** Relative duration weight. */
  weight: number;
}

export type AnalysisViewMode = "2d" | "3d";

export type ExportFormat = "summary" | "data";
