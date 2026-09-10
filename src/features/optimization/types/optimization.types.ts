import type { AnalysisResult } from "../../analysis/types/analysis.types";
import type { Density, RoadProperties, SpatialDataset, SpatialObject } from "../../visualization/types/visualization.types";

/**
 * Optimization & Scenario Planning domain model.
 *
 *   current plan (SpatialDataset + AnalysisResult)
 *     + planning goals / objective weights / constraints      ─► OptimizationProvider
 *                                                                 └─► OptimizationScenario[]
 *                                                                       ├─ metrics / objectives / score
 *                                                                       ├─ changes / trade-offs
 *                                                                       └─ spatialState (ops against the current plan)
 *
 * Nothing here is a real optimizer: the demo provider derives deterministic,
 * illustrative scenarios and the UI labels them as generated planning
 * scenarios. A backend or a real optimization engine returns the same shapes.
 */

// ---------------------------------------------------------------------------
// Modes / views
// ---------------------------------------------------------------------------

export type OptimizationMode = "optimize" | "compare" | "review";
export type ScenarioViewMode = "2d" | "3d";

// ---------------------------------------------------------------------------
// Metrics (shared vocabulary for current plan + scenarios)
// ---------------------------------------------------------------------------

export type ScenarioMetricId =
  | "environment"
  | "mobility"
  | "urbanForm"
  | "greenInfrastructure"
  | "carbon"
  | "greenCoverage"
  | "heatIndex"
  | "solar"
  | "populationCapacity"
  | "far"
  | "maxFloors"
  | "siteCoverage"
  | "publicOpenSpace";

export type ScenarioMetrics = Record<ScenarioMetricId, number>;

export type MetricUnit = "score" | "percent" | "people" | "FAR" | "floors" | "index";

export interface MetricDefinition {
  id: ScenarioMetricId;
  label: string;
  /** Column / chip label. */
  short: string;
  unit: MetricUnit;
  higherIsBetter: boolean;
  decimals: number;
}

export type HeatRisk = "Low" | "Medium" | "High";

// ---------------------------------------------------------------------------
// Goals, objective weights, constraints (the user's inputs)
// ---------------------------------------------------------------------------

export type GoalId = "environment" | "mobility" | "green" | "solar" | "heat" | "density" | "landuse" | "publicspace" | "carbon";
export type GoalPriority = "low" | "medium" | "high";

export interface PlanningGoal {
  id: GoalId;
  priority: GoalPriority;
}

export interface GoalDefinition {
  id: GoalId;
  label: string;
  hint: string;
  /** Metric the goal is measured with (goal performance view). */
  metric: ScenarioMetricId;
  /** Target used for goal performance; percent goals may be overridden by the analysis (green target). */
  target: number;
}

export type ObjectiveId = "environment" | "mobility" | "green" | "density" | "carbon";

export interface ObjectiveWeight {
  id: ObjectiveId;
  /** 0–100, all weights always sum to exactly 100. */
  weight: number;
}

export interface ObjectiveDefinition {
  id: ObjectiveId;
  label: string;
  hint: string;
  /** Scenario metric that scores this objective (0–100). */
  metric: Extract<ScenarioMetricId, "environment" | "mobility" | "greenInfrastructure" | "urbanForm" | "carbon">;
}

export type ScenarioObjectives = Record<ObjectiveId, number>;

export type ConstraintId = "max-height" | "min-green" | "max-coverage" | "min-openspace" | "max-far" | "max-population";

export interface PlanningConstraint {
  id: ConstraintId;
  value: number;
  enabled: boolean;
}

export interface ConstraintDefinition {
  id: ConstraintId;
  label: string;
  unit: string;
  kind: "max" | "min";
  metric: ScenarioMetricId;
  min: number;
  max: number;
  step: number;
  /** Human noun used in violation copy ("Population", "Tallest new building"). */
  subject: string;
}

export type ConstraintVerdict = "pass" | "warning" | "fail" | "off";

export interface ConstraintCheck {
  constraintId: ConstraintId;
  verdict: ConstraintVerdict;
  value: number;
  limit: number;
  /** Clear, human explanation — "Population exceeds configured limit by 420." */
  message: string;
}

export interface OptimizationInputs {
  goals: PlanningGoal[];
  weights: ObjectiveWeight[];
  constraints: PlanningConstraint[];
}

// ---------------------------------------------------------------------------
// Scenario spatial state — ops applied to the current SpatialDataset
// ---------------------------------------------------------------------------

export type SpatialChangeKind = "added" | "modified" | "removed" | "unchanged";

export interface ObjectPatch {
  floors?: number;
  height?: number;
  populationCapacity?: number;
  density?: Density;
  roadClass?: RoadProperties["roadClass"];
  lanes?: number;
  /** Line width (roads/paths) in metres. */
  width?: number;
  name?: string;
  category?: string;
}

export type SpatialOp =
  | { op: "add"; object: SpatialObject; note: string }
  | { op: "modify"; objectId: string; patch: ObjectPatch; note: string }
  | { op: "remove"; objectId: string; note: string };

/**
 * A scenario never duplicates the dataset: it stores the ops that turn the
 * current spatial state into the scenario spatial state. The renderer applies
 * them (memoised) for the scenario being viewed.
 */
export interface ScenarioSpatialState {
  ops: SpatialOp[];
  counts: Record<SpatialChangeKind, number>;
}

export interface DerivedSpatialState {
  dataset: SpatialDataset;
  /** Change kind per object id present in the scenario dataset (unchanged ids are omitted). */
  changeOf: Map<string, SpatialChangeKind>;
  /** Objects of the current plan removed by the scenario (drawn as ghosts). */
  removed: SpatialObject[];
  /** Ids of objects added by the scenario. */
  addedIds: string[];
  modifiedNotes: Map<string, string>;
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

export type ScenarioKind = "balanced" | "green" | "mobility" | "compact";
export type ScenarioStatus = "Draft" | "Generated" | "Reviewed" | "Selected" | "Archived";
export type ChangeType = "Added" | "Reduced" | "Moved" | "Reconfigured";

export interface ScenarioChange {
  id: string;
  type: ChangeType;
  /** Headline — "+ 4.6 ha green space". */
  text: string;
  detail?: string;
}

export interface Tradeoff {
  id: string;
  label: string;
  metric: ScenarioMetricId;
  /** Signed change vs the current plan (in the metric's own unit; population as %). */
  delta: number;
  deltaText: string;
  direction: "up" | "down" | "flat";
  /** true = improved, false = reduced, null = neutral. */
  improved: boolean | null;
}

export interface OptimizationScenario {
  id: string;
  kind: ScenarioKind;
  letter: "A" | "B" | "C" | "D";
  name: string;
  description: string;
  status: ScenarioStatus;
  /** Overall score 0–100 for the active objective weights. */
  score: number;
  objectives: ScenarioObjectives;
  metrics: ScenarioMetrics;
  changes: ScenarioChange[];
  tradeoffs: Tradeoff[];
  spatialState: ScenarioSpatialState;
  generatedAt: string;
  generationId: string;
}

export interface ScenarioGeneration {
  id: string;
  generatedAt: string;
  inputs: OptimizationInputs;
  providerId: string;
  providerVersion: string;
  /** Names of the scenarios produced (for the history list when the run is re-derived). */
  scenarios: { id: string; kind: ScenarioKind; name: string }[];
}

// ---------------------------------------------------------------------------
// Versioning preparation (no full version management yet)
// ---------------------------------------------------------------------------

export type SpatialStateRef = { source: "current-plan" } | { source: "scenario"; scenarioId: string; kind: ScenarioKind; generationId: string };

export interface AnalysisSnapshot {
  overallScore: number;
  generatedAt: string;
  metrics: Partial<ScenarioMetrics>;
}

export interface PlanningVersion {
  id: string;
  projectId: string;
  name: string;
  type: "baseline" | "current" | "scenario" | "preferred";
  createdAt: string;
  /** Reference to a re-derivable spatial state (the backend will store the full state). */
  spatialState: SpatialStateRef;
  analysisResult: AnalysisSnapshot;
  optimizationScenarioId?: string;
}

// ---------------------------------------------------------------------------
// Persisted state + runtime context
// ---------------------------------------------------------------------------

export interface OptimizationState {
  version: 1;
  projectId: string;
  inputs: OptimizationInputs;
  /** Latest generation run (scenarios are re-derived from it deterministically). */
  generation: ScenarioGeneration | null;
  /** Previous runs, newest first (bounded). */
  history: ScenarioGeneration[];
  scenarioStatus: Record<string, ScenarioStatus>;
  selectedScenarioId: string | null;
  lastGeneratedAt: string | null;
  savedAt: string | null;
  versions: PlanningVersion[];
}

export interface CurrentPlan {
  metrics: ScenarioMetrics;
  objectives: ScenarioObjectives;
  score: number;
  /** Green coverage target from the analysis (percent). */
  greenTarget: number;
}

export interface OptimizationContext {
  projectId: string;
  projectName: string;
  spatial: SpatialDataset;
  analysis: AnalysisResult;
  analysisFromRun: boolean;
  current: CurrentPlan;
}

export interface OptimizationInput {
  context: OptimizationContext;
  inputs: OptimizationInputs;
  generationId: string;
  generatedAt: string;
}

export type GenerationStatus = "idle" | "generating" | "complete" | "error";

export interface GenerationStep {
  id: string;
  label: string;
  weight: number;
}

export type ExportFormat = "summary" | "data";
