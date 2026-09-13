import { formatDate, formatNumber, formatSiteArea } from "../../projects/project.service";
import { getCategory, STATUS_META } from "../../analysis/data/analysis.data";
import {
  COMPARE_METRICS,
  CONSTRAINTS,
  GOALS,
  METRICS,
  OBJECTIVES,
  formatConstraintValue,
  formatMetric,
} from "../../optimization/data/optimization.data";
import { currentChecks, scenarioLabel } from "../../optimization/services/optimization.service";
import type { AnalysisMetric } from "../../analysis/types/analysis.types";
import type { ScenarioMetricId } from "../../optimization/types/optimization.types";
import type { ReportComparisonRow, ReportConfig, ReportMetric, ReportModel } from "../types/report.types";

/**
 * Pure derivations from the report model.
 *
 * Everything a section prints is computed here — components stay presentational
 * and no number is ever hard-coded in the document. Labels, units and metric
 * vocabulary are imported from the modules that own them (analysis.data,
 * optimization.data), so the report cannot drift from the workspace it reports on.
 */

/** A label / value row of the document's definition tables. */
export interface DocRow {
  label: string;
  value: string;
  note?: string;
}

export interface ScoreRow {
  id: string;
  label: string;
  score: number;
}

export interface GoalRow {
  id: string;
  label: string;
  priority: string;
  target: string;
  current: string;
  /** Fraction of the target reached (0–1+), for the indicator bar. */
  progress: number;
}

export interface ConstraintRow {
  id: string;
  label: string;
  limit: string;
  value: string;
  verdict: "pass" | "warning" | "fail" | "off";
  enabled: boolean;
  message: string;
}

export interface ScenarioRow {
  id: string;
  letter: string;
  name: string;
  kindLabel: string;
  statusLabel: string;
  description: string;
  score: number;
  selected: boolean;
  metrics: { id: string; label: string; value: string }[];
  violations: number;
  warnings: number;
}

export interface InsightRow {
  id: string;
  text: string;
  group: string;
  status: ReportMetric["status"];
  statusLabel: string;
}

export interface RecommendationRow {
  id: string;
  text: string;
  source: string;
  priority: "high" | "medium" | "low";
}

export interface ViewRow {
  id: string;
  name: string;
  mode: string;
  viewMode: string;
  basemap: string;
  scenario: string;
  metrics: number;
  annotations: number;
  createdAt: string;
}

const statusToReport = (s: AnalysisMetric["status"]): NonNullable<ReportMetric["status"]> =>
  s === "good" ? "good" : s === "moderate" ? "watch" : s === "attention" ? "poor" : "neutral";

/** Unit-aware number formatting for the analysis vocabulary (MetricUnit). */
export function formatAnalysisNumber(value: number, unit: AnalysisMetric["unit"]): string {
  switch (unit) {
    case "percent":
      return `${value.toFixed(1)}%`;
    case "score":
      return `${Math.round(value)}`;
    case "ha":
      return `${value.toFixed(1)} ha`;
    case "km":
      return `${value.toFixed(2)} km`;
    case "m/s":
      return `${value.toFixed(1)} m/s`;
    case "people/ha":
      return `${Math.round(value)} people/ha`;
    case "FAR":
      return value.toFixed(2);
    case "floors":
      return `${Math.round(value)} floors`;
    case "tCO2e":
      return `${formatNumber(value)} t CO₂e`;
    default:
      return formatNumber(value);
  }
}

/** Unit-aware formatting for analysis metrics (mirrors the analysis vocabulary). */
export function analysisValue(m: AnalysisMetric): string {
  if (m.text && !Number.isFinite(m.value)) return m.text;
  return formatAnalysisNumber(m.value, m.unit);
}

function toMetric(m: AnalysisMetric): ReportMetric {
  return {
    id: m.id,
    label: m.name,
    value: analysisValue(m),
    score: m.score,
    status: statusToReport(m.status),
    note: m.interpretation,
  };
}

function metricsOfGroup(model: ReportModel, group: string): ReportMetric[] {
  if (!model.analysis) return [];
  return model.analysis.metrics.filter((m) => getCategory(m.category).group === group).map(toMetric);
}

export const environmentalMetrics = (model: ReportModel): ReportMetric[] => metricsOfGroup(model, "Environment");
export const mobilityMetrics = (model: ReportModel): ReportMetric[] => metricsOfGroup(model, "Mobility");
export const urbanFormMetrics = (model: ReportModel): ReportMetric[] => metricsOfGroup(model, "Urban Form");

export function scoreBreakdown(model: ReportModel): ScoreRow[] {
  if (!model.analysis) return [];
  return model.analysis.breakdown.map((b) => ({ id: b.id, label: b.label, score: b.score }));
}

// ---------------------------------------------------------------------------
// Project / site / plan tables
// ---------------------------------------------------------------------------

export function projectRows(model: ReportModel): DocRow[] {
  const p = model.project;
  if (!p) return [];
  const rows: DocRow[] = [
    { label: "Project", value: p.name },
    { label: "Reference", value: p.id },
    { label: "Type", value: p.type },
    { label: "Status", value: p.status },
    { label: "Location", value: p.location },
    { label: "Site area", value: formatSiteArea(p.siteAreaHa) },
    { label: "Progress", value: `${p.progress}%`, note: p.stage },
    { label: "Created", value: formatDate(p.createdAtIso) },
    { label: "Last updated", value: formatDate(p.updatedAtIso), note: p.updatedAt },
    { label: "Lead", value: `${p.owner.name}`, note: `${p.owner.role} · ${p.owner.email}` },
  ];
  if (p.description) rows.splice(1, 0, { label: "Description", value: p.description });
  return rows;
}

export function stageRows(model: ReportModel): DocRow[] {
  const p = model.project;
  if (!p) return [];
  return p.stages.map((s) => ({ label: s.label, value: s.status, note: `${s.progress}% · ${s.summary}` }));
}

export function siteRows(model: ReportModel): DocRow[] {
  const rows: DocRow[] = [];
  const ctx = model.project?.siteContext;
  if (ctx) {
    rows.push(
      { label: "Location", value: ctx.location },
      { label: "Site centre", value: `${ctx.center.lat.toFixed(4)}, ${ctx.center.lng.toFixed(4)}`, note: "WGS84 decimal degrees (demo coordinates)" },
      { label: "Site area", value: formatSiteArea(ctx.siteAreaHa) },
      { label: "Terrain", value: ctx.terrain },
      { label: "Existing development", value: ctx.existingDevelopment },
      { label: "Accessibility", value: ctx.accessibility }
    );
    if (ctx.zoning) rows.push({ label: "Zoning", value: ctx.zoning });
  }
  const plan = model.planning;
  if (plan) {
    rows.push(
      { label: "Boundary", value: plan.boundaryStatus },
      { label: "Coordinate system", value: plan.coordinateSystem },
      { label: "Surrounding blocks", value: formatNumber(plan.context.blocks) },
      { label: "Surrounding streets", value: formatNumber(plan.context.roads) },
      { label: "Transit", value: plan.context.transitStations ? `${plan.context.transitLines} line · ${plan.context.transitStations} stations` : "None mapped" },
      { label: "Utilities", value: `${formatNumber(plan.context.utilities)} networks` },
      { label: "Street trees", value: formatNumber(plan.context.streetTrees) },
      { label: "Terrain contours", value: formatNumber(plan.context.contours) }
    );
  }
  return rows;
}

export function planCompositionRows(model: ReportModel): DocRow[] {
  const plan = model.planning;
  if (!plan) return [];
  const rows: DocRow[] = [
    { label: "Mapped features", value: formatNumber(plan.objectCount) },
    { label: "Buildings", value: formatNumber(plan.buildings) },
    { label: "Tallest building", value: `${plan.tallestM.toFixed(1)} m` },
    { label: "Average floors", value: `${plan.avgFloors.toFixed(1)}` },
    { label: "Street network", value: `${plan.roadNetworkKm.toFixed(2)} km` },
    { label: "Green coverage", value: `${plan.greenCoveragePct.toFixed(1)}%` },
    { label: "Water", value: `${plan.waterAreaHa.toFixed(2)} ha` },
    { label: "Population capacity", value: `${formatNumber(plan.populationCapacity)} people` },
    {
      label: "Plan source",
      value: plan.source === "local" ? "Saved in Planning Studio" : "Demo plan",
      note: plan.savedAtIso ? `Saved ${formatDate(plan.savedAtIso)}` : "Not edited locally",
    },
  ];
  return rows;
}

export function landUseRows(model: ReportModel): { label: string; buildings: number; share: number }[] {
  if (model.planning && model.planning.landUse.length) return model.planning.landUse;
  return model.analysis?.landUse.map((l) => ({ label: l.landUse, buildings: 0, share: l.share })) ?? [];
}

export function objectCountRows(model: ReportModel): { label: string; count: number }[] {
  return model.planning?.counts ?? [];
}

// ---------------------------------------------------------------------------
// Key metrics
// ---------------------------------------------------------------------------

export function keyMetrics(model: ReportModel): ReportMetric[] {
  const out: ReportMetric[] = [];
  const p = model.project;
  const plan = model.planning;
  if (p) {
    out.push({ id: "siteArea", label: "Site area", value: formatSiteArea(p.siteAreaHa), status: "neutral" });
    out.push({ id: "progress", label: "Project progress", value: `${p.progress}%`, score: p.progress, status: p.progress >= 70 ? "good" : p.progress >= 30 ? "watch" : "neutral", note: p.stage });
  }
  if (plan) {
    out.push({ id: "buildings", label: "Buildings", value: formatNumber(plan.buildings), status: "neutral" });
    out.push({ id: "green", label: "Green coverage", value: `${plan.greenCoveragePct.toFixed(1)}%`, score: Math.min(100, plan.greenCoveragePct * 2), status: plan.greenCoveragePct >= 25 ? "good" : plan.greenCoveragePct >= 15 ? "watch" : "poor" });
    out.push({ id: "roads", label: "Street network", value: `${plan.roadNetworkKm.toFixed(2)} km`, status: "neutral" });
    out.push({ id: "population", label: "Population capacity", value: formatNumber(plan.populationCapacity), status: "neutral" });
  }
  if (p?.metrics) {
    out.push({ id: "envScore", label: "Environmental score", value: `${Math.round(p.metrics.environmentalScore)}/100`, score: p.metrics.environmentalScore, status: p.metrics.environmentalScore >= 75 ? "good" : p.metrics.environmentalScore >= 55 ? "watch" : "poor" });
  }
  if (model.analysis) {
    out.push({ id: "overall", label: "Analysis score", value: `${Math.round(model.analysis.overallScore)}/100`, score: model.analysis.overallScore, status: model.analysis.overallScore >= 75 ? "good" : model.analysis.overallScore >= 55 ? "watch" : "poor", note: `Generated ${formatDate(model.analysis.generatedAt)}` });
  }
  const best = bestScenario(model);
  if (best) {
    out.push({ id: "bestScenario", label: "Best scenario", value: `${best.letter} · ${Math.round(best.score)}/100`, score: best.score, status: "good", note: best.name });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Optimization
// ---------------------------------------------------------------------------

export function bestScenario(model: ReportModel) {
  const scenarios = model.optimization?.scenarios ?? [];
  return scenarios.length ? scenarios.reduce((a, b) => (b.score > a.score ? b : a)) : null;
}

export function goalRows(model: ReportModel): GoalRow[] {
  const opt = model.optimization;
  if (!opt) return [];
  const current = opt.currentMetrics;
  return opt.state.inputs.goals.map((g): GoalRow | null => {
    const def = GOALS.find((d) => d.id === g.id);
    if (!def) return null;
    const value = current[def.metric];
    const higherIsBetter = METRICS[def.metric].higherIsBetter;
    const progress = higherIsBetter ? value / def.target : def.target / Math.max(1, value);
    return {
      id: g.id,
      label: def.label,
      priority: g.priority,
      target: `${higherIsBetter ? "≥" : "≤"} ${formatMetric(def.metric, def.target)}`,
      current: formatMetric(def.metric, value),
      progress: Math.max(0, Math.min(1.2, progress)),
    };
  }).filter((r): r is GoalRow => r !== null);
}

export function objectiveRows(model: ReportModel): { id: string; label: string; hint: string; weight: number }[] {
  const opt = model.optimization;
  if (!opt) return [];
  return opt.state.inputs.weights.map((w) => {
    const def = OBJECTIVES.find((o) => o.id === w.id);
    return { id: w.id, label: def?.label ?? w.id, hint: def?.hint ?? "", weight: w.weight };
  });
}

export function constraintRows(model: ReportModel): ConstraintRow[] {
  const opt = model.optimization;
  if (!opt) return [];
  const checks = currentChecks(opt.context, opt.state.inputs);
  return opt.state.inputs.constraints.map((c) => {
    const def = CONSTRAINTS.find((d) => d.id === c.id);
    const check = checks.find((k) => k.constraintId === c.id);
    return {
      id: c.id,
      label: def?.label ?? c.id,
      limit: def ? `${def.kind === "max" ? "≤" : "≥"} ${formatConstraintValue(c.id, c.value)}` : String(c.value),
      value: check ? formatMetric(def?.metric ?? "environment", check.value) : "—",
      verdict: check?.verdict ?? "off",
      enabled: c.enabled,
      message: check?.message ?? (c.enabled ? "Not evaluated" : "Constraint disabled"),
    };
  });
}

export function scenarioRows(model: ReportModel): ScenarioRow[] {
  const opt = model.optimization;
  if (!opt) return [];
  return opt.scenarios.map((s) => ({
    id: s.id,
    letter: s.letter,
    name: s.name,
    kindLabel: scenarioLabel(s.kind),
    statusLabel: s.status,
    description: s.description,
    score: s.score,
    selected: opt.state.selectedScenarioId === s.id,
    metrics: COMPARE_METRICS.map((id) => ({ id, label: METRICS[id].short, value: formatMetric(id, s.metrics[id]) })),
    violations: s.checks.filter((c) => c.verdict === "fail").length,
    warnings: s.checks.filter((c) => c.verdict === "warning").length,
  }));
}

export function beforeAfterRows(model: ReportModel): ReportComparisonRow[] {
  const opt = model.optimization;
  const scenario = opt?.selected ?? bestScenario(model);
  if (!opt || !scenario) return [];
  return COMPARE_METRICS.map((id: ScenarioMetricId) => {
    const def = METRICS[id];
    const current = opt.currentMetrics[id];
    const proposed = scenario.metrics[id];
    const deltaPct = current !== 0 ? ((proposed - current) / Math.abs(current)) * 100 : null;
    return {
      id,
      label: def.label,
      current: formatMetric(id, current),
      proposed: formatMetric(id, proposed),
      deltaPct: deltaPct === null || !Number.isFinite(deltaPct) ? null : Math.round(deltaPct * 10) / 10,
      higherIsBetter: def.higherIsBetter,
    };
  });
}

/** Changes the chosen scenario proposes, as printed bullet rows. */
export function scenarioChangeRows(model: ReportModel): { id: string; type: string; text: string; detail?: string }[] {
  const scenario = model.optimization?.selected ?? bestScenario(model);
  return scenario?.changes.map((c) => ({ id: c.id, type: c.type, text: c.text, detail: c.detail })) ?? [];
}

// ---------------------------------------------------------------------------
// Insights / recommendations
// ---------------------------------------------------------------------------

export function insightRows(model: ReportModel): InsightRow[] {
  const rows: InsightRow[] = [];
  for (const f of model.analysis?.findings ?? []) {
    const meta = STATUS_META[f.status];
    rows.push({
      id: f.id,
      text: f.text,
      group: getCategory(f.category).label,
      status: statusToReport(f.status),
      statusLabel: meta.label,
    });
  }
  for (const i of model.project?.insights ?? []) {
    rows.push({
      id: i.id,
      text: i.text,
      group: i.category,
      status: i.level === "positive" ? "good" : i.level === "attention" ? "poor" : "neutral",
      statusLabel: i.level === "positive" ? "Positive" : i.level === "attention" ? "Needs attention" : "Information",
    });
  }
  return rows;
}

export function recommendationRows(model: ReportModel): RecommendationRow[] {
  const out: RecommendationRow[] = [];

  // 1. Constraints the current plan breaks — always the highest priority.
  for (const c of constraintRows(model)) {
    if (c.verdict === "fail") {
      out.push({ id: `constraint-${c.id}`, text: c.message, source: `Constraint · ${c.label}`, priority: "high" });
    } else if (c.verdict === "warning") {
      out.push({ id: `constraint-${c.id}`, text: c.message, source: `Constraint · ${c.label}`, priority: "medium" });
    }
  }

  // 2. Analysis metrics flagged for attention, using the engine's own advice.
  for (const m of model.analysis?.metrics ?? []) {
    if (!m.recommendation) continue;
    if (m.status === "attention") out.push({ id: `metric-${m.id}`, text: m.recommendation, source: `${getCategory(m.category).label} · ${m.name}`, priority: "high" });
    else if (m.status === "moderate") out.push({ id: `metric-${m.id}`, text: m.recommendation, source: `${getCategory(m.category).label} · ${m.name}`, priority: "medium" });
  }

  // 3. Planning considerations recorded by the analysis.
  for (const c of model.analysis?.considerations ?? []) {
    out.push({ id: `consideration-${c.id}`, text: `${c.title} — ${c.detail}`, source: getCategory(c.category).label, priority: "low" });
  }

  const order = { high: 0, medium: 1, low: 2 } as const;
  return out.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 10);
}

// ---------------------------------------------------------------------------
// Visualization / provenance
// ---------------------------------------------------------------------------

export function viewRows(model: ReportModel): ViewRow[] {
  return model.savedViews.map((v) => ({
    id: v.id,
    name: v.name,
    mode: v.mode === "present" ? "Presentation" : "Exploration",
    viewMode: v.viewMode === "3d" ? "3D city" : "2D map",
    basemap: v.basemap.charAt(0).toUpperCase() + v.basemap.slice(1),
    scenario: v.scenarioId ? `Scenario ${v.scenarioId.replace("kind:", "").replace(/^opt-/, "")}` : "Current plan",
    metrics: v.selectedMetrics.length,
    annotations: v.annotations.length,
    createdAt: formatDate(v.createdAt),
  }));
}

export function provenanceRows(model: ReportModel, report: ReportConfig): DocRow[] {
  const rows: DocRow[] = [
    { label: "Report", value: report.title },
    { label: "Report id", value: report.id },
    { label: "Revision", value: `v${report.version}`, note: report.status.charAt(0).toUpperCase() + report.status.slice(1) },
    { label: "Created", value: formatDate(report.createdAt) },
    { label: "Last updated", value: formatDate(report.updatedAt) },
    { label: "Last generated", value: report.lastGeneratedAt ? formatDate(report.lastGeneratedAt) : "Not generated yet" },
    { label: "Sections included", value: `${report.sections.filter((s) => s.enabled).length} of ${report.sections.length}` },
    { label: "Project", value: model.project?.name ?? model.projectId },
  ];
  if (model.analysis) {
    rows.push({ label: "Analysis engine", value: `${model.analysis.engine.kind} ${model.analysis.engine.version}`, note: model.analysis.engine.note });
  }
  if (model.optimization) {
    rows.push({
      label: "Scenario engine",
      value: `${model.optimization.context.analysisFromRun ? "Run analysis" : "Baseline analysis"} · ${model.optimization.state.generation?.providerId ?? "demo"} ${model.optimization.state.generation?.providerVersion ?? ""}`.trim(),
      note: model.optimization.generatedForReport
        ? "Scenarios derived for this report (no run was saved in Optimization)"
        : model.optimization.state.generation
          ? `Re-derived from generation ${formatDate(model.optimization.state.generation.generatedAt)}`
          : undefined,
    });
  }
  if (model.planning) {
    rows.push({ label: "Spatial source", value: model.planning.source === "local" ? "Locally saved plan" : "Demo dataset", note: "No survey data — illustrative geometry" });
  }
  if (model.missing.length) {
    rows.push({ label: "Unavailable sources", value: model.missing.join(", "), note: "Sections depending on them print a note instead of empty tables" });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Executive summary (narrative assembled from the live model)
// ---------------------------------------------------------------------------

export interface ExecutiveSummary {
  paragraphs: string[];
  highlights: ReportMetric[];
  actions: string[];
}

export function executiveSummary(model: ReportModel, report: ReportConfig): ExecutiveSummary {
  const p = model.project;
  const plan = model.planning;
  const analysis = model.analysis;
  const opt = model.optimization;
  const paragraphs: string[] = [];
  const actions = recommendationRows(model)
    .filter((r) => r.priority !== "low")
    .slice(0, 3)
    .map((r) => r.text);

  if (p) {
    paragraphs.push(
      `${p.name} is a ${p.type.toLowerCase()} development of ${formatSiteArea(p.siteAreaHa)} in ${p.location}, currently recorded at the ${p.stage} stage with ${p.progress}% of the programme complete. This ${report.title} consolidates the planning, environmental and scenario evidence held in UrbanForma at revision v${report.version}.`
    );
  } else {
    paragraphs.push(`This report was generated for project reference ${model.projectId}. The project record could not be read, so the sections below report only the sources that responded.`);
  }

  if (plan) {
    paragraphs.push(
      `The plan comprises ${formatNumber(plan.buildings)} buildings among ${formatNumber(plan.objectCount)} mapped features, with ${plan.greenCoveragePct.toFixed(1)}% green coverage, ${plan.roadNetworkKm.toFixed(2)} km of streets and capacity for ${formatNumber(plan.populationCapacity)} people. The tallest proposed building reaches ${plan.tallestM.toFixed(1)} m across an average of ${plan.avgFloors.toFixed(1)} floors.`
    );
  }

  if (analysis) {
    const attention = analysis.findings.filter((f) => f.status === "attention").length;
    const env = analysis.breakdown.find((b) => b.id === "environment")?.score;
    const mob = analysis.breakdown.find((b) => b.id === "mobility")?.score;
    paragraphs.push(
      `Environmental and urban analysis scores the current plan ${Math.round(analysis.overallScore)} out of 100${env !== undefined && mob !== undefined ? ` — environment ${Math.round(env)}, mobility ${Math.round(mob)}` : ""}. ${attention > 0 ? `${attention} finding${attention === 1 ? "" : "s"} need attention and are carried into the recommendations.` : "No finding requires immediate attention."}`
    );
  }

  const best = bestScenario(model);
  if (opt && best) {
    const green = opt.currentMetrics.greenCoverage;
    const greenDelta = best.metrics.greenCoverage - green;
    paragraphs.push(
      `Scenario ${best.letter} — ${best.name} — performs best under the current objective weights with a score of ${Math.round(best.score)} out of 100${Math.abs(greenDelta) >= 0.05 ? `, moving green coverage ${greenDelta > 0 ? "up" : "down"} by ${Math.abs(greenDelta).toFixed(1)} percentage points` : ""}. ${opt.state.selectedScenarioId ? `Scenario ${opt.selected?.letter ?? best.letter} is the one selected in the Optimization workspace.` : "No scenario has been formally selected yet."}`
    );
  }

  paragraphs.push(
    model.missing.length
      ? `Sources unavailable at generation time: ${model.missing.join(", ")}. The affected sections state this explicitly rather than printing empty tables.`
      : "All five sources — project, planning, analysis, optimization and visualization — responded at generation time."
  );

  return {
    paragraphs,
    highlights: keyMetrics(model).slice(0, 4),
    actions: actions.length ? actions : ["No automated recommendations were produced from the current data."],
  };
}
