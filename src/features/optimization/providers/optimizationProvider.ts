import type { OptimizationInput, OptimizationScenario } from "../types/optimization.types";

/**
 * Contract every scenario source implements.
 *
 *   DemoOptimizationProvider     – deterministic local heuristics (this version)
 *   BackendOptimizationProvider  – POST /api/projects/:id/optimization (later)
 *   AssistedOptimizationProvider – model-assisted proposals (later, clearly labelled)
 *
 * The workspace only ever talks to the service, which talks to a provider.
 * Nothing in the UI depends on how scenarios are produced.
 */
export interface OptimizationProvider {
  id: string;
  version: string;
  /** Human label shown in the status bar / export provenance. */
  label: string;
  generate(input: OptimizationInput): OptimizationScenario[] | Promise<OptimizationScenario[]>;
}
