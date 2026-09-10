import { useCallback, useEffect, useMemo, useState } from "react";
import type { CameraPreset, SpatialDataset, SpatialObject } from "../../visualization/types/visualization.types";
import { getCategory, MODES } from "../data/analysis.data";
import { focusZoneId, zoneDetail } from "../lib/analysis.engine";
import { loadAnalysisPrefs, rememberLastAnalyzedProject, saveAnalysisPrefs } from "../services/analysis.service";
import type { AnalysisCategoryId, AnalysisMetric, AnalysisMode, AnalysisOverlay, AnalysisResult, AnalysisStatus, AnalysisViewMode, ComparisonRow, ZoneDetail } from "../types/analysis.types";
import { useAnalysis, type AnalysisLoad, type RunProgress } from "./useAnalysis";

/**
 * The single AnalysisState (spec §19): project, active category, run status,
 * scores, metrics, overlays, selected area, comparison and last run — plus the
 * view helpers the workspace needs. Renderers and panels read from it; none
 * of them owns a copy.
 */
export interface AnalysisState {
  projectId: string | null;
  load: AnalysisLoad;
  retry: () => void;
  data: SpatialDataset | null;
  result: AnalysisResult | null;

  activeCategory: AnalysisCategoryId;
  setCategory: (c: AnalysisCategoryId) => void;
  mode: AnalysisMode;
  setMode: (m: AnalysisMode) => void;

  analysisStatus: AnalysisStatus;
  run: RunProgress | null;
  startRun: () => void;
  dismissRun: () => void;
  /** ISO time of the last explicit run (null when the result is a baseline computation). */
  lastRun: string | null;

  overallScore: number | null;
  metrics: AnalysisMetric[];
  /** Metrics of the active category. */
  categoryMetrics: AnalysisMetric[];
  overlays: AnalysisOverlay[];
  /** Overlay for the active category (null on the overview). */
  activeOverlay: AnalysisOverlay | null;

  /** Selected zone (analysis grid cell) or building id. */
  selectedArea: string | null;
  selectArea: (id: string | null) => void;
  selectedZone: ZoneDetail | null;
  selectedBuilding: SpatialObject | null;
  /** Metric pinned in the inspector (falls back to the category headline). */
  selectedMetric: AnalysisMetric | null;
  selectMetric: (id: string | null) => void;
  /** Densest zone — the discoverable "focus zone" the walkthrough uses. */
  focusZone: string | null;

  comparison: ComparisonRow[];
  compareOpen: boolean;
  setCompareOpen: (v: boolean) => void;

  viewMode: AnalysisViewMode;
  setViewMode: (v: AnalysisViewMode) => void;
  camera: { preset: CameraPreset; token: number };
  requestCamera: (preset: CameraPreset) => void;
}

interface TaggedPrefs {
  for: string | null;
  category: AnalysisCategoryId;
  viewMode: AnalysisViewMode;
}

export function useAnalysisState(projectId: string | null, initialCategory: AnalysisCategoryId | null): AnalysisState {
  const { load, retry, run, startRun, dismissRun, analysisStatus } = useAnalysis(projectId);
  const data = load.status === "ready" ? load.data : null;
  const result = load.status === "ready" ? load.result : null;

  // --- per-project prefs (category + view mode), tagged with the project they belong to -------
  const [prefs, setPrefs] = useState<TaggedPrefs>({ for: null, category: initialCategory ?? "overview", viewMode: "2d" });
  useEffect(() => {
    if (!projectId) return;
    const stored = loadAnalysisPrefs(projectId);
    setPrefs({ for: projectId, category: initialCategory ?? stored?.category ?? "overview", viewMode: stored?.viewMode ?? "2d" });
    rememberLastAnalyzedProject(projectId);
    // initialCategory is read once per project (from the URL); later changes flow through setCategory.
  }, [projectId]);
  useEffect(() => {
    if (!projectId || prefs.for !== projectId) return;
    saveAnalysisPrefs(projectId, { category: prefs.category, viewMode: prefs.viewMode });
  }, [projectId, prefs]);

  const activeCategory = prefs.category;
  const setCategory = useCallback((c: AnalysisCategoryId) => setPrefs((p) => ({ ...p, category: c })), []);
  const mode = getCategory(activeCategory).mode;
  const setMode = useCallback((m: AnalysisMode) => {
    const entry = MODES.find((x) => x.id === m)?.entry ?? "overview";
    setPrefs((p) => (getCategory(p.category).mode === m ? p : { ...p, category: entry }));
  }, []);
  const viewMode = prefs.viewMode;
  const setViewMode = useCallback((v: AnalysisViewMode) => setPrefs((p) => ({ ...p, viewMode: v })), []);

  // --- selection ----------------------------------------------------------------------------------
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  useEffect(() => {
    setSelectedArea(null);
    setSelectedMetricId(null);
  }, [projectId]);
  useEffect(() => setSelectedMetricId(null), [activeCategory]);
  const selectArea = useCallback((id: string | null) => setSelectedArea(id), []);
  const selectMetric = useCallback((id: string | null) => setSelectedMetricId(id), []);

  const metrics = result?.metrics ?? EMPTY_METRICS;
  const overlays = result?.overlays ?? EMPTY_OVERLAYS;
  const categoryMetrics = useMemo(() => metrics.filter((m) => m.category === activeCategory), [metrics, activeCategory]);
  const activeOverlay = useMemo(() => {
    const type = getCategory(activeCategory).overlay;
    return type ? overlays.find((o) => o.type === type) ?? null : null;
  }, [overlays, activeCategory]);
  const selectedMetric = useMemo(() => (selectedMetricId ? metrics.find((m) => m.id === selectedMetricId) ?? null : null), [metrics, selectedMetricId]);
  const selectedZone = useMemo(() => (result && data && selectedArea?.startsWith("zone-") ? zoneDetail(result, data, selectedArea) : null), [result, data, selectedArea]);
  const selectedBuilding = useMemo(() => (data && selectedArea && !selectedArea.startsWith("zone-") ? data.objects.find((o) => o.id === selectedArea) ?? null : null), [data, selectedArea]);
  const focusZone = useMemo(() => (result && data && activeOverlay ? focusZoneId(result, data, activeOverlay.id) : null), [result, data, activeOverlay]);

  // --- compare + camera -------------------------------------------------------------------------
  const [compareOpen, setCompareOpen] = useState(false);
  useEffect(() => setCompareOpen(false), [projectId]);
  const [camera, setCamera] = useState<{ preset: CameraPreset; token: number }>({ preset: "fit", token: 0 });
  const requestCamera = useCallback((preset: CameraPreset) => setCamera((c) => ({ preset, token: c.token + 1 })), []);

  return {
    projectId,
    load,
    retry,
    data,
    result,
    activeCategory,
    setCategory,
    mode,
    setMode,
    analysisStatus,
    run,
    startRun,
    dismissRun,
    lastRun: load.status === "ready" && load.fromRun ? load.result.generatedAt : null,
    overallScore: result?.overallScore ?? null,
    metrics,
    categoryMetrics,
    overlays,
    activeOverlay,
    selectedArea,
    selectArea,
    selectedZone,
    selectedBuilding,
    selectedMetric,
    selectMetric,
    focusZone,
    comparison: result?.comparison ?? EMPTY_COMPARISON,
    compareOpen,
    setCompareOpen,
    viewMode,
    setViewMode,
    camera,
    requestCamera,
  };
}

const EMPTY_METRICS: AnalysisMetric[] = [];
const EMPTY_OVERLAYS: AnalysisOverlay[] = [];
const EMPTY_COMPARISON: ComparisonRow[] = [];
