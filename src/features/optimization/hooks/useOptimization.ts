import { useCallback, useEffect, useState } from "react";
import { getOptimizationContext, getOptimizationState, ProjectNotFoundError } from "../services/optimization.service";
import type { OptimizationContext, OptimizationState } from "../types/optimization.types";

export type OptimizationLoad =
  | { status: "idle" }
  | { status: "loading"; projectId: string }
  | { status: "not-found"; projectId: string }
  | { status: "error"; projectId: string; message: string }
  | { status: "ready"; projectId: string; context: OptimizationContext; stored: OptimizationState };

/**
 * Loads the optimization context for a project: the current plan (Step 12
 * spatial dataset + Step 13 analysis result) and the locally persisted
 * optimization state (goals, weights, constraints, generation, decisions).
 */
export function useOptimization(projectId: string | null) {
  const [load, setLoad] = useState<OptimizationLoad>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!projectId) {
      setLoad({ status: "idle" });
      return;
    }
    let active = true;
    setLoad({ status: "loading", projectId });
    (async () => {
      try {
        const context = await getOptimizationContext(projectId);
        const stored = await getOptimizationState(projectId, context);
        if (active) setLoad({ status: "ready", projectId, context, stored });
      } catch (err: unknown) {
        if (!active) return;
        if (err instanceof ProjectNotFoundError) setLoad({ status: "not-found", projectId });
        else setLoad({ status: "error", projectId, message: err instanceof Error ? err.message : "Unable to load the current plan." });
      }
    })();
    return () => {
      active = false;
    };
  }, [projectId, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return { load, retry };
}
