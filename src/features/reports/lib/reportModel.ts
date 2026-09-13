import { getProjectDetails } from "../../projects/project.service";
import { getPlanningState } from "../../planning/services/planning.service";
import { getAnalysisSpatialData } from "../../analysis/services/analysis.service";
import {
  deriveScenarios,
  generateScenarios,
  getOptimizationContext,
  getOptimizationState,
  scoreScenarios,
  type ScoredScenario,
} from "../../optimization/services/optimization.service";
import { getSavedViews } from "../../visualization/services/visualization.service";
import { getBimReportSummary } from "../../bim/services/bim.service";
import type { PlanningDocument } from "../../planning/types/planning.types";
import type { OptimizationContext, OptimizationScenario, OptimizationState } from "../../optimization/types/optimization.types";
import type { SpatialDataset, SpatialObjectType } from "../../visualization/types/visualization.types";
import type { PlanningSummary, ReportConfig, ReportModel, ReportSectionConfig } from "../types/report.types";

/**
 * Report model builder — the only place a report touches other modules' data.
 *
 * A report stores configuration, never numbers. This file reads the live
 * project / planning / analysis / optimization / visualization services and
 * assembles a single typed view-model, so:
 *
 *   - reports can never drift out of date (they re-read on generate),
 *   - no dataset is duplicated (scenarios are re-derived, not copied),
 *   - a missing source degrades one section instead of crashing the page.
 *
 * When the Java/Spring backend lands, this becomes
 * `GET /api/projects/:id/report-model` and the sections do not change.
 */

const TYPE_LABELS: Record<SpatialObjectType, string> = {
  building: "Buildings",
  road: "Roads",
  path: "Paths",
  green: "Green areas",
  water: "Water bodies",
  tree: "Trees",
  boundary: "Site boundary",
  poi: "Points of interest",
  terrain: "Terrain contours",
  block: "Blocks",
  "context-building": "Context buildings",
  parking: "Parking",
  transit: "Transit",
  utility: "Utilities",
};

/** Decoration types that are context, not proposal — excluded from object counts. */
const DECOR_TYPES = new Set<SpatialObjectType>(["boundary", "terrain", "block", "context-building"]);

/** Buildings, roads and areas carry a delivery status; decoration does not. */
function statusOf(o: SpatialDataset["objects"][number]): string | null {
  const props = o.properties;
  return "status" in props && typeof props.status === "string" ? props.status : null;
}

/**
 * Summarise the planning document + spatial dataset. Pure and cheap: it only
 * counts what the Step 11/12 modules already produced.
 */
export function buildPlanningSummary(
  dataset: SpatialDataset | null,
  doc: PlanningDocument | null
): PlanningSummary | null {
  if (!dataset && !doc) return null;
  const objects = dataset?.objects ?? [];
  const features = objects.filter((o) => !DECOR_TYPES.has(o.type));

  const countByType = new Map<SpatialObjectType, number>();
  for (const o of features) countByType.set(o.type, (countByType.get(o.type) ?? 0) + 1);
  const counts = [...countByType.entries()]
    .map(([type, count]) => ({ label: TYPE_LABELS[type] ?? type, count }))
    .sort((a, b) => b.count - a.count);

  const buildings = objects.filter((o) => o.type === "building");
  const landUseMap = new Map<string, number>();
  let tallestM = 0;
  let floorsTotal = 0;
  for (const b of buildings) {
    const props = b.properties;
    landUseMap.set(props.landUse, (landUseMap.get(props.landUse) ?? 0) + 1);
    tallestM = Math.max(tallestM, props.height);
    floorsTotal += props.floors;
  }
  const landUse = [...landUseMap.entries()]
    .map(([label, n]) => ({ label, buildings: n, share: buildings.length ? n / buildings.length : 0 }))
    .sort((a, b) => b.buildings - a.buildings);

  const statusMap = new Map<string, number>();
  for (const o of objects) {
    const s = statusOf(o);
    if (s) statusMap.set(s, (statusMap.get(s) ?? 0) + 1);
  }
  const status = [...statusMap.entries()].map(([label, count]) => ({ label, count }));

  const summary = dataset?.summary ?? null;
  const ctx = doc?.site.context ?? null;
  return {
    objectCount: features.length,
    counts,
    landUse,
    status,
    buildings: buildings.length,
    tallestM: Math.round(tallestM * 10) / 10,
    avgFloors: buildings.length ? Math.round((floorsTotal / buildings.length) * 10) / 10 : 0,
    siteAreaHa: summary?.siteAreaHa ?? 0,
    greenCoveragePct: summary?.greenCoveragePct ?? 0,
    waterAreaHa: summary?.waterAreaHa ?? 0,
    roadNetworkKm: summary?.roadNetworkKm ?? 0,
    populationCapacity: summary?.populationCapacity ?? 0,
    boundaryStatus: doc?.site.boundaryStatus ?? "Not defined",
    coordinateSystem: doc?.site.coordinateSystem ?? "Demo / Local",
    savedAtIso: doc?.savedAtIso ?? null,
    source: doc?.source ?? (dataset?.source.kind === "local-plan" ? "local" : "demo"),
    context: {
      blocks: ctx?.blocks.length ?? 0,
      roads: ctx?.roads.length ?? 0,
      contours: ctx?.contours.length ?? 0,
      transitLines: ctx && ctx.transit.line.length > 1 ? 1 : 0,
      transitStations: ctx?.transit.stations.length ?? 0,
      utilities: ctx?.utilities.length ?? 0,
      streetTrees: ctx?.streetTrees.length ?? 0,
      blockPlates: ctx?.blockPlates.length ?? 0,
    },
  };
}

/** Enabled sections of a report, in document order. */
export function enabledSections(config: ReportConfig): ReportSectionConfig[] {
  return config.sections.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
}

const MISSING_ORDER: ReportModel["missing"] = ["project", "planning", "analysis", "optimization", "visualization", "bim"];

/**
 * Assemble the report model for a project. Each source is guarded: a failure
 * is recorded in `missing` and the affected sections render an honest note.
 */
export async function buildReportModel(projectId: string): Promise<ReportModel> {
  const failed = new Set<ReportModel["missing"][number]>();

  const [project, planningDoc, dataset, savedViews] = await Promise.all([
    getProjectDetails(projectId).catch(() => {
      failed.add("project");
      return null;
    }),
    getPlanningState(projectId).catch(() => {
      failed.add("planning");
      return null;
    }),
    getAnalysisSpatialData(projectId).catch(() => {
      failed.add("analysis");
      return null;
    }),
    getSavedViews(projectId).catch(() => {
      failed.add("visualization");
      return null;
    }),
  ]);

  let context: OptimizationContext | null = null;
  let state: OptimizationState | null = null;
  let scenarios: ScoredScenario[] = [];
  let generatedForReport = false;

  if (dataset) {
    try {
      // Reuse the dataset already loaded: getOptimizationContext would otherwise
      // re-read planning + project details a second time.
      context = await getOptimizationContext(projectId, dataset);
      state = await getOptimizationState(projectId, context);
      let raw: OptimizationScenario[];
      if (state.generation) {
        // Deterministic re-derivation of the saved run — identical to what the
        // Optimization workspace shows; no scenario copies are stored.
        raw = await deriveScenarios(context, state.generation);
      } else {
        // Nothing was ever run: derive once, for this report only. Read-only —
        // the Optimization workspace state is not modified.
        raw = (await generateScenarios(context, state.inputs)).scenarios;
        generatedForReport = true;
      }
      // Apply the live weights, constraints and statuses, exactly as the
      // Optimization workspace does, so both surfaces always agree.
      scenarios = scoreScenarios(raw, context, state.inputs, state.scenarioStatus, state.selectedScenarioId);
    } catch {
      failed.add("optimization");
      context = null;
      state = null;
      scenarios = [];
      generatedForReport = false;
    }
  } else {
    failed.add("optimization");
  }

  const analysis = context?.analysis ?? null;
  if (!analysis) failed.add("analysis");

  // BIM (Step 17) reuses the same spatial dataset: the model index is derived
  // here for the report only, never persisted by this call.
  const bim = dataset
    ? await getBimReportSummary(projectId, dataset).catch(() => {
        failed.add("bim");
        return null;
      })
    : null;
  if (!dataset) failed.add("bim");

  const planning = buildPlanningSummary(dataset, planningDoc);
  if (!planning) failed.add("planning");

  return {
    projectId,
    project,
    planning,
    spatial: dataset,
    analysis,
    optimization:
      context && state
        ? {
            state,
            context,
            scenarios,
            selected: scenarios.find((s) => s.id === state?.selectedScenarioId) ?? null,
            currentMetrics: context.current.metrics,
            generatedForReport,
          }
        : null,
    savedViews: savedViews ?? [],
    bim,
    missing: MISSING_ORDER.filter((m) => failed.has(m)),
  };
}
