import type { AnalysisResult } from "../../analysis/types/analysis.types";
import { heatRiskLabel } from "../../optimization/data/optimization.data";
import { lengthOfLine } from "../../optimization/lib/scenario.spatial";
import type { HeatRisk, OptimizationScenario, ScenarioMetrics } from "../../optimization/types/optimization.types";
import type { PresentationMetricId, SpatialDataset } from "../types/visualization.types";

/**
 * Scenario options shown by the visualization: the current plan plus the
 * Step 14 planning scenarios (Balanced Growth, Green Priority, Mobility First,
 * Compact City). Every option carries the dataset the renderers draw and the
 * headline metrics Present mode displays. Nothing is recalculated here —
 * scores come from the Step 13 analysis (current plan) and from the Step 14
 * scenario metrics; the few derived figures are labelled as estimates.
 */
export interface MetricValue {
  value: number;
  display: string;
  /** Marks values that are derived / estimated for scenarios rather than analysed. */
  estimated?: boolean;
}

export interface ScenarioOption {
  /** `null` = current plan, otherwise the Step 14 scenario kind (stable across generations). */
  id: string | null;
  name: string;
  /** "A" … "D" for generated scenarios. */
  letter: string | null;
  description: string;
  dataset: SpatialDataset;
  metrics: Record<PresentationMetricId, MetricValue>;
  heatIndex: number;
  heatRisk: HeatRisk;
  /** Overall planning score (0–100). */
  score: number;
  preferred: boolean;
  /** Status from the optimization workspace, when known. */
  status: string | null;
}

export const CURRENT_PLAN_NAME = "Current Plan";

function km(dataset: SpatialDataset): number {
  let m = 0;
  for (const o of dataset.objects) if ((o.type === "road" || o.type === "path") && !o.id.startsWith("ctx-")) m += lengthOfLine(o.geometry.points);
  return m / 1000;
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function metricOf(analysis: AnalysisResult, id: string, fallback: number): number {
  const m = analysis.metrics.find((x) => x.id === id);
  return m && Number.isFinite(m.value) ? m.value : fallback;
}

export function buildMetrics(dataset: SpatialDataset, m: ScenarioMetrics, score: number, walkability: number, roadKm: number, estimated: boolean): Record<PresentationMetricId, MetricValue> {
  return {
    environmentalScore: { value: score, display: `${Math.round(score)} / 100` },
    greenCoverage: { value: m.greenCoverage, display: `${m.greenCoverage.toFixed(1)}%` },
    population: { value: m.populationCapacity, display: fmtInt(m.populationCapacity) },
    siteArea: { value: dataset.summary.siteAreaHa, display: `${dataset.summary.siteAreaHa.toFixed(1)} ha` },
    buildings: { value: dataset.summary.buildings, display: fmtInt(dataset.summary.buildings) },
    roadNetwork: { value: roadKm, display: `${roadKm.toFixed(1)} km`, estimated },
    walkability: { value: walkability, display: `${Math.round(walkability)} / 100`, estimated },
    carbon: { value: m.carbon, display: `${Math.round(m.carbon)} / 100` },
  };
}

export function currentPlanOption(dataset: SpatialDataset, analysis: AnalysisResult, current: { metrics: ScenarioMetrics; score: number }): ScenarioOption {
  const walk = metricOf(analysis, "walkability", 70);
  return {
    id: null,
    name: CURRENT_PLAN_NAME,
    letter: null,
    description: "The plan as currently designed in the Planning Studio.",
    dataset,
    metrics: buildMetrics(dataset, current.metrics, current.score, walk, dataset.summary.roadNetworkKm, false),
    heatIndex: current.metrics.heatIndex,
    heatRisk: heatRiskLabel(current.metrics.heatIndex),
    score: current.score,
    preferred: false,
    status: null,
  };
}

export function scenarioOption(base: SpatialDataset, baseAnalysis: AnalysisResult, current: { metrics: ScenarioMetrics }, scenario: OptimizationScenario, dataset: SpatialDataset, preferred: boolean): ScenarioOption {
  const baseWalk = metricOf(baseAnalysis, "walkability", 70);
  const walk = Math.max(0, Math.min(100, baseWalk + (scenario.metrics.mobility - current.metrics.mobility)));
  const roadKm = Math.max(0, base.summary.roadNetworkKm + (km(dataset) - km(base)));
  return {
    id: scenario.kind,
    name: scenario.name,
    letter: scenario.letter,
    description: scenario.description,
    dataset,
    metrics: buildMetrics(dataset, scenario.metrics, scenario.score, walk, roadKm, true),
    heatIndex: scenario.metrics.heatIndex,
    heatRisk: heatRiskLabel(scenario.metrics.heatIndex),
    score: scenario.score,
    preferred,
    status: scenario.status,
  };
}

/** Badge text — "Green Priority · Preferred" or "Current Plan". */
export function scenarioBadge(o: ScenarioOption | null): string {
  if (!o || o.id === null) return CURRENT_PLAN_NAME;
  return o.preferred ? `${o.name} · Preferred` : o.name;
}

export interface ComparisonRow {
  id: string;
  label: string;
  before: string;
  after: string;
  /** Plain-language change, never colour-only. */
  change: "improved" | "reduced" | "unchanged";
  changeText: string;
  higherIsBetter: boolean;
}

/** Before/After rows: Green Coverage, Environmental Score, Heat Risk, Population (+ carbon, walkability). */
export function compareOptions(before: ScenarioOption, after: ScenarioOption): ComparisonRow[] {
  const rows: ComparisonRow[] = [];
  const num = (id: string, label: string, b: MetricValue, a: MetricValue, higherIsBetter: boolean, unit: string, decimals = 0) => {
    const delta = a.value - b.value;
    const same = Math.abs(delta) < (decimals ? 0.05 : 0.5);
    const better = higherIsBetter ? delta > 0 : delta < 0;
    rows.push({
      id,
      label,
      before: b.display,
      after: a.display,
      change: same ? "unchanged" : better ? "improved" : "reduced",
      changeText: same ? "No change" : `${delta > 0 ? "+" : "−"}${Math.abs(delta).toLocaleString("en-US", { maximumFractionDigits: decimals })}${unit}`,
      higherIsBetter,
    });
  };
  num("green", "Green Coverage", before.metrics.greenCoverage, after.metrics.greenCoverage, true, " pts", 1);
  num("score", "Environmental Score", before.metrics.environmentalScore, after.metrics.environmentalScore, true, " pts");
  const order: HeatRisk[] = ["Low", "Medium", "High"];
  const hb = order.indexOf(before.heatRisk);
  const ha = order.indexOf(after.heatRisk);
  rows.push({
    id: "heat",
    label: "Heat Risk",
    before: before.heatRisk,
    after: after.heatRisk,
    change: ha === hb ? "unchanged" : ha < hb ? "improved" : "reduced",
    changeText: ha === hb ? "No change" : ha < hb ? "Lower risk" : "Higher risk",
    higherIsBetter: false,
  });
  num("population", "Population Capacity", before.metrics.population, after.metrics.population, true, "");
  num("carbon", "Carbon Performance", before.metrics.carbon, after.metrics.carbon, true, " pts");
  num("walk", "Walkability", before.metrics.walkability, after.metrics.walkability, true, " pts");
  return rows;
}
