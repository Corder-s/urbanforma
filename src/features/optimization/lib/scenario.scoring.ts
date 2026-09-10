import type { AnalysisResult } from "../../analysis/types/analysis.types";
import type { SpatialDataset } from "../../visualization/types/visualization.types";
import { CONSTRAINTS, GOALS, METRICS, OBJECTIVES, formatMetric, getConstraintDef, heatRiskLabel } from "../data/optimization.data";
import type {
  ConstraintCheck,
  ConstraintVerdict,
  CurrentPlan,
  ObjectiveWeight,
  PlanningConstraint,
  ScenarioMetricId,
  ScenarioMetrics,
  ScenarioObjectives,
  Tradeoff,
} from "../types/optimization.types";
import { tallestProposedFloors } from "./scenario.spatial";

/**
 * Pure scoring helpers shared by the demo provider and the UI.
 *
 *   score = current overall
 *         + 1.6 × Σ weight_i × (objective_i(scenario) − objective_i(current)) / 100
 *         − constraint penalty (0.5 per warning, 1 per failure, capped at 4)
 *
 * Weights are a scoring concern only, so the UI re-scores live when they
 * change — metrics and spatial states never need recomputation for that.
 */

// ---------------------------------------------------------------------------
// Current plan ← Step 13 analysis result (no calculations re-implemented here)
// ---------------------------------------------------------------------------

function metricValue(analysis: AnalysisResult, id: string, fallback: number): number {
  const m = analysis.metrics.find((x) => x.id === id);
  return m && Number.isFinite(m.value) ? m.value : fallback;
}

function breakdown(analysis: AnalysisResult, id: "environment" | "mobility" | "urbanform" | "green" | "carbon", fallback: number): number {
  return analysis.breakdown.find((b) => b.id === id)?.score ?? fallback;
}

export function deriveCurrentPlan(spatial: SpatialDataset, analysis: AnalysisResult): CurrentPlan {
  const tallest = tallestProposedFloors(spatial.objects) || spatial.objects.reduce((m, o) => (o.type === "building" ? Math.max(m, o.properties.floors) : m), 0);
  const metrics: ScenarioMetrics = {
    environment: breakdown(analysis, "environment", 80),
    mobility: breakdown(analysis, "mobility", 75),
    urbanForm: breakdown(analysis, "urbanform", 80),
    greenInfrastructure: breakdown(analysis, "green", 80),
    carbon: metricValue(analysis, "carbon-performance", breakdown(analysis, "carbon", 70)),
    greenCoverage: metricValue(analysis, "green-coverage", spatial.summary.greenCoveragePct),
    heatIndex: metricValue(analysis, "heat-index", 65),
    solar: metricValue(analysis, "solar-avg", 75),
    populationCapacity: spatial.summary.populationCapacity,
    far: metricValue(analysis, "density-far", 0.6),
    maxFloors: tallest,
    siteCoverage: metricValue(analysis, "density-utilization", 65),
    publicOpenSpace: metricValue(analysis, "openspace-public", 15),
  };
  return { metrics, objectives: objectivesFromMetrics(metrics), score: analysis.overallScore, greenTarget: metricValue(analysis, "green-target", 25) };
}

export function objectivesFromMetrics(m: ScenarioMetrics): ScenarioObjectives {
  return { environment: m.environment, mobility: m.mobility, green: m.greenInfrastructure, density: m.urbanForm, carbon: m.carbon };
}

// ---------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------

/**
 * Objective deltas of a few points would barely move a 0–100 score, so the
 * weighted delta is amplified — the weights panel visibly re-ranks scenarios.
 */
export const OBJECTIVE_AMPLIFICATION = 1.6;

/** Σ weight_i × (objective_i(scenario) − objective_i(current)) / 100 */
export function weightedObjectiveDelta(objectives: ScenarioObjectives, current: ScenarioObjectives, weights: ObjectiveWeight[]): number {
  const total = weights.reduce((s, w) => s + w.weight, 0) || 100;
  let sum = 0;
  for (const o of OBJECTIVES) {
    const w = weights.find((x) => x.id === o.id)?.weight ?? 0;
    sum += (w / total) * (objectives[o.id] - current[o.id]);
  }
  return sum;
}

export function constraintPenalty(checks: ConstraintCheck[]): number {
  let p = 0;
  for (const c of checks) p += c.verdict === "fail" ? 1 : c.verdict === "warning" ? 0.5 : 0;
  return Math.min(4, p);
}

export interface ScoreParts {
  /** Overall score of the current plan (Step 13 analysis). */
  base: number;
  /** Amplified weighted objective delta versus the current plan. */
  objectiveDelta: number;
  penalty: number;
  score: number;
}

/** score = current overall + amplified weighted objective delta − constraint penalty, clamped to 0–100. */
export function scoreParts(objectives: ScenarioObjectives, current: CurrentPlan, weights: ObjectiveWeight[], checks: ConstraintCheck[]): ScoreParts {
  const objectiveDelta = weightedObjectiveDelta(objectives, current.objectives, weights) * OBJECTIVE_AMPLIFICATION;
  const penalty = constraintPenalty(checks);
  const score = Math.max(0, Math.min(100, Math.round(current.score + objectiveDelta - penalty)));
  return { base: current.score, objectiveDelta, penalty, score };
}

// ---------------------------------------------------------------------------
// Constraint checks
// ---------------------------------------------------------------------------

function verdictFor(unit: string, over: number, limit: number): ConstraintVerdict {
  if (over <= 0) return "pass";
  switch (unit) {
    case "floors":
      return over <= 1 ? "warning" : "fail";
    case "%":
      return over <= 3 ? "warning" : "fail";
    case "FAR":
      return over <= 0.05 + 1e-9 ? "warning" : "fail";
    case "people":
      return over <= limit * 0.05 ? "warning" : "fail";
    default:
      return "warning";
  }
}

function amountText(unit: string, amount: number): string {
  switch (unit) {
    case "floors":
      return `${Math.round(amount)} floor${Math.round(amount) === 1 ? "" : "s"}`;
    case "%":
      return `${amount.toFixed(amount % 1 === 0 ? 0 : 1)} percentage point${amount === 1 ? "" : "s"}`;
    case "FAR":
      return amount.toFixed(2);
    case "people":
      return Math.round(amount).toLocaleString("en-US");
    default:
      return `${amount}`;
  }
}

export function checkConstraints(metrics: ScenarioMetrics, constraints: PlanningConstraint[]): ConstraintCheck[] {
  return CONSTRAINTS.map((def) => {
    const c = constraints.find((x) => x.id === def.id) ?? { id: def.id, value: def.min, enabled: false };
    const value = metrics[def.metric];
    if (!c.enabled) return { constraintId: def.id, verdict: "off" as const, value, limit: c.value, message: `${def.label} is not enforced.` };
    const overRaw = def.kind === "max" ? value - c.value : c.value - value;
    const over = def.unit === "people" ? Math.round(overRaw) : Number(overRaw.toFixed(2));
    const verdict = verdictFor(def.unit, over, c.value);
    let message: string;
    if (verdict === "pass") {
      const headroom = Math.abs(over);
      message = def.kind === "max" ? `${def.subject} is ${formatMetric(def.metric, value)}, within the ${formatLimit(def.id, c.value)} limit${headroomText(def.unit, headroom)}.` : `${def.subject} is ${formatMetric(def.metric, value)}, above the ${formatLimit(def.id, c.value)} minimum${headroomText(def.unit, headroom)}.`;
    } else {
      message = def.kind === "max" ? `${def.subject} exceeds configured limit by ${amountText(def.unit, over)}.` : `${def.subject} is ${amountText(def.unit, over)} below the configured minimum.`;
    }
    return { constraintId: def.id, verdict, value, limit: c.value, message };
  });
}

function headroomText(unit: string, headroom: number): string {
  if (headroom <= 0) return "";
  return ` (${amountText(unit, Number(headroom.toFixed(2)))} to spare)`;
}

export function formatLimit(id: PlanningConstraint["id"], value: number): string {
  const def = getConstraintDef(id);
  if (def.unit === "people") return `${value.toLocaleString("en-US")}-person`;
  if (def.unit === "FAR") return `FAR ${value.toFixed(2)}`;
  if (def.unit === "%") return `${Math.round(value)}%`;
  return `${Math.round(value)}-floor`;
}

export function summariseChecks(checks: ConstraintCheck[]): { pass: number; warning: number; fail: number; off: number; worst: ConstraintVerdict } {
  const s = { pass: 0, warning: 0, fail: 0, off: 0 };
  for (const c of checks) s[c.verdict]++;
  const worst: ConstraintVerdict = s.fail > 0 ? "fail" : s.warning > 0 ? "warning" : s.pass > 0 ? "pass" : "off";
  return { ...s, worst };
}

// ---------------------------------------------------------------------------
// Trade-offs (scenario vs current plan)
// ---------------------------------------------------------------------------

const TRADEOFF_METRICS: { metric: ScenarioMetricId; label: string; mode: "points" | "pct" | "pctOfValue" }[] = [
  { metric: "greenCoverage", label: "Green Coverage", mode: "pct" },
  { metric: "heatIndex", label: "Heat Risk", mode: "pctOfValue" },
  { metric: "populationCapacity", label: "Population Capacity", mode: "pctOfValue" },
  { metric: "mobility", label: "Mobility", mode: "points" },
  { metric: "environment", label: "Environmental Performance", mode: "points" },
  { metric: "carbon", label: "Carbon Performance", mode: "points" },
  { metric: "solar", label: "Solar Exposure", mode: "points" },
  { metric: "far", label: "Floor Area Ratio", mode: "pctOfValue" },
];

export function deriveTradeoffs(metrics: ScenarioMetrics, current: ScenarioMetrics): Tradeoff[] {
  const out: Tradeoff[] = [];
  for (const t of TRADEOFF_METRICS) {
    const def = METRICS[t.metric];
    const cur = current[t.metric];
    const val = metrics[t.metric];
    const raw = val - cur;
    let delta: number;
    let deltaText: string;
    if (t.mode === "pctOfValue") {
      delta = cur === 0 ? 0 : (raw / cur) * 100;
      deltaText = `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${Math.abs(delta).toFixed(1)}%`;
    } else if (t.mode === "pct") {
      delta = raw;
      deltaText = `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${Math.abs(delta).toFixed(1)}%`;
    } else {
      delta = raw;
      deltaText = `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${Math.abs(Math.round(delta))}`;
    }
    const flat = Math.abs(delta) < (t.mode === "points" ? 0.5 : 0.05);
    const improvedRaw = def.higherIsBetter ? raw > 0 : raw < 0;
    out.push({
      id: `to-${t.metric}`,
      label: t.label,
      metric: t.metric,
      delta: Number(delta.toFixed(2)),
      deltaText: flat ? "±0" : deltaText,
      direction: flat ? "flat" : raw > 0 ? "up" : "down",
      improved: flat ? null : improvedRaw,
    });
  }
  // most significant first, keep six
  return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 6);
}

// ---------------------------------------------------------------------------
// Goal performance
// ---------------------------------------------------------------------------

export interface GoalRow {
  goalId: (typeof GOALS)[number]["id"];
  label: string;
  metric: ScenarioMetricId;
  target: number;
  current: number;
  /** 0–100 attainment of the target (100 = met or exceeded). */
  progress: (value: number) => number;
  format: (value: number) => string;
  targetText: string;
}

export function goalRows(current: CurrentPlan): GoalRow[] {
  return GOALS.map((g) => {
    const def = METRICS[g.metric];
    const target = g.id === "green" ? current.greenTarget : g.target;
    const progress = (value: number) => {
      if (def.higherIsBetter) return Math.max(0, Math.min(100, (value / Math.max(1e-6, target)) * 100));
      // lower is better (heat index): full marks at or below target, zero at target + 40
      return Math.max(0, Math.min(100, ((target + 40 - value) / 40) * 100));
    };
    const format = (v: number) => (g.metric === "heatIndex" ? `${heatRiskLabel(v)} · ${Math.round(v)}` : formatMetric(g.metric, v));
    return {
      goalId: g.id,
      label: g.label,
      metric: g.metric,
      target,
      current: current.metrics[g.metric],
      progress,
      format,
      targetText: g.metric === "heatIndex" ? `≤ ${Math.round(target)}` : `${def.higherIsBetter ? "≥ " : "≤ "}${formatMetric(g.metric, target)}`,
    };
  });
}

export const OBJECTIVE_LABEL: Record<ObjectiveWeight["id"], string> = Object.fromEntries(OBJECTIVES.map((o) => [o.id, o.label])) as Record<ObjectiveWeight["id"], string>;
