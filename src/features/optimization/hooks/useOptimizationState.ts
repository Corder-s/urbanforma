import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CameraPreset } from "../../visualization/types/visualization.types";
import { HISTORY_LIMIT, rebalanceWeights } from "../data/optimization.data";
import { applyScenarioOps } from "../lib/scenario.spatial";
import { goalRows, summariseChecks, type GoalRow } from "../lib/scenario.scoring";
import {
  applyScenario as applyScenarioTransition,
  archiveScenario as archiveTransition,
  currentChecks,
  deriveScenarios,
  loadPrefs,
  markReviewed,
  resetOptimization,
  saveOptimizationState,
  savePrefs,
  scoreScenarios,
  selectScenario as selectTransition,
  type ScoredScenario,
} from "../services/optimization.service";
import type {
  ConstraintCheck,
  ConstraintId,
  DerivedSpatialState,
  GenerationStatus,
  GoalId,
  GoalPriority,
  ObjectiveId,
  OptimizationContext,
  OptimizationInputs,
  OptimizationMode,
  OptimizationScenario,
  OptimizationState,
  PlanningVersion,
  ScenarioGeneration,
  ScenarioViewMode,
} from "../types/optimization.types";
import { useOptimization, type OptimizationLoad } from "./useOptimization";
import { useScenarioGeneration, type GenerationProgress } from "./useScenarioGeneration";

export type SaveState = { status: "idle" } | { status: "saving" } | { status: "saved"; at: string } | { status: "error"; message: string };

export interface OptimizationWorkspaceState {
  load: OptimizationLoad;
  retry: () => void;
  context: OptimizationContext | null;
  state: OptimizationState | null;
  dirty: boolean;

  // inputs
  inputs: OptimizationInputs | null;
  setGoalPriority: (id: GoalId, priority: GoalPriority) => void;
  setWeight: (id: ObjectiveId, weight: number) => void;
  resetWeights: () => void;
  setConstraint: (id: ConstraintId, patch: { value?: number; enabled?: boolean }) => void;

  // scenarios
  scenarios: ScoredScenario[];
  activeScenario: ScoredScenario | null;
  activeScenarioId: string | null;
  setActiveScenario: (id: string | null) => void;
  compareIds: string[];
  toggleCompare: (id: string) => void;
  currentChecks: ConstraintCheck[];
  goalRows: GoalRow[];
  derivedSpatial: DerivedSpatialState | null;
  selectedObjectId: string | null;
  selectObject: (id: string | null) => void;

  // generation
  generation: GenerationProgress | null;
  generationStatus: GenerationStatus;
  generate: () => void;
  dismissGeneration: () => void;
  loadGeneration: (generationId: string) => void;
  history: ScenarioGeneration[];
  scenarioSource: "fresh" | "restored" | null;

  // decisions
  selectScenario: (id: string) => void;
  archiveScenario: (id: string) => void;
  applyScenario: (id: string) => PlanningVersion | null;
  resetAll: () => void;
  versions: PlanningVersion[];

  // persistence / prefs
  save: () => Promise<void>;
  saveState: SaveState;
  mode: OptimizationMode;
  setMode: (m: OptimizationMode) => void;
  viewMode: ScenarioViewMode;
  setViewMode: (v: ScenarioViewMode) => void;
  camera: { preset: CameraPreset; token: number };
  requestCamera: (preset: CameraPreset) => void;
  notice: string | null;
  setNotice: (n: string | null) => void;
}

/**
 * Workspace state for /app/optimization. Owns the editable inputs, the
 * generated scenarios (raw from the provider, scored live), the selection /
 * comparison sets, decisions and persistence. Heavy derivations (scenario
 * datasets) are memoised per active scenario; weight changes only re-score.
 */
export function useOptimizationState(projectId: string | null): OptimizationWorkspaceState {
  const { load, retry } = useOptimization(projectId);
  const context = load.status === "ready" ? load.context : null;

  // --- persisted state (local copy; saved explicitly) -----------------------------------------------
  const [state, setState] = useState<OptimizationState | null>(null);
  const [dirty, setDirty] = useState(false);
  const [rawScenarios, setRawScenarios] = useState<OptimizationScenario[]>([]);
  const [scenarioSource, setScenarioSource] = useState<"fresh" | "restored" | null>(null);
  const [activeScenarioId, setActiveScenarioIdRaw] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [selectedObjectId, selectObject] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const [notice, setNotice] = useState<string | null>(null);

  // prefs (mode / view) per project
  const [prefs, setPrefs] = useState<{ for: string | null; mode: OptimizationMode; viewMode: ScenarioViewMode }>({ for: null, mode: "optimize", viewMode: "2d" });
  const mode = prefs.for === projectId ? prefs.mode : "optimize";
  const viewMode = prefs.for === projectId ? prefs.viewMode : "2d";
  useEffect(() => {
    if (!projectId) return;
    const p = loadPrefs(projectId);
    setPrefs({ for: projectId, mode: p.mode, viewMode: p.viewMode });
  }, [projectId]);
  const setMode = useCallback(
    (m: OptimizationMode) => {
      if (!projectId) return;
      setPrefs((p) => {
        const next = { for: projectId, mode: m, viewMode: p.for === projectId ? p.viewMode : "2d" };
        savePrefs(projectId, { mode: next.mode, viewMode: next.viewMode });
        return next;
      });
    },
    [projectId]
  );
  const setViewMode = useCallback(
    (v: ScenarioViewMode) => {
      if (!projectId) return;
      setPrefs((p) => {
        const next = { for: projectId, mode: p.for === projectId ? p.mode : "optimize", viewMode: v };
        savePrefs(projectId, { mode: next.mode, viewMode: next.viewMode });
        return next;
      });
    },
    [projectId]
  );

  // --- hydrate from the loaded state; re-derive the stored generation --------------------------------
  const hydratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (load.status !== "ready") {
      if (load.status !== "loading") {
        setState(null);
        setRawScenarios([]);
      }
      return;
    }
    const key = `${load.projectId}:${load.stored.savedAt ?? "fresh"}`;
    if (hydratedFor.current === key && state?.projectId === load.projectId) return;
    hydratedFor.current = key;
    setState(load.stored);
    setDirty(false);
    setCompareIds([]);
    selectObject(null);
    setSaveState({ status: "idle" });
    setNotice(null);
    const gen = load.stored.generation;
    if (!gen) {
      setRawScenarios([]);
      setScenarioSource(null);
      setActiveScenarioIdRaw(null);
      return;
    }
    let active = true;
    deriveScenarios(load.context, gen).then((list) => {
      if (!active) return;
      setRawScenarios(list);
      setScenarioSource("restored");
      setActiveScenarioIdRaw(load.stored.selectedScenarioId && list.some((s) => s.id === load.stored.selectedScenarioId) ? load.stored.selectedScenarioId : list[0]?.id ?? null);
      setCompareIds(list.slice(0, 3).map((s) => s.id));
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const inputs = state?.inputs ?? null;

  const patchState = useCallback((fn: (s: OptimizationState) => OptimizationState) => {
    setState((s) => (s ? fn(s) : s));
    setDirty(true);
  }, []);

  // --- inputs --------------------------------------------------------------------------------------------
  const setGoalPriority = useCallback((id: GoalId, priority: GoalPriority) => patchState((s) => ({ ...s, inputs: { ...s.inputs, goals: s.inputs.goals.map((g) => (g.id === id ? { ...g, priority } : g)) } })), [patchState]);
  const setWeight = useCallback((id: ObjectiveId, weight: number) => patchState((s) => ({ ...s, inputs: { ...s.inputs, weights: rebalanceWeights(s.inputs.weights, id, weight) } })), [patchState]);
  const resetWeights = useCallback(
    () =>
      patchState((s) => ({
        ...s,
        inputs: {
          ...s.inputs,
          weights: [
            { id: "environment", weight: 30 },
            { id: "mobility", weight: 25 },
            { id: "green", weight: 20 },
            { id: "density", weight: 15 },
            { id: "carbon", weight: 10 },
          ],
        },
      })),
    [patchState]
  );
  const setConstraint = useCallback((id: ConstraintId, patch: { value?: number; enabled?: boolean }) => patchState((s) => ({ ...s, inputs: { ...s.inputs, constraints: s.inputs.constraints.map((c) => (c.id === id ? { ...c, ...patch } : c)) } })), [patchState]);

  // --- generation ----------------------------------------------------------------------------------------
  const onGenerated = useCallback(
    (generation: ScenarioGeneration, scenarios: OptimizationScenario[]) => {
      setRawScenarios(scenarios);
      setScenarioSource("fresh");
      setActiveScenarioIdRaw(scenarios[0]?.id ?? null);
      setCompareIds(scenarios.slice(0, 3).map((s) => s.id));
      selectObject(null);
      patchState((s) => ({
        ...s,
        generation,
        history: [generation, ...(s.generation ? [s.generation] : []), ...s.history.filter((h) => h.id !== s.generation?.id)].slice(0, HISTORY_LIMIT),
        scenarioStatus: Object.fromEntries(Object.entries(s.scenarioStatus).filter(([k]) => !k.startsWith(generation.id))),
        selectedScenarioId: null,
        lastGeneratedAt: generation.generatedAt,
      }));
    },
    [patchState]
  );
  const gen = useScenarioGeneration(onGenerated);
  const generate = useCallback(() => {
    if (!context || !inputs) return;
    gen.start(context, inputs);
  }, [context, inputs, gen]);

  const loadGeneration = useCallback(
    (generationId: string) => {
      if (!context || !state) return;
      const target = state.generation?.id === generationId ? state.generation : state.history.find((h) => h.id === generationId);
      if (!target) return;
      deriveScenarios(context, target).then((list) => {
        setRawScenarios(list);
        setScenarioSource("restored");
        setActiveScenarioIdRaw(list[0]?.id ?? null);
        setCompareIds(list.slice(0, 3).map((s) => s.id));
        selectObject(null);
        if (state.generation?.id !== generationId) {
          patchState((s) => ({ ...s, generation: target, history: [target, ...(s.generation ? [s.generation] : []), ...s.history.filter((h) => h.id !== target.id && h.id !== s.generation?.id)].slice(0, HISTORY_LIMIT), inputs: target.inputs }));
          setNotice(`Loaded scenarios generated ${relativeDay(target.generatedAt)}.`);
        }
      });
    },
    [context, state, patchState]
  );

  // --- scoring (cheap, live) -------------------------------------------------------------------------
  const scenarios = useMemo<ScoredScenario[]>(() => {
    if (!context || !state || rawScenarios.length === 0) return [];
    return scoreScenarios(rawScenarios, context, state.inputs, state.scenarioStatus, state.selectedScenarioId);
  }, [context, state, rawScenarios]);

  const activeScenario = useMemo(() => scenarios.find((s) => s.id === activeScenarioId) ?? null, [scenarios, activeScenarioId]);

  const setActiveScenario = useCallback(
    (id: string | null) => {
      setActiveScenarioIdRaw(id);
      selectObject(null);
      if (id) patchState((s) => markReviewed(s, id));
    },
    [patchState]
  );

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= 4 ? ids : [...ids, id]));
  }, []);

  const checksForCurrent = useMemo(() => (context && state ? currentChecks(context, state.inputs) : []), [context, state]);
  const rows = useMemo(() => (context ? goalRows(context.current) : []), [context]);

  // --- scenario spatial state (memoised; only the active scenario is derived) -----------------------
  const derivedSpatial = useMemo<DerivedSpatialState | null>(() => {
    if (!context || !activeScenario) return null;
    return applyScenarioOps(context.spatial, activeScenario.spatialState, { greenCoveragePct: activeScenario.metrics.greenCoverage, populationCapacity: activeScenario.metrics.populationCapacity }, activeScenario.name);
    // ops / metrics are stable per raw scenario; scoring changes must not re-derive geometry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, activeScenario?.id, activeScenario?.spatialState]);

  // --- decisions ---------------------------------------------------------------------------------------
  const selectScenario = useCallback(
    (id: string) => {
      patchState((s) => selectTransition(s, id));
      setActiveScenarioIdRaw(id);
      const name = rawScenarios.find((s) => s.id === id)?.name ?? "Scenario";
      setNotice(`${name} is now the preferred planning direction.`);
    },
    [patchState, rawScenarios]
  );
  const archiveScenario = useCallback((id: string) => patchState((s) => archiveTransition(s, id)), [patchState]);

  const applyScenario = useCallback(
    (id: string): PlanningVersion | null => {
      if (!context || !state) return null;
      const scenario = scenarios.find((s) => s.id === id);
      if (!scenario) return null;
      const { state: next, version } = applyScenarioTransition(state, scenario, context);
      setState(next);
      setDirty(true);
      // applying persists immediately (it is a decision, not a draft)
      saveOptimizationState(context.projectId, next)
        .then((at) => {
          setState((s) => (s ? { ...s, savedAt: at } : s));
          setDirty(false);
          setSaveState({ status: "saved", at });
        })
        .catch((err: unknown) => setSaveState({ status: "error", message: err instanceof Error ? err.message : "Unable to save." }));
      setNotice(`Applied locally — "${version.name}" was added as a new version. The current plan is unchanged.`);
      return version;
    },
    [context, state, scenarios]
  );

  const resetAll = useCallback(() => {
    if (!projectId) return;
    gen.dismiss();
    const next = resetOptimization(projectId, context, state);
    setState(next);
    setRawScenarios([]);
    setScenarioSource(null);
    setActiveScenarioIdRaw(null);
    setCompareIds([]);
    selectObject(null);
    setDirty(false);
    setSaveState({ status: "idle" });
    // applied versions are project data — keep them persisted across the reset
    if (next.versions.some((v) => v.type !== "current")) {
      saveOptimizationState(projectId, next)
        .then((at) => setState((s) => (s ? { ...s, savedAt: at } : s)))
        .catch(() => undefined);
    }
    setNotice("Optimization reset to the baseline. Project data and versions were kept.");
  }, [projectId, context, state, gen]);

  // --- save ------------------------------------------------------------------------------------------------
  const save = useCallback(async () => {
    if (!state || !projectId) return;
    setSaveState({ status: "saving" });
    try {
      const at = await saveOptimizationState(projectId, state);
      setState((s) => (s ? { ...s, savedAt: at } : s));
      setDirty(false);
      setSaveState({ status: "saved", at });
    } catch (err: unknown) {
      setSaveState({ status: "error", message: err instanceof Error ? err.message : "Unable to save." });
    }
  }, [state, projectId]);

  // --- camera + notices --------------------------------------------------------------------------------
  const [camera, setCamera] = useState<{ preset: CameraPreset; token: number }>({ preset: "fit", token: 0 });
  const requestCamera = useCallback((preset: CameraPreset) => setCamera((c) => ({ preset, token: c.token + 1 })), []);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(t);
  }, [notice]);

  const generationStatus: GenerationStatus = gen.progress?.error ? "error" : gen.generating ? "generating" : scenarios.length > 0 ? "complete" : "idle";

  return {
    load,
    retry,
    context,
    state,
    dirty,
    inputs,
    setGoalPriority,
    setWeight,
    resetWeights,
    setConstraint,
    scenarios,
    activeScenario,
    activeScenarioId,
    setActiveScenario,
    compareIds,
    toggleCompare,
    currentChecks: checksForCurrent,
    goalRows: rows,
    derivedSpatial,
    selectedObjectId,
    selectObject,
    generation: gen.progress,
    generationStatus,
    generate,
    dismissGeneration: gen.dismiss,
    loadGeneration,
    history: state ? [...(state.generation ? [state.generation] : []), ...state.history.filter((h) => h.id !== state.generation?.id)] : [],
    scenarioSource,
    selectScenario,
    archiveScenario,
    applyScenario,
    resetAll,
    versions: state?.versions ?? [],
    save,
    saveState,
    mode,
    setMode,
    viewMode,
    setViewMode,
    camera,
    requestCamera,
    notice,
    setNotice,
  };
}

export function relativeDay(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function summaryOfChecks(checks: ConstraintCheck[]) {
  return summariseChecks(checks);
}
