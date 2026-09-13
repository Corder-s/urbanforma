import type { ProjectDetail } from "../../projects/project.types";
import type { AnalysisResult } from "../../analysis/types/analysis.types";
import type {
  OptimizationContext,
  OptimizationState,
  ScenarioMetrics,
} from "../../optimization/types/optimization.types";
import type { ScoredScenario } from "../../optimization/services/optimization.service";
import type { PresentationView, SpatialDataset } from "../../visualization/types/visualization.types";

/** The five report flavours offered by the Reports workspace. */
export type ReportType =
  | "executive"
  | "planning"
  | "environmental"
  | "optimization"
  | "comprehensive";

/** Lifecycle of a report configuration. */
export type ReportStatus = "draft" | "generating" | "ready" | "failed";

/** Every section a report can contain, in catalogue order. */
export type ReportSectionId =
  | "executiveSummary"
  | "projectOverview"
  | "siteContext"
  | "sitePlan"
  | "planningOverview"
  | "urbanForm"
  | "modelView"
  | "environmental"
  | "mobility"
  | "optimization"
  | "scenarioComparison"
  | "beforeAfter"
  | "visualization"
  | "keyMetrics"
  | "insights"
  | "recommendations"
  | "projectInformation";

/** A section slot inside one report: what it is, whether it prints, its order. */
export interface ReportSectionConfig {
  id: ReportSectionId;
  enabled: boolean;
  order: number;
}

/**
 * A saved report. Deliberately a *configuration + provenance* record: the
 * numbers themselves are never stored here, they are read live from the
 * project / planning / analysis / optimization / visualization services when
 * the report is rendered, so a report can never drift out of date.
 */
export interface ReportConfig {
  id: string;
  projectId: string;
  type: ReportType;
  title: string;
  description: string;
  sections: ReportSectionConfig[];
  status: ReportStatus;
  /** Bumped on every regenerate so stakeholders can cite a revision. */
  version: number;
  createdAt: string;
  updatedAt: string;
  lastGeneratedAt: string | null;
}

/** A single normalised KPI as presented in the document. */
export interface ReportMetric {
  id: string;
  label: string;
  value: string;
  /** 0–100 when the metric can be scored, drives the bar indicator. */
  score?: number;
  status?: "good" | "watch" | "poor" | "neutral";
  note?: string;
}

/** One row of the current-vs-proposed comparison table. */
export interface ReportComparisonRow {
  id: string;
  label: string;
  current: string;
  proposed: string;
  /** Signed percentage change, when both sides are numeric. */
  deltaPct: number | null;
  /** True when an increase is good (green cover) vs bad (carbon). */
  higherIsBetter: boolean;
}

/**
 * Planning-document summary derived from the Step 12 spatial dataset and the
 * Step 11 planning document. Reports never re-measure geometry themselves —
 * they read what those modules already computed.
 */
export interface PlanningSummary {
  objectCount: number;
  /** Object counts per spatial type, highest first. */
  counts: { label: string; count: number }[];
  /** Building stock by land use (share of buildings). */
  landUse: { label: string; buildings: number; share: number }[];
  /** Existing / Proposed / Approved / Under Review split. */
  status: { label: string; count: number }[];
  buildings: number;
  tallestM: number;
  avgFloors: number;
  siteAreaHa: number;
  greenCoveragePct: number;
  waterAreaHa: number;
  roadNetworkKm: number;
  populationCapacity: number;
  boundaryStatus: string;
  coordinateSystem: string;
  savedAtIso: string | null;
  source: "demo" | "local";
  /** Surrounding-context features of the site definition (read-only GIS layer). */
  context: {
    blocks: number;
    roads: number;
    contours: number;
    transitLines: number;
    transitStations: number;
    utilities: number;
    streetTrees: number;
    blockPlates: number;
  };
}

/**
 * Everything the preview needs for one project, assembled from the existing
 * services. Built once per project per session (memoised in the hook) and
 * passed down; sections read from it instead of re-querying.
 */
export interface ReportModel {
  projectId: string;
  /** Null when the project no longer exists. */
  project: ProjectDetail | null;
  /** Planning Studio document, summarised (site + drawn objects). */
  planning: PlanningSummary | null;
  /**
   * The live spatial dataset the figures draw (Step 12 geometry). Null when the
   * spatial service did not respond — the figure sections then say so.
   */
  spatial: SpatialDataset | null;
  /** Step 13 analysis output. */
  analysis: AnalysisResult | null;
  /** Step 14 optimization state + the scenario set derived from it. */
  optimization: {
    state: OptimizationState;
    context: OptimizationContext;
    scenarios: ScoredScenario[];
    selected: ScoredScenario | null;
    currentMetrics: ScenarioMetrics;
    /** True when no run was saved, so scenarios were derived read-only for this report. */
    generatedForReport: boolean;
  } | null;
  /** Step 15 saved views, referenced by the visualization section. */
  savedViews: PresentationView[];
  /** Which sources were unavailable, so sections can say so honestly. */
  missing: ("project" | "planning" | "analysis" | "optimization" | "visualization")[];
}
