import { useCallback, useEffect, useRef, useState } from "react";
import type { SpatialDataset } from "../../visualization/types/visualization.types";
import { RUN_DURATION_MS, RUN_DURATION_REDUCED_MS, RUN_STEPS } from "../data/analysis.data";
import { getAnalysis, getAnalysisSpatialData, ProjectNotFoundError, runAnalysis } from "../services/analysis.service";
import type { AnalysisResult, AnalysisStatus } from "../types/analysis.types";

export type AnalysisLoad =
  | { status: "idle" }
  | { status: "loading"; projectId: string }
  | { status: "not-found"; projectId: string }
  | { status: "error"; projectId: string; message: string }
  | { status: "ready"; projectId: string; data: SpatialDataset; result: AnalysisResult; fromRun: boolean };

export interface RunProgress {
  /** Index of the active step in RUN_STEPS. */
  step: number;
  /** 0–1 overall progress. */
  progress: number;
  /** Set once the sequence finished (shown briefly as "Analysis Complete"). */
  done: boolean;
  error: string | null;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Loads the spatial dataset + analysis result for a project and owns the
 * "Run Analysis" choreography: a short, local, time-based step sequence
 * (no fake network request) followed by the recomputed result.
 */
export function useAnalysis(projectId: string | null) {
  const [load, setLoad] = useState<AnalysisLoad>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);
  const [run, setRun] = useState<RunProgress | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (!projectId) {
      setLoad({ status: "idle" });
      return;
    }
    let active = true;
    setLoad({ status: "loading", projectId });
    setRun(null);
    (async () => {
      try {
        const data = await getAnalysisSpatialData(projectId);
        const { result, fromRun } = await getAnalysis(projectId, data);
        if (active) setLoad({ status: "ready", projectId, data, result, fromRun });
      } catch (err: unknown) {
        if (!active) return;
        if (err instanceof ProjectNotFoundError) setLoad({ status: "not-found", projectId });
        else setLoad({ status: "error", projectId, message: err instanceof Error ? err.message : "Unable to load the analysis." });
      }
    })();
    return () => {
      active = false;
    };
  }, [projectId, attempt]);

  const clearTimers = useCallback(() => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  /** Start the local run sequence; resolves the new result at the end. */
  const startRun = useCallback(() => {
    if (load.status !== "ready" || run?.done === false) return;
    const { projectId: pid, data } = load;
    clearTimers();
    const total = prefersReducedMotion() ? RUN_DURATION_REDUCED_MS : RUN_DURATION_MS;
    const weightSum = RUN_STEPS.reduce((s, st) => s + st.weight, 0);
    setRun({ step: 0, progress: 0, done: false, error: null });
    let elapsed = 0;
    RUN_STEPS.forEach((st, i) => {
      const dur = (st.weight / weightSum) * total;
      const at = elapsed;
      elapsed += dur;
      timers.current.push(window.setTimeout(() => setRun((r) => (r && !r.done ? { ...r, step: i, progress: at / total } : r)), at));
    });
    timers.current.push(
      window.setTimeout(async () => {
        try {
          const result = await runAnalysis(pid, data);
          setLoad((l) => (l.status === "ready" && l.projectId === pid ? { ...l, result, fromRun: true } : l));
          setRun({ step: RUN_STEPS.length - 1, progress: 1, done: true, error: null });
          // auto-dismiss the completion notice
          timers.current.push(window.setTimeout(() => setRun((r) => (r?.done ? null : r)), prefersReducedMotion() ? 1200 : 1800));
        } catch (err: unknown) {
          setRun({ step: RUN_STEPS.length - 1, progress: 1, done: true, error: err instanceof Error ? err.message : "The analysis could not be completed." });
        }
      }, total)
    );
  }, [load, run, clearTimers]);

  const dismissRun = useCallback(() => {
    clearTimers();
    setRun(null);
  }, [clearTimers]);

  const analysisStatus: AnalysisStatus = load.status === "error" || run?.error ? "error" : run && !run.done ? "running" : load.status === "ready" ? "complete" : "idle";

  return { load, retry, run, startRun, dismissRun, analysisStatus };
}
