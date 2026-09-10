import type { LucideIcon } from "lucide-react";
import { Building2, CarFront, Flame, Footprints, Layers3, Leaf, Scale, Sun, TreePine, Wind } from "lucide-react";
import type {
  ConstraintDefinition,
  ConstraintId,
  CurrentPlan,
  GenerationStep,
  GoalDefinition,
  GoalId,
  GoalPriority,
  MetricDefinition,
  ObjectiveDefinition,
  ObjectiveId,
  ObjectiveWeight,
  OptimizationInputs,
  OptimizationMode,
  PlanningConstraint,
  PlanningGoal,
  ScenarioKind,
  ScenarioMetricId,
  ScenarioStatus,
  SpatialChangeKind,
} from "../types/optimization.types";

// ---------------------------------------------------------------------------
// Storage keys (future POST/GET /api/projects/:id/optimization)
// ---------------------------------------------------------------------------

export const OPTIMIZATION_STORAGE_PREFIX = "urbanforma.optimization.state.";
export const OPTIMIZATION_PREFS_PREFIX = "urbanforma.optimization.prefs.";
export const OPTIMIZATION_LAST_PROJECT_KEY = "urbanforma.optimization.lastProjectId";

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

export const MODES: { id: OptimizationMode; label: string; hint: string }[] = [
  { id: "optimize", label: "Optimize", hint: "Goals, constraints and scenario generation" },
  { id: "compare", label: "Compare", hint: "Current plan against generated scenarios" },
  { id: "review", label: "Review", hint: "Goal performance, constraints and decision" },
];

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export const METRICS: Record<ScenarioMetricId, MetricDefinition> = {
  environment: { id: "environment", label: "Environmental Performance", short: "Environment", unit: "score", higherIsBetter: true, decimals: 0 },
  mobility: { id: "mobility", label: "Mobility", short: "Mobility", unit: "score", higherIsBetter: true, decimals: 0 },
  urbanForm: { id: "urbanForm", label: "Urban Form", short: "Urban Form", unit: "score", higherIsBetter: true, decimals: 0 },
  greenInfrastructure: { id: "greenInfrastructure", label: "Green Infrastructure", short: "Green Infra.", unit: "score", higherIsBetter: true, decimals: 0 },
  carbon: { id: "carbon", label: "Carbon Performance", short: "Carbon", unit: "score", higherIsBetter: true, decimals: 0 },
  greenCoverage: { id: "greenCoverage", label: "Green Coverage", short: "Green", unit: "percent", higherIsBetter: true, decimals: 1 },
  heatIndex: { id: "heatIndex", label: "Heat Risk Index", short: "Heat", unit: "index", higherIsBetter: false, decimals: 0 },
  solar: { id: "solar", label: "Solar Exposure", short: "Solar", unit: "score", higherIsBetter: true, decimals: 0 },
  populationCapacity: { id: "populationCapacity", label: "Population Capacity", short: "Population", unit: "people", higherIsBetter: true, decimals: 0 },
  far: { id: "far", label: "Floor Area Ratio", short: "FAR", unit: "FAR", higherIsBetter: true, decimals: 2 },
  maxFloors: { id: "maxFloors", label: "Tallest Building", short: "Max Height", unit: "floors", higherIsBetter: false, decimals: 0 },
  siteCoverage: { id: "siteCoverage", label: "Site Coverage", short: "Coverage", unit: "percent", higherIsBetter: false, decimals: 0 },
  publicOpenSpace: { id: "publicOpenSpace", label: "Public Open Space", short: "Open Space", unit: "percent", higherIsBetter: true, decimals: 0 },
};

/** Rows of the comparison table / performance chart, in display order. */
export const COMPARE_METRICS: ScenarioMetricId[] = ["environment", "mobility", "greenCoverage", "carbon", "urbanForm", "heatIndex", "solar", "populationCapacity", "far"];
export const CHART_METRICS: ScenarioMetricId[] = ["environment", "mobility", "greenInfrastructure", "carbon", "urbanForm"];
export const PERFORMANCE_METRICS: ScenarioMetricId[] = ["environment", "mobility", "urbanForm", "greenInfrastructure", "carbon"];
export const CARD_METRICS: ScenarioMetricId[] = ["environment", "mobility", "greenCoverage"];

export function heatRiskLabel(index: number): "Low" | "Medium" | "High" {
  return index < 60 ? "Low" : index < 72 ? "Medium" : "High";
}

/** Human formatting for any scenario metric (unit aware). */
export function formatMetric(id: ScenarioMetricId, value: number, opts: { withUnit?: boolean } = {}): string {
  const def = METRICS[id];
  const withUnit = opts.withUnit ?? true;
  switch (def.unit) {
    case "people":
      return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
    case "percent":
      return `${value.toFixed(def.decimals)}${withUnit ? "%" : ""}`;
    case "FAR":
      return value.toFixed(2);
    case "floors":
      return withUnit ? `${Math.round(value)} floors` : `${Math.round(value)}`;
    case "index":
      return withUnit ? `${heatRiskLabel(value)} (${Math.round(value)})` : `${Math.round(value)}`;
    case "score":
    default:
      return `${Math.round(value)}`;
  }
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

export const GOALS: GoalDefinition[] = [
  { id: "environment", label: "Environmental Performance", hint: "Overall environmental score", metric: "environment", target: 90 },
  { id: "mobility", label: "Mobility", hint: "Walkability and network access", metric: "mobility", target: 85 },
  { id: "green", label: "Green Coverage", hint: "Share of the site under green cover", metric: "greenCoverage", target: 25 },
  { id: "solar", label: "Solar Exposure", hint: "Facade and open-space daylight", metric: "solar", target: 80 },
  { id: "heat", label: "Heat Reduction", hint: "Lower urban heat index", metric: "heatIndex", target: 60 },
  { id: "density", label: "Density Balance", hint: "Even distribution of built intensity", metric: "urbanForm", target: 85 },
  { id: "landuse", label: "Land Use Efficiency", hint: "Floor area delivered per hectare", metric: "far", target: 0.75 },
  { id: "publicspace", label: "Public Space", hint: "Publicly accessible open space", metric: "publicOpenSpace", target: 15 },
  { id: "carbon", label: "Carbon Reduction", hint: "Operational and embodied carbon", metric: "carbon", target: 80 },
];

export const GOAL_ICONS: Record<GoalId, LucideIcon> = {
  environment: Leaf,
  mobility: Footprints,
  green: TreePine,
  solar: Sun,
  heat: Flame,
  density: Layers3,
  landuse: Scale,
  publicspace: Wind,
  carbon: CarFront,
};

export const PRIORITIES: { id: GoalPriority; label: string; weight: number }[] = [
  { id: "low", label: "Low", weight: 0.5 },
  { id: "medium", label: "Medium", weight: 1 },
  { id: "high", label: "High", weight: 1.6 },
];

export function priorityWeight(p: GoalPriority): number {
  return PRIORITIES.find((x) => x.id === p)?.weight ?? 1;
}

/** Example configuration from the specification. */
export const DEFAULT_GOALS: PlanningGoal[] = [
  { id: "environment", priority: "medium" },
  { id: "mobility", priority: "high" },
  { id: "green", priority: "high" },
  { id: "solar", priority: "medium" },
  { id: "heat", priority: "medium" },
  { id: "density", priority: "medium" },
  { id: "landuse", priority: "low" },
  { id: "publicspace", priority: "medium" },
  { id: "carbon", priority: "medium" },
];

// ---------------------------------------------------------------------------
// Objective weights
// ---------------------------------------------------------------------------

export const OBJECTIVES: ObjectiveDefinition[] = [
  { id: "environment", label: "Environment", hint: "Solar, heat, wind and ecology", metric: "environment" },
  { id: "mobility", label: "Mobility", hint: "Walkability and access", metric: "mobility" },
  { id: "green", label: "Green Space", hint: "Parks, corridors and canopy", metric: "greenInfrastructure" },
  { id: "density", label: "Density", hint: "Built intensity and urban form", metric: "urbanForm" },
  { id: "carbon", label: "Carbon", hint: "Operational and embodied carbon", metric: "carbon" },
];

export const DEFAULT_WEIGHTS: ObjectiveWeight[] = [
  { id: "environment", weight: 30 },
  { id: "mobility", weight: 25 },
  { id: "green", weight: 20 },
  { id: "density", weight: 15 },
  { id: "carbon", weight: 10 },
];

/**
 * Move one objective to `value` and rebalance the others proportionally so the
 * total is always exactly 100 (largest-remainder rounding, no invalid states).
 */
export function rebalanceWeights(weights: ObjectiveWeight[], id: ObjectiveId, value: number): ObjectiveWeight[] {
  const target = Math.max(0, Math.min(100, Math.round(value)));
  const others = weights.filter((w) => w.id !== id);
  const otherSum = others.reduce((s, w) => s + w.weight, 0);
  const remaining = 100 - target;
  const raw = others.map((w) => ({ id: w.id, exact: otherSum > 0 ? (w.weight / otherSum) * remaining : remaining / Math.max(1, others.length) }));
  const floored = raw.map((r) => ({ id: r.id, weight: Math.floor(r.exact), frac: r.exact - Math.floor(r.exact) }));
  let leftover = remaining - floored.reduce((s, r) => s + r.weight, 0);
  const order = [...floored].sort((a, b) => b.frac - a.frac);
  for (const r of order) {
    if (leftover <= 0) break;
    r.weight += 1;
    leftover -= 1;
  }
  return weights.map((w) => (w.id === id ? { id, weight: target } : { id: w.id, weight: floored.find((f) => f.id === w.id)?.weight ?? 0 }));
}

export function weightsTotal(weights: ObjectiveWeight[]): number {
  return weights.reduce((s, w) => s + w.weight, 0);
}

// ---------------------------------------------------------------------------
// Constraints
// ---------------------------------------------------------------------------

export const CONSTRAINTS: ConstraintDefinition[] = [
  { id: "max-height", label: "Max Building Height", unit: "floors", kind: "max", metric: "maxFloors", min: 4, max: 30, step: 1, subject: "Tallest building" },
  { id: "min-green", label: "Min Green Coverage", unit: "%", kind: "min", metric: "greenCoverage", min: 5, max: 50, step: 1, subject: "Green coverage" },
  { id: "max-coverage", label: "Max Site Coverage", unit: "%", kind: "max", metric: "siteCoverage", min: 30, max: 90, step: 1, subject: "Site coverage" },
  { id: "min-openspace", label: "Min Public Open Space", unit: "%", kind: "min", metric: "publicOpenSpace", min: 5, max: 40, step: 1, subject: "Public open space" },
  { id: "max-far", label: "Max FAR", unit: "FAR", kind: "max", metric: "far", min: 0.2, max: 3, step: 0.05, subject: "FAR" },
  { id: "max-population", label: "Max Population", unit: "people", kind: "max", metric: "populationCapacity", min: 1000, max: 60000, step: 100, subject: "Population" },
];

export function getConstraintDef(id: ConstraintId): ConstraintDefinition {
  return CONSTRAINTS.find((c) => c.id === id) ?? CONSTRAINTS[0];
}

export const DEFAULT_CONSTRAINTS: PlanningConstraint[] = [
  { id: "max-height", value: 12, enabled: true },
  { id: "min-green", value: 25, enabled: true },
  { id: "max-coverage", value: 70, enabled: true },
  { id: "min-openspace", value: 15, enabled: true },
  { id: "max-far", value: 0.8, enabled: true },
  { id: "max-population", value: 15000, enabled: true },
];

/**
 * Defaults adapt to the project so the configured limits are meaningful for
 * every demo dataset (the walkthrough project resolves to the specification's
 * example values: 12 floors · 25% · 70% · 15% · FAR 0.80 · 15,000 people).
 */
export function defaultInputsFor(current: CurrentPlan): OptimizationInputs {
  const m = current.metrics;
  const maxHeight = m.maxFloors <= 13 ? 12 : Math.ceil(m.maxFloors / 2) * 2;
  const minGreen = Math.max(5, Math.min(50, Math.round(current.greenTarget)));
  const maxCoverage = m.siteCoverage <= 68 ? 70 : Math.min(90, Math.ceil((m.siteCoverage + 2) / 5) * 5);
  const minOpenSpace = m.publicOpenSpace >= 15 ? 15 : Math.max(5, Math.floor(m.publicOpenSpace));
  const maxFar = m.far > 0 ? Math.max(0.2, Math.round((m.far * 1.3) / 0.05) * 0.05) : 0.8;
  const maxPopulation = m.populationCapacity > 0 ? Math.max(1000, Math.round((m.populationCapacity * 1.2) / 100) * 100) : 15000;
  const values: Record<ConstraintId, number> = { "max-height": maxHeight, "min-green": minGreen, "max-coverage": maxCoverage, "min-openspace": minOpenSpace, "max-far": Number(maxFar.toFixed(2)), "max-population": maxPopulation };
  return {
    goals: DEFAULT_GOALS.map((g) => ({ ...g })),
    weights: DEFAULT_WEIGHTS.map((w) => ({ ...w })),
    constraints: DEFAULT_CONSTRAINTS.map((c) => ({ ...c, value: values[c.id] })),
  };
}

export function formatConstraintValue(id: ConstraintId, value: number): string {
  const def = getConstraintDef(id);
  if (def.unit === "people") return value.toLocaleString("en-US");
  if (def.unit === "FAR") return value.toFixed(2);
  if (def.unit === "%") return `${Math.round(value)}%`;
  return `${Math.round(value)} ${def.unit}`;
}

// ---------------------------------------------------------------------------
// Scenario vocabulary
// ---------------------------------------------------------------------------

export const SCENARIO_KINDS: { kind: ScenarioKind; letter: "A" | "B" | "C" | "D"; name: string; icon: LucideIcon; blurb: string }[] = [
  { kind: "balanced", letter: "A", name: "Balanced Growth", icon: Scale, blurb: "Balanced improvement across environment, mobility and development." },
  { kind: "green", letter: "B", name: "Green Priority", icon: Leaf, blurb: "Prioritizes green infrastructure and heat reduction while maintaining development capacity." },
  { kind: "mobility", letter: "C", name: "Mobility First", icon: Footprints, blurb: "Strengthens the street and path network and access to transit at the cost of some open development area." },
  { kind: "compact", letter: "D", name: "Compact City", icon: Building2, blurb: "Concentrates density around the core to raise capacity and land-use efficiency; heat risk needs mitigation." },
];

export function getScenarioKind(kind: ScenarioKind) {
  return SCENARIO_KINDS.find((k) => k.kind === kind) ?? SCENARIO_KINDS[0];
}

export const STATUS_META: Record<ScenarioStatus, { label: string; tone: string; dot: string }> = {
  Draft: { label: "Draft", tone: "bg-surface-2 text-muted ring-line", dot: "bg-faint" },
  Generated: { label: "Generated", tone: "bg-primary/10 text-primary ring-primary/20", dot: "bg-primary" },
  Reviewed: { label: "Reviewed", tone: "bg-accent/10 text-accent ring-accent/20", dot: "bg-accent" },
  Selected: { label: "Selected", tone: "bg-success/10 text-success ring-success/20", dot: "bg-success" },
  Archived: { label: "Archived", tone: "bg-surface-2 text-faint ring-line", dot: "bg-faint" },
};

export const CHANGE_LEGEND: { kind: SpatialChangeKind; label: string; fill: string; stroke: string; description: string }[] = [
  { kind: "added", label: "Added", fill: "#34D399", stroke: "#059669", description: "New in this scenario" },
  { kind: "modified", label: "Modified", fill: "#60A5FA", stroke: "#1D4ED8", description: "Height, use or width changed" },
  { kind: "removed", label: "Removed", fill: "#FCA5A5", stroke: "#DC2626", description: "Not part of this scenario" },
  { kind: "unchanged", label: "Unchanged", fill: "#E2E8F0", stroke: "#94A3B8", description: "Same as the current plan" },
];

export const CHANGE_TYPE_META: Record<"Added" | "Reduced" | "Moved" | "Reconfigured", { tone: string; sign: string }> = {
  Added: { tone: "bg-success/10 text-success ring-success/20", sign: "+" },
  Reduced: { tone: "bg-warning/10 text-warning ring-warning/20", sign: "−" },
  Moved: { tone: "bg-primary/10 text-primary ring-primary/20", sign: "→" },
  Reconfigured: { tone: "bg-accent/10 text-accent ring-accent/20", sign: "↻" },
};

// ---------------------------------------------------------------------------
// Generation choreography (local processing, not a network request)
// ---------------------------------------------------------------------------

export const GENERATION_STEPS: GenerationStep[] = [
  { id: "prepare", label: "Preparing current plan", weight: 0.9 },
  { id: "constraints", label: "Evaluating constraints", weight: 1 },
  { id: "alternatives", label: "Testing alternatives", weight: 1.6 },
  { id: "scoring", label: "Scoring scenarios", weight: 1.1 },
  { id: "comparison", label: "Preparing comparison", weight: 0.8 },
];

export const GENERATION_DURATION_MS = 3000;
export const GENERATION_DURATION_REDUCED_MS = 480;
export const HISTORY_LIMIT = 6;

export function scoreStatus(score: number): "good" | "moderate" | "attention" {
  return score >= 75 ? "good" : score >= 55 ? "moderate" : "attention";
}
