import { isPersonalizationEnabled } from "../../settings/services/settings.service";
import { getAnalysis, getAnalysisProjects, getAnalysisSpatialData, ProjectNotFoundError, type AnalysisProjectSummary } from "../../analysis/services/analysis.service";
import { getDemoScenario } from "../../projects/project.service";
import type { SpatialDataset } from "../../visualization/types/visualization.types";
import {
  CONSTRAINTS,
  DEFAULT_GOALS,
  DEFAULT_WEIGHTS,
  GOALS,
  HISTORY_LIMIT,
  METRICS,
  OBJECTIVES,
  OPTIMIZATION_LAST_PROJECT_KEY,
  OPTIMIZATION_PREFS_PREFIX,
  OPTIMIZATION_STORAGE_PREFIX,
  COMPARE_METRICS,
  defaultInputsFor,
  formatMetric,
  getScenarioKind,
  rebalanceWeights,
  weightsTotal,
} from "../data/optimization.data";
import { checkConstraints, deriveCurrentPlan, deriveTradeoffs, scoreParts, type ScoreParts } from "../lib/scenario.scoring";
import { demoOptimizationProvider } from "../providers/demoOptimizationProvider";
import type { OptimizationProvider } from "../providers/optimizationProvider";
import type {
  ConstraintCheck,
  ExportFormat,
  GoalPriority,
  ObjectiveWeight,
  OptimizationContext,
  OptimizationInputs,
  OptimizationMode,
  OptimizationScenario,
  OptimizationState,
  PlanningConstraint,
  PlanningGoal,
  PlanningVersion,
  ScenarioGeneration,
  ScenarioStatus,
  ScenarioViewMode,
} from "../types/optimization.types";

/**
 * Optimization service — the only module the workspace talks to.
 *
 *   getOptimizationState(projectId)      → future GET  /api/projects/:id/optimization
 *   saveOptimizationState(projectId, s)  → future POST /api/projects/:id/optimization
 *   generateScenarios(ctx, inputs)       → future PUT  /api/projects/:id/optimization/:optimizationId (+ run)
 *   getScenario / selectScenario / applyScenario → local today
 *
 * Everything is local and deterministic: the provider re-derives scenarios
 * from the persisted generation record, so storage holds inputs + decisions
 * only — never a duplicated spatial dataset.
 */

export type OptimizationProjectSummary = AnalysisProjectSummary;
export { ProjectNotFoundError };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

let provider: OptimizationProvider = demoOptimizationProvider;

/** Swap the scenario source (backend / assisted providers later). */
export function setOptimizationProvider(p: OptimizationProvider) {
  provider = p;
}
export function getOptimizationProvider(): OptimizationProvider {
  return provider;
}

// ---------------------------------------------------------------------------
// Projects + context
// ---------------------------------------------------------------------------

export async function getOptimizationProjects(): Promise<OptimizationProjectSummary[]> {
  return getAnalysisProjects();
}

/**
 * Current plan context: the Step 12 spatial dataset plus the Step 13 analysis
 * result (last run when one exists, baseline computation otherwise). No
 * environmental indicator is recalculated here.
 */
export async function getOptimizationContext(projectId: string, data?: SpatialDataset): Promise<OptimizationContext> {
  const spatial = data ?? (await getAnalysisSpatialData(projectId));
  const { result, fromRun } = await getAnalysis(projectId, spatial);
  return { projectId, projectName: spatial.projectName, spatial, analysis: result, analysisFromRun: fromRun, current: deriveCurrentPlan(spatial, result) };
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function storageKey(projectId: string) {
  return `${OPTIMIZATION_STORAGE_PREFIX}${projectId}`;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

const PRIORITIES: GoalPriority[] = ["low", "medium", "high"];

function sanitiseInputs(raw: unknown, defaults: OptimizationInputs): OptimizationInputs {
  if (!isRecord(raw)) return defaults;
  const goals: PlanningGoal[] = DEFAULT_GOALS.map((d) => {
    const found = Array.isArray(raw.goals) ? (raw.goals as unknown[]).find((g) => isRecord(g) && g.id === d.id) : null;
    const p = isRecord(found) ? found.priority : null;
    return { id: d.id, priority: PRIORITIES.includes(p as GoalPriority) ? (p as GoalPriority) : defaults.goals.find((g) => g.id === d.id)?.priority ?? d.priority };
  });
  let weights: ObjectiveWeight[] = DEFAULT_WEIGHTS.map((d) => {
    const found = Array.isArray(raw.weights) ? (raw.weights as unknown[]).find((w) => isRecord(w) && w.id === d.id) : null;
    const v = isRecord(found) ? found.weight : null;
    return { id: d.id, weight: typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : d.weight };
  });
  if (weightsTotal(weights) !== 100) weights = rebalanceWeights(weights, weights[0].id, weights[0].weight);
  const constraints: PlanningConstraint[] = CONSTRAINTS.map((def) => {
    const fallback = defaults.constraints.find((c) => c.id === def.id) ?? { id: def.id, value: def.min, enabled: true };
    const found = Array.isArray(raw.constraints) ? (raw.constraints as unknown[]).find((c) => isRecord(c) && c.id === def.id) : null;
    if (!isRecord(found)) return fallback;
    const value = typeof found.value === "number" && Number.isFinite(found.value) ? Math.max(def.min, Math.min(def.max, found.value)) : fallback.value;
    return { id: def.id, value, enabled: typeof found.enabled === "boolean" ? found.enabled : fallback.enabled };
  });
  return { goals, weights, constraints };
}

const STATUSES: ScenarioStatus[] = ["Draft", "Generated", "Reviewed", "Selected", "Archived"];

function sanitiseGeneration(raw: unknown): ScenarioGeneration | null {
  if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.generatedAt !== "string" || !isRecord(raw.inputs)) return null;
  const inputs = sanitiseInputs(raw.inputs, { goals: DEFAULT_GOALS, weights: DEFAULT_WEIGHTS, constraints: CONSTRAINTS.map((c) => ({ id: c.id, value: c.min, enabled: false })) });
  const scenarios = Array.isArray(raw.scenarios) ? (raw.scenarios as unknown[]).filter((s): s is { id: string; kind: OptimizationScenario["kind"]; name: string } => isRecord(s) && typeof s.id === "string" && typeof s.kind === "string" && typeof s.name === "string") : [];
  return { id: raw.id, generatedAt: raw.generatedAt, inputs, providerId: typeof raw.providerId === "string" ? raw.providerId : provider.id, providerVersion: typeof raw.providerVersion === "string" ? raw.providerVersion : provider.version, scenarios };
}

function sanitiseVersion(raw: unknown, projectId: string): PlanningVersion | null {
  if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.name !== "string" || typeof raw.createdAt !== "string") return null;
  const type = raw.type === "baseline" || raw.type === "current" || raw.type === "scenario" || raw.type === "preferred" ? raw.type : "current";
  const spatial = isRecord(raw.spatialState) && raw.spatialState.source === "scenario" && typeof raw.spatialState.scenarioId === "string" ? (raw.spatialState as PlanningVersion["spatialState"]) : ({ source: "current-plan" } as const);
  const analysis = isRecord(raw.analysisResult) ? raw.analysisResult : {};
  return {
    id: raw.id,
    projectId,
    name: raw.name,
    type,
    createdAt: raw.createdAt,
    spatialState: spatial,
    analysisResult: { overallScore: typeof analysis.overallScore === "number" ? analysis.overallScore : 0, generatedAt: typeof analysis.generatedAt === "string" ? analysis.generatedAt : raw.createdAt, metrics: isRecord(analysis.metrics) ? (analysis.metrics as PlanningVersion["analysisResult"]["metrics"]) : {} },
    optimizationScenarioId: typeof raw.optimizationScenarioId === "string" ? raw.optimizationScenarioId : undefined,
  };
}

export function emptyState(projectId: string, context: OptimizationContext | null): OptimizationState {
  const inputs = context ? defaultInputsFor(context.current) : { goals: DEFAULT_GOALS.map((g) => ({ ...g })), weights: DEFAULT_WEIGHTS.map((w) => ({ ...w })), constraints: CONSTRAINTS.map((c) => ({ id: c.id, value: c.min, enabled: true })) };
  const baseline: PlanningVersion[] = context
    ? [
        {
          id: `ver-${projectId}-current`,
          projectId,
          name: "Current Plan",
          type: "current",
          createdAt: context.analysis.generatedAt,
          spatialState: { source: "current-plan" },
          analysisResult: { overallScore: context.analysis.overallScore, generatedAt: context.analysis.generatedAt, metrics: context.current.metrics },
        },
      ]
    : [];
  return { version: 1, projectId, inputs, generation: null, history: [], scenarioStatus: {}, selectedScenarioId: null, lastGeneratedAt: null, savedAt: null, versions: baseline };
}

/** Persisted state for a project (defaults when nothing was saved). */
export async function getOptimizationState(projectId: string, context: OptimizationContext | null): Promise<OptimizationState> {
  await wait(120);
  const fresh = emptyState(projectId, context);
  let raw: unknown = null;
  try {
    const s = window.localStorage.getItem(storageKey(projectId));
    raw = s ? JSON.parse(s) : null;
  } catch {
    raw = null;
  }
  if (!isRecord(raw) || raw.version !== 1) return fresh;
  const inputs = sanitiseInputs(raw.inputs, fresh.inputs);
  const generation = sanitiseGeneration(raw.generation);
  const history = Array.isArray(raw.history) ? (raw.history as unknown[]).map(sanitiseGeneration).filter((g): g is ScenarioGeneration => g !== null).slice(0, HISTORY_LIMIT) : [];
  const scenarioStatus: Record<string, ScenarioStatus> = {};
  if (isRecord(raw.scenarioStatus)) for (const [k, v] of Object.entries(raw.scenarioStatus)) if (STATUSES.includes(v as ScenarioStatus)) scenarioStatus[k] = v as ScenarioStatus;
  const versions = Array.isArray(raw.versions) ? (raw.versions as unknown[]).map((v) => sanitiseVersion(v, projectId)).filter((v): v is PlanningVersion => v !== null) : [];
  const withBaseline = versions.some((v) => v.type === "current") ? versions : [...fresh.versions, ...versions];
  return {
    version: 1,
    projectId,
    inputs,
    generation,
    history,
    scenarioStatus,
    selectedScenarioId: typeof raw.selectedScenarioId === "string" ? raw.selectedScenarioId : null,
    lastGeneratedAt: typeof raw.lastGeneratedAt === "string" ? raw.lastGeneratedAt : generation?.generatedAt ?? null,
    savedAt: typeof raw.savedAt === "string" ? raw.savedAt : null,
    versions: withBaseline,
  };
}

/** Persist locally (future POST /api/projects/:id/optimization). Resolves the save timestamp. */
export async function saveOptimizationState(projectId: string, state: OptimizationState): Promise<string> {
  await wait(420);
  const savedAt = new Date().toISOString();
  const payload: OptimizationState = { ...state, projectId, version: 1, savedAt };
  try {
    window.localStorage.setItem(storageKey(projectId), JSON.stringify(payload));
    // Privacy → Personalization off: skip the convenience pointer only; the run
    // itself is still saved.
    if (isPersonalizationEnabled()) window.localStorage.setItem(OPTIMIZATION_LAST_PROJECT_KEY, projectId);
  } catch {
    throw new Error("Unable to save locally — storage is unavailable.");
  }
  return savedAt;
}

export function clearOptimizationState(projectId: string) {
  try {
    window.localStorage.removeItem(storageKey(projectId));
  } catch {
    /* ignore */
  }
}

export function getLastOptimizedProject(): string | null {
  try {
    return window.localStorage.getItem(OPTIMIZATION_LAST_PROJECT_KEY);
  } catch {
    return null;
  }
}

export interface OptimizationPrefs {
  mode: OptimizationMode;
  viewMode: ScenarioViewMode;
}

export function loadPrefs(projectId: string): OptimizationPrefs {
  try {
    const raw = window.localStorage.getItem(`${OPTIMIZATION_PREFS_PREFIX}${projectId}`);
    const p = raw ? (JSON.parse(raw) as Partial<OptimizationPrefs>) : null;
    return { mode: p?.mode === "compare" || p?.mode === "review" ? p.mode : "optimize", viewMode: p?.viewMode === "3d" ? "3d" : "2d" };
  } catch {
    return { mode: "optimize", viewMode: "2d" };
  }
}

export function savePrefs(projectId: string, prefs: OptimizationPrefs) {
  try {
    window.localStorage.setItem(`${OPTIMIZATION_PREFS_PREFIX}${projectId}`, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Generation + scoring
// ---------------------------------------------------------------------------

/** ISO timestamp → 14-digit compact stamp (YYYYMMDDhhmmss). */
function compactStamp(iso: string): string {
  return iso.replace(/\D/g, "").slice(0, 14);
}

function hashInputs(inputs: OptimizationInputs): string {
  const s = JSON.stringify([inputs.goals.map((g) => g.priority), inputs.weights.map((w) => w.weight), inputs.constraints.map((c) => [c.enabled, c.value])]);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(36);
}

/**
 * Produce scenarios for the current plan + inputs. Pure apart from the demo
 * error switch (`?demo=error`) used to exercise the failure state.
 */
export async function generateScenarios(context: OptimizationContext, inputs: OptimizationInputs): Promise<{ generation: ScenarioGeneration; scenarios: OptimizationScenario[] }> {
  if (getDemoScenario() === "error") throw new Error("The scenario engine did not respond. This is a simulated failure for the demo.");
  const generatedAt = new Date().toISOString();
  const generation: ScenarioGeneration = {
    id: `gen-${compactStamp(generatedAt)}-${hashInputs(inputs)}`,
    generatedAt,
    inputs: JSON.parse(JSON.stringify(inputs)) as OptimizationInputs,
    providerId: provider.id,
    providerVersion: provider.version,
    scenarios: [],
  };
  const scenarios = await deriveScenarios(context, generation);
  generation.scenarios = scenarios.map((s) => ({ id: s.id, kind: s.kind, name: s.name }));
  return { generation, scenarios };
}

/** Re-derive the scenarios of a stored generation (deterministic → identical output). */
export async function deriveScenarios(context: OptimizationContext, generation: ScenarioGeneration): Promise<OptimizationScenario[]> {
  const raw = await provider.generate({ context, inputs: generation.inputs, generationId: generation.id, generatedAt: generation.generatedAt });
  return raw.map((s) => ({ ...s, tradeoffs: deriveTradeoffs(s.metrics, context.current.metrics) }));
}

export interface ScoredScenario extends OptimizationScenario {
  checks: ConstraintCheck[];
  scoreParts: ScoreParts;
}

/** Apply the live objective weights, constraints and statuses to raw scenarios (cheap; runs on every weight change). */
export function scoreScenarios(scenarios: OptimizationScenario[], context: OptimizationContext, inputs: OptimizationInputs, statusOf: Record<string, ScenarioStatus>, selectedId: string | null): ScoredScenario[] {
  return scenarios.map((s) => {
    const checks = checkConstraints(s.metrics, inputs.constraints);
    const parts = scoreParts(s.objectives, context.current, inputs.weights, checks);
    const status: ScenarioStatus = selectedId === s.id ? "Selected" : statusOf[s.id] ?? s.status;
    return { ...s, score: parts.score, checks, scoreParts: parts, status };
  });
}

export function currentChecks(context: OptimizationContext, inputs: OptimizationInputs): ConstraintCheck[] {
  return checkConstraints(context.current.metrics, inputs.constraints);
}

export function getScenario(scenarios: OptimizationScenario[], scenarioId: string | null): OptimizationScenario | null {
  return scenarioId ? scenarios.find((s) => s.id === scenarioId) ?? null : null;
}

// ---------------------------------------------------------------------------
// Decisions (pure state transitions — the hook persists via saveOptimizationState)
// ---------------------------------------------------------------------------

export function selectScenario(state: OptimizationState, scenarioId: string): OptimizationState {
  const scenarioStatus = { ...state.scenarioStatus };
  if (state.selectedScenarioId && state.selectedScenarioId !== scenarioId) scenarioStatus[state.selectedScenarioId] = "Reviewed";
  scenarioStatus[scenarioId] = "Selected";
  return { ...state, scenarioStatus, selectedScenarioId: scenarioId };
}

export function markReviewed(state: OptimizationState, scenarioId: string): OptimizationState {
  if (state.selectedScenarioId === scenarioId) return state;
  const cur = state.scenarioStatus[scenarioId];
  if (cur === "Reviewed" || cur === "Archived") return state;
  return { ...state, scenarioStatus: { ...state.scenarioStatus, [scenarioId]: "Reviewed" } };
}

export function archiveScenario(state: OptimizationState, scenarioId: string): OptimizationState {
  return { ...state, scenarioStatus: { ...state.scenarioStatus, [scenarioId]: "Archived" }, selectedScenarioId: state.selectedScenarioId === scenarioId ? null : state.selectedScenarioId };
}

/**
 * Apply the preferred scenario locally: a new PlanningVersion referencing the
 * scenario is added next to the current plan. Nothing is overwritten — the
 * project keeps Current Plan and gains a Preferred Scenario version.
 */
export function applyScenario(state: OptimizationState, scenario: OptimizationScenario, context: OptimizationContext): { state: OptimizationState; version: PlanningVersion } {
  const createdAt = new Date().toISOString();
  const version: PlanningVersion = {
    id: `ver-${context.projectId}-${scenario.kind}-${compactStamp(createdAt)}`,
    projectId: context.projectId,
    name: `Preferred Scenario — ${scenario.name}`,
    type: "preferred",
    createdAt,
    spatialState: { source: "scenario", scenarioId: scenario.id, kind: scenario.kind, generationId: scenario.generationId },
    analysisResult: { overallScore: scenario.score, generatedAt: scenario.generatedAt, metrics: scenario.metrics },
    optimizationScenarioId: scenario.id,
  };
  const others = state.versions.filter((v) => v.type !== "preferred");
  const previous = state.versions.filter((v) => v.type === "preferred").map((v) => ({ ...v, type: "scenario" as const, name: v.name.replace(/^Preferred Scenario/, "Scenario") }));
  return { state: { ...state, versions: [...others, ...previous, version] }, version };
}

/**
 * Back to the baseline: inputs, scenarios and decisions reset. Project data is
 * untouched — including versions already applied to the project, which stay
 * listed next to the current plan.
 */
export function resetOptimization(projectId: string, context: OptimizationContext | null, previous: OptimizationState | null): OptimizationState {
  clearOptimizationState(projectId);
  const fresh = emptyState(projectId, context);
  const kept = previous?.versions.filter((v) => v.type !== "current") ?? [];
  return kept.length > 0 ? { ...fresh, versions: [...fresh.versions, ...kept] } : fresh;
}

// ---------------------------------------------------------------------------
// Export (demo)
// ---------------------------------------------------------------------------

export interface ExportArtifact {
  filename: string;
  mime: string;
  content: string;
}

export function buildOptimizationExport(context: OptimizationContext, scenarios: ScoredScenario[], inputs: OptimizationInputs, selectedId: string | null, format: ExportFormat): ExportArtifact {
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "data") {
    const header = ["metric_id", "metric", "unit", "current", ...scenarios.map((s) => s.name)];
    const rows = COMPARE_METRICS.map((id) => [id, METRICS[id].label, METRICS[id].unit, String(context.current.metrics[id]), ...scenarios.map((s) => String(s.metrics[id]))]);
    rows.unshift(["overall", "Overall Score", "score", String(context.current.score), ...scenarios.map((s) => String(s.score))]);
    const csv = [header, ...rows].map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
    return { filename: `${context.projectId}-scenarios-${stamp}.csv`, mime: "text/csv", content: csv };
  }
  const lines: string[] = [];
  lines.push(`UrbanForma — Optimization & Scenario Planning (demo)`, `Project: ${context.projectName}`, `Generated planning scenarios — illustrative values, not engineering calculations.`, "");
  lines.push("Planning goals:");
  for (const g of GOALS) lines.push(`  ${g.label}: ${inputs.goals.find((x) => x.id === g.id)?.priority ?? "medium"}`);
  lines.push("", "Objective weights:");
  for (const o of OBJECTIVES) lines.push(`  ${o.label}: ${inputs.weights.find((x) => x.id === o.id)?.weight ?? 0}%`);
  lines.push("", "Constraints:");
  for (const c of CONSTRAINTS) {
    const v = inputs.constraints.find((x) => x.id === c.id);
    lines.push(`  ${c.label}: ${v?.enabled ? `${v.value} ${c.unit}` : "not enforced"}`);
  }
  lines.push("", `Current plan: overall ${context.current.score} / 100`);
  for (const s of scenarios) {
    lines.push("", `${s.letter}. ${s.name} — ${s.score} / 100${s.id === selectedId ? " (preferred)" : ""} [${s.status}]`, `   ${s.description}`);
    lines.push(`   Environment ${s.metrics.environment} · Mobility ${s.metrics.mobility} · Green ${formatMetric("greenCoverage", s.metrics.greenCoverage)} · Carbon ${s.metrics.carbon} · Population ${formatMetric("populationCapacity", s.metrics.populationCapacity)}`);
    for (const c of s.changes) lines.push(`   • ${c.text}`);
    const issues = s.checks.filter((c) => c.verdict === "warning" || c.verdict === "fail");
    for (const c of issues) lines.push(`   ⚠ ${c.message}`);
  }
  lines.push("", `Provider: ${provider.label} (${provider.id} ${provider.version})`);
  return { filename: `${context.projectId}-optimization-summary-${stamp}.txt`, mime: "text/plain", content: lines.join("\n") };
}

export function downloadArtifact(a: ExportArtifact): boolean {
  try {
    if (typeof window === "undefined" || typeof URL.createObjectURL !== "function") return false;
    const blob = new Blob([a.content], { type: a.mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = a.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

export function scenarioLabel(kind: OptimizationScenario["kind"]): string {
  return getScenarioKind(kind).name;
}

export type { SpatialDataset };
