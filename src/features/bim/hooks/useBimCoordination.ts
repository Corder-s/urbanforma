import { useCallback, useEffect, useMemo, useState } from "react";
import { getPlanningState } from "../../planning/services/planning.service";
import type { PlanningDocument } from "../../planning/types/planning.types";
import { getAnalysis } from "../../analysis/services/analysis.service";
import type { AnalysisResult } from "../../analysis/types/analysis.types";
import { getOptimizationState } from "../../optimization/services/optimization.service";
import type { OptimizationState } from "../../optimization/types/optimization.types";
import { loadReports } from "../../reports/services/report.service";
import type { ReportConfig } from "../../reports/types/report.types";
import type { SpatialDataset } from "../../visualization/types/visualization.types";
import { coordinationChecks, planningLinks, type BimIndex, type BimQuantities } from "../lib/bimModel";
import type { BimModel, BimPlanningLink, CoordinationCheck } from "../types/bim.types";

export type CoordinationLoad =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; failed: string[] };

export interface BimCoordinationApi {
  load: CoordinationLoad;
  planningDoc: PlanningDocument | null;
  analysis: AnalysisResult | null;
  optimization: OptimizationState | null;
  reports: ReportConfig[];
  checks: CoordinationCheck[];
  links: BimPlanningLink[];
  reload: () => void;
}

/**
 * Reads the *other* modules for the coordination view — planning document,
 * analysis result, optimization state and saved reports — and turns them into
 * checks with real evidence. Each source fails independently: a module that has
 * nothing for this project simply reports `missing`, never an invented result.
 *
 * `enabled` keeps the reads off while the user is in the model or issues mode.
 */
export function useBimCoordination(
  projectId: string | null,
  enabled: boolean,
  dataset: SpatialDataset | null,
  index: BimIndex | null,
  quantities: BimQuantities | null,
  models: BimModel[]
): BimCoordinationApi {
  const [planningDoc, setPlanningDoc] = useState<PlanningDocument | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [optimization, setOptimization] = useState<OptimizationState | null>(null);
  const [reports, setReports] = useState<ReportConfig[]>([]);
  const [load, setLoad] = useState<CoordinationLoad>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!projectId || !enabled) {
      setLoad({ status: "idle" });
      return;
    }
    let active = true;
    setLoad({ status: "loading" });
    const failed: string[] = [];

    const readPlanning = getPlanningState(projectId)
      .then((doc) => {
        if (active) setPlanningDoc(doc);
      })
      .catch(() => {
        failed.push("planning");
        if (active) setPlanningDoc(null);
      });

    const readAnalysis = dataset
      ? getAnalysis(projectId, dataset)
          .then((res) => {
            if (active) setAnalysis(res.result);
          })
          .catch(() => {
            failed.push("analysis");
            if (active) setAnalysis(null);
          })
      : Promise.resolve();

    const readOptimization = getOptimizationState(projectId, null)
      .then((state) => {
        if (active) setOptimization(state);
      })
      .catch(() => {
        failed.push("optimization");
        if (active) setOptimization(null);
      });

    Promise.all([readPlanning, readAnalysis, readOptimization]).then(() => {
      if (!active) return;
      let saved: ReportConfig[] = [];
      try {
        saved = loadReports(projectId) ?? [];
      } catch {
        failed.push("reports");
      }
      setReports(saved);
      setLoad({ status: "ready", failed });
    });

    return () => {
      active = false;
    };
  }, [projectId, enabled, dataset, attempt]);

  const reload = useCallback(() => setAttempt((a) => a + 1), []);

  const checks = useMemo<CoordinationCheck[]>(() => {
    if (!dataset || !index || !quantities) return [];
    return coordinationChecks({ dataset, index, quantities, models, planningDoc, analysis, optimization, reports });
  }, [dataset, index, quantities, models, planningDoc, analysis, optimization, reports]);

  const links = useMemo<BimPlanningLink[]>(() => (dataset && index ? planningLinks(index, dataset) : []), [dataset, index]);

  return { load, planningDoc, analysis, optimization, reports, checks, links, reload };
}
