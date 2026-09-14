import { useEffect, useState } from "react";
import type { OptimizationScenario } from "../../optimization/types/optimization.types";
import { currentPlanOption, scenarioOption, type ScenarioOption } from "../lib/scenarios";
import type { SpatialDataset } from "../types/visualization.types";

export type ScenarioLoad =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; options: ScenarioOption[]; note: string; source: "stored" | "default" }
  | { status: "error"; options: ScenarioOption[]; note: string };

/**
 * Scenario options for the viewer: the current plan (Step 13 analysis metrics)
 * plus the Step 14 planning scenarios. When the project has a stored
 * generation it is re-derived exactly (same deterministic provider); otherwise
 * the scenarios are derived once from the default optimization inputs so the
 * comparison is always available. Scenario datasets are ops applied on top of
 * the current plan — no second dataset exists.
 *
 * The optimization service and the scenario spatial ops are imported *inside*
 * the effect. This hook is reached from `useVisualizationState`, i.e. from the
 * shared visualization core that every map route renders — including BIM, which
 * never shows a scenario picker. Importing them statically put ~17 kB gzip of
 * optimization machinery on those routes' blocking first paint. The effect was
 * already async with its own loading/error states, so loading the modules here
 * changes nothing the user sees; both imports run in parallel.
 */
export function useScenarioOptions(projectId: string | null, base: SpatialDataset | null): ScenarioLoad {
  const [load, setLoad] = useState<ScenarioLoad>({ status: "idle" });

  useEffect(() => {
    if (!projectId || !base || base.projectId !== projectId) {
      setLoad({ status: "idle" });
      return;
    }
    let active = true;
    setLoad({ status: "loading" });
    (async () => {
      const [{ applyScenarioOps }, optimization] = await Promise.all([
        import("../../optimization/lib/scenario.spatial"),
        import("../../optimization/services/optimization.service"),
      ]);
      const { deriveScenarios, generateScenarios, getOptimizationContext, getOptimizationState, scoreScenarios } = optimization;
      const context = await getOptimizationContext(projectId, base);
      const current = currentPlanOption(base, context.analysis, context.current);
      try {
        const stored = await getOptimizationState(projectId, context);
        let raw: OptimizationScenario[];
        let source: "stored" | "default";
        if (stored.generation) {
          raw = await deriveScenarios(context, stored.generation);
          source = "stored";
        } else {
          raw = (await generateScenarios(context, stored.inputs)).scenarios;
          source = "default";
        }
        const scored = scoreScenarios(raw, context, stored.inputs, stored.scenarioStatus, stored.selectedScenarioId);
        const options: ScenarioOption[] = [current];
        for (const s of scored) {
          const derived = applyScenarioOps(base, s.spatialState, { greenCoveragePct: s.metrics.greenCoverage, populationCapacity: s.metrics.populationCapacity }, s.name);
          options.push(scenarioOption(base, context.analysis, context.current, s, derived.dataset, stored.selectedScenarioId === s.id));
        }
        const when = stored.generation ? new Date(stored.generation.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
        const note = source === "stored" ? `Generated planning scenarios from your last optimization run${when ? ` (${when})` : ""}.` : "Generated planning scenarios with default optimization settings — tune goals in Optimization.";
        if (active) setLoad({ status: "ready", options, note, source });
      } catch (err: unknown) {
        if (active) setLoad({ status: "error", options: [current], note: err instanceof Error ? err.message : "Scenarios are unavailable right now." });
      }
    })().catch((err: unknown) => {
      if (active) setLoad({ status: "error", options: [], note: err instanceof Error ? err.message : "Scenarios are unavailable right now." });
    });
    return () => {
      active = false;
    };
  }, [projectId, base]);

  return load;
}
