import { useCallback, useEffect, useRef, useState } from "react";
import { GENERATION_DURATION_MS, GENERATION_DURATION_REDUCED_MS, GENERATION_STEPS } from "../data/optimization.data";
import { generateScenarios } from "../services/optimization.service";
import type { OptimizationContext, OptimizationInputs, OptimizationScenario, ScenarioGeneration } from "../types/optimization.types";

export interface GenerationProgress {
  /** Index of the active step in GENERATION_STEPS. */
  step: number;
  /** 0–1 overall progress. */
  progress: number;
  done: boolean;
  error: string | null;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Owns the "Generate Scenarios" choreography: a short, local, time-based step
 * sequence (no fake network request) followed by the provider result. The
 * scenarios themselves are derived synchronously by the service.
 */
export function useScenarioGeneration(onGenerated: (generation: ScenarioGeneration, scenarios: OptimizationScenario[]) => void) {
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const timers = useRef<number[]>([]);
  const onGeneratedRef = useRef(onGenerated);
  onGeneratedRef.current = onGenerated;

  const clearTimers = useCallback(() => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const generating = !!progress && !progress.done;

  const start = useCallback(
    (context: OptimizationContext, inputs: OptimizationInputs) => {
      if (generating) return;
      clearTimers();
      const total = prefersReducedMotion() ? GENERATION_DURATION_REDUCED_MS : GENERATION_DURATION_MS;
      const weightSum = GENERATION_STEPS.reduce((s, st) => s + st.weight, 0);
      setProgress({ step: 0, progress: 0, done: false, error: null });
      let elapsed = 0;
      GENERATION_STEPS.forEach((st, i) => {
        const at = elapsed;
        elapsed += (st.weight / weightSum) * total;
        timers.current.push(window.setTimeout(() => setProgress((p) => (p && !p.done ? { ...p, step: i, progress: at / total } : p)), at));
      });
      timers.current.push(
        window.setTimeout(async () => {
          try {
            const { generation, scenarios } = await generateScenarios(context, inputs);
            onGeneratedRef.current(generation, scenarios);
            setProgress({ step: GENERATION_STEPS.length - 1, progress: 1, done: true, error: null });
            timers.current.push(window.setTimeout(() => setProgress((p) => (p?.done && !p.error ? null : p)), prefersReducedMotion() ? 1200 : 1800));
          } catch (err: unknown) {
            setProgress({ step: GENERATION_STEPS.length - 1, progress: 1, done: true, error: err instanceof Error ? err.message : "Scenarios could not be generated." });
          }
        }, total)
      );
    },
    [generating, clearTimers]
  );

  const dismiss = useCallback(() => {
    clearTimers();
    setProgress(null);
  }, [clearTimers]);

  return { progress, generating, start, dismiss };
}
