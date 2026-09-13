import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MAX_ANNOTATIONS } from "../data/presentation.data";
import { DEFAULT_LAYERS, DEFAULT_SETTINGS } from "../data/visualization.data";
import { getMapDefaults, getVisualizationDefaults } from "../../settings/services/settings.service";

/** Read once per mount: the Settings defaults a fresh project starts from. */
function workspaceDefaults(): { viewMode: ViewMode; basemap: BasemapId; settings: VisualizationSettings } {
  const map = getMapDefaults();
  const scene = getVisualizationDefaults();
  return {
    viewMode: map.defaultMode,
    basemap: map.defaultBasemap,
    settings: {
      ...DEFAULT_SETTINGS,
      grid: map.showGrid,
      scaleBar: map.showScale,
      northArrow: map.showNorth,
      terrain: map.terrain,
      buildingStyle: scene.buildingStyle,
      buildingShadows: scene.buildingShadows,
      heightEmphasis: scene.heightEmphasis,
      trees: scene.trees,
      labels: scene.labels,
      roadNetwork: scene.roadNetwork,
      atmosphere: scene.atmosphere,
      timeOfDay: scene.timeOfDay,
    },
  };
}
import { scenarioBadge, type ScenarioOption } from "../lib/scenarios";
import { loadPrefs, rememberLastVisualizedProject, savePrefs } from "../services/visualization.service";
import type {
  Annotation,
  BasemapId,
  CameraPose,
  CameraPreset,
  FocusRequest,
  LayerKey,
  LayerVisibility,
  PresentationMetricId,
  PresentationView,
  SelectionId,
  SpatialDataset,
  SpatialObject,
  ViewMode,
  VisualizationSettings,
  WorkspaceMode,
} from "../types/visualization.types";
import { useCamera, type CameraApi } from "./useCamera";
import { useLayerVisibility } from "./useLayerVisibility";
import { usePresentation, type PresentationApi } from "./usePresentation";
import { newId, useSavedViews, type SavedViewsApi } from "./useSavedViews";
import { useScenarioOptions, type ScenarioLoad } from "./useScenarioOptions";
import { useSpatialData } from "./useSpatialData";

/**
 * The single visualization state (spec §26 / Step 15 §26): project, mode
 * (Explore / Present), view mode, selected scenario, selection, layers,
 * basemap, camera requests, scene settings, annotations, selected metrics and
 * the spatial objects. Both modes and both renderers read from it; nothing
 * owns a copy.
 */
export interface VisualizationState extends CameraApi {
  projectId: string | null;
  load: ReturnType<typeof useSpatialData>["load"];
  retry: () => void;
  /** Dataset of the selected scenario (the current plan when none is selected). */
  data: SpatialDataset | null;
  /** Current-plan dataset (Before side of comparisons). */
  baseData: SpatialDataset | null;
  objects: SpatialObject[];
  /** Objects after layer + settings filtering. */
  visibleObjects: SpatialObject[];
  isLayerVisible: (key: LayerKey) => boolean;

  mode: WorkspaceMode;
  setMode: (m: WorkspaceMode) => void;

  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;

  /** Scenario options (current plan + Step 14 planning scenarios). */
  scenarios: ScenarioLoad;
  scenarioOptions: ScenarioOption[];
  selectedScenario: string | null;
  selectedScenarioOption: ScenarioOption | null;
  currentPlanOption: ScenarioOption | null;
  setScenario: (id: string | null) => void;
  scenarioLabel: string;

  selection: SelectionId;
  selectedObject: SpatialObject | null;
  select: (id: SelectionId) => void;

  layers: LayerVisibility;
  toggleLayer: (key: LayerKey, value?: boolean) => void;
  setGroup: (keys: LayerKey[], value: boolean) => void;
  setLayers: (layers: LayerVisibility) => void;

  basemap: BasemapId;
  setBasemap: (b: BasemapId) => void;

  settings: VisualizationSettings;
  updateSettings: (patch: Partial<VisualizationSettings>) => void;
  resetSettings: () => void;
  setSettings: (s: VisualizationSettings) => void;

  focus: FocusRequest | null;
  focusObject: (id: string) => void;

  /** Presentation (storyboard, annotations, metrics, theme, settings). */
  presentation: PresentationApi;
  annotations: Annotation[];
  selectedMetrics: PresentationMetricId[];
  /** Saved views. */
  savedViews: SavedViewsApi;
  activeView: string | null;
  activeSlide: string | null;
  setActiveSlide: (id: string | null) => void;
  /** Snapshot the current state into a view. `camera2d` is the map camera (owned by the workspace's `useMapView`). */
  captureView: (name: string, camera2d: Camera2d, id?: string) => PresentationView | null;
  /** Restore a saved view / slide view into the shared state. */
  applyView: (view: PresentationView, opts?: { keepMode?: boolean }) => void;

  /** Counter for the status bar (selectable features only). */
  featureCount: number;
  /** Planned site content (buildings, roads, landscape) — drives the "No spatial objects" state. */
  planFeatureCount: number;
}

export function useVisualizationState(projectId: string | null): VisualizationState {
  const { load, retry } = useSpatialData(projectId);
  const baseData = load.status === "ready" ? load.data : null;

  // --- per-project preferences ---------------------------------------------------
  // Kept in one object tagged with the project it was loaded for, so the save
  // effect never writes defaults over a project's stored preferences.
  // Defaults for a project that has never been opened here: the workspace
  // preferences from Settings → Map / Visualization. A project's own stored
  // preferences always win, so this never overrides somebody's saved scene.
  const [defaults] = useState(() => workspaceDefaults());
  const [prefs, setPrefs] = useState<TaggedPrefs>({ for: null, viewMode: defaults.viewMode, basemap: defaults.basemap, layers: DEFAULT_LAYERS, settings: defaults.settings, scenario: null });
  useEffect(() => {
    if (!projectId) return;
    const stored = loadPrefs(projectId);
    setPrefs({
      for: projectId,
      viewMode: stored?.viewMode ?? defaults.viewMode,
      basemap: stored?.basemap ?? defaults.basemap,
      layers: stored?.layers ?? DEFAULT_LAYERS,
      settings: stored?.settings ?? defaults.settings,
      scenario: stored?.scenario ?? null,
    });
    rememberLastVisualizedProject(projectId);
  }, [projectId, defaults]);
  // Persistence is debounced. The scene-settings sliders (time of day, sun
  // intensity / position, camera height) call updateSettings on every
  // pointermove and `prefs` is a fresh object each time, so writing
  // synchronously meant a JSON.stringify + localStorage.setItem per frame for
  // the length of a drag. A trailing debounce collapses that into one write
  // once the user pauses; the pending value is flushed on project switch,
  // unmount and pagehide so a change made just before navigating away is never
  // dropped.
  const pendingPrefs = useRef<{ id: string; prefs: TaggedPrefs } | null>(null);
  const flushPrefs = useCallback(() => {
    const pending = pendingPrefs.current;
    if (!pending) return;
    pendingPrefs.current = null;
    const { viewMode: vm, basemap: bm, layers: ly, settings: st, scenario: sc } = pending.prefs;
    savePrefs(pending.id, { viewMode: vm, basemap: bm, layers: ly, settings: st, scenario: sc });
  }, []);

  // Declared before the debounce effect so that on a project switch the
  // outgoing project's pending write lands before the incoming one is queued.
  useEffect(flushPrefs, [projectId, flushPrefs]);

  useEffect(() => {
    if (!projectId || prefs.for !== projectId) return;
    pendingPrefs.current = { id: projectId, prefs };
    const timer = window.setTimeout(flushPrefs, PREFS_SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [projectId, prefs, flushPrefs]);

  // Unmount and tab close/background never let the debounce timer fire.
  useEffect(() => flushPrefs, [flushPrefs]);
  useEffect(() => {
    window.addEventListener("pagehide", flushPrefs);
    return () => window.removeEventListener("pagehide", flushPrefs);
  }, [flushPrefs]);
  const { viewMode, basemap, layers, settings } = prefs;
  const setLayersFn = useCallback((fn: (l: LayerVisibility) => LayerVisibility) => setPrefs((p) => ({ ...p, layers: fn(p.layers) })), []);

  // --- mode (Explore / Present) — session state, URL-independent ------------------
  const [mode, setModeRaw] = useState<WorkspaceMode>("explore");
  const setMode = useCallback((m: WorkspaceMode) => setModeRaw(m), []);
  useEffect(() => setModeRaw("explore"), [projectId]);

  // --- scenarios (Step 14) -----------------------------------------------------------
  const scenarios = useScenarioOptions(projectId, baseData);
  const scenarioOptions = scenarios.status === "ready" || scenarios.status === "error" ? scenarios.options : EMPTY_OPTIONS;
  const currentPlanOpt = scenarioOptions.find((o) => o.id === null) ?? null;
  const selectedScenario = prefs.scenario;
  const selectedScenarioOption = useMemo(() => (selectedScenario ? scenarioOptions.find((o) => o.id === selectedScenario) ?? null : null), [scenarioOptions, selectedScenario]);
  const setScenario = useCallback((id: string | null) => setPrefs((p) => ({ ...p, scenario: id })), []);
  // The viewport shows the scenario dataset when one is selected and available;
  // until the scenarios resolve (or when the id is unknown) it shows the current plan.
  const data = selectedScenarioOption?.dataset ?? baseData;
  const scenarioLabel = scenarioBadge(selectedScenarioOption);

  // --- selection -------------------------------------------------------------------
  const [selection, setSelection] = useState<SelectionId>(null);
  useEffect(() => setSelection(null), [projectId]);
  const objects = data?.objects ?? EMPTY;
  const selectedObject = useMemo(() => (selection ? objects.find((o) => o.id === selection) ?? null : null), [objects, selection]);
  const select = useCallback((id: SelectionId) => setSelection(id), []);

  // --- layers / settings ---------------------------------------------------------------
  const toggleLayer = useCallback((key: LayerKey, value?: boolean) => setLayersFn((l) => ({ ...l, [key]: value ?? !l[key] })), [setLayersFn]);
  const setGroup = useCallback((keys: LayerKey[], value: boolean) => setLayersFn((l) => keys.reduce((acc, k) => ({ ...acc, [k]: value }), l)), [setLayersFn]);
  const setLayers = useCallback((l: LayerVisibility) => setLayersFn(() => l), [setLayersFn]);
  const updateSettings = useCallback((patch: Partial<VisualizationSettings>) => setPrefs((p) => ({ ...p, settings: { ...p.settings, ...patch } })), []);
  const resetSettings = useCallback(() => setPrefs((p) => ({ ...p, settings: DEFAULT_SETTINGS })), []);
  const setSettings = useCallback((s: VisualizationSettings) => setPrefs((p) => ({ ...p, settings: s })), []);
  const setBasemap = useCallback((b: BasemapId) => setPrefs((p) => ({ ...p, basemap: b })), []);
  const setViewMode = useCallback((m: ViewMode) => setPrefs((p) => ({ ...p, viewMode: m })), []);

  const { isLayerVisible, filter } = useLayerVisibility(layers, settings);
  const visibleObjects = useMemo(() => filter(objects), [filter, objects]);

  // --- camera requests ---------------------------------------------------------------
  const cameraApi = useCamera(projectId);
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const focusObject = useCallback(
    (id: string) => {
      const o = objects.find((x) => x.id === id);
      if (o) setLayersFn((l) => (l[o.layer] ? l : { ...l, [o.layer]: true })); // reveal the layer so the focus is visible
      setSelection(id);
      setFocus((f) => ({ objectId: id, token: (f?.token ?? 0) + 1 }));
    },
    [objects, setLayersFn]
  );
  useEffect(() => setFocus(null), [projectId]);

  // --- presentation + saved views ------------------------------------------------------
  const presentationRaw = usePresentation(projectId, baseData);
  const savedViews = useSavedViews(projectId, baseData);
  const selectedMetrics = presentationRaw.presentation?.selectedMetrics ?? EMPTY_METRICS;
  const [activeView, setActiveView] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState<string | null>(null);
  // Annotations belong to the open slide; without one, the presentation's working
  // set is shown. Opening a slide therefore never discards the working set, and
  // edits made while a slide is open are stored on that slide.
  const activeSlideObj = useMemo(() => (activeSlide ? presentationRaw.slides.find((s) => s.id === activeSlide) ?? null : null), [presentationRaw.slides, activeSlide]);
  const annotations = activeSlideObj ? activeSlideObj.annotations : presentationRaw.presentation?.annotations ?? EMPTY_ANNOTATIONS;
  const presentation = useMemo<PresentationApi>(() => {
    if (!activeSlideObj) return presentationRaw;
    const slideId = activeSlideObj.id;
    const patch = presentationRaw.patchSlideAnnotations;
    return {
      ...presentationRaw,
      addAnnotation: (a) => {
        if (activeSlideObj.annotations.length >= MAX_ANNOTATIONS) return null;
        const ann: Annotation = { ...a, id: newId("ann") };
        patch(slideId, (list) => [...list, ann]);
        return ann;
      },
      updateAnnotation: (id, a) => patch(slideId, (list) => list.map((x) => (x.id === id ? { ...x, ...a } : x))),
      removeAnnotation: (id) => patch(slideId, (list) => list.filter((x) => x.id !== id)),
    };
  }, [presentationRaw, activeSlideObj]);
  useEffect(() => {
    setActiveView(null);
    setActiveSlide(null);
  }, [projectId]);

  const captureView = useCallback(
    (name: string, camera2d: Camera2d, id?: string): PresentationView | null => {
      if (!projectId) return null;
      let camera: CameraPose;
      if (viewMode === "3d") {
        const pose = cameraApi.pose3d();
        camera = pose ? { kind: "3d", position: pose.position, target: pose.target } : { kind: "preset", preset: cameraApi.lastPreset };
      } else {
        camera = camera2d.scale > 0 ? { kind: "2d", center: { x: camera2d.center.x, y: camera2d.center.y }, scale: camera2d.scale } : { kind: "preset", preset: cameraApi.lastPreset };
      }
      return {
        id: id ?? newId("view"),
        projectId,
        name: name.trim().slice(0, 60) || "Untitled view",
        mode,
        viewMode,
        camera,
        scenarioId: selectedScenario,
        visibleLayers: { ...layers },
        sceneSettings: { ...settings },
        basemap,
        selectedMetrics: [...selectedMetrics],
        annotations: annotations.map((a) => ({ ...a })),
        createdAt: new Date().toISOString(),
      };
    },
    [projectId, viewMode, cameraApi, mode, selectedScenario, layers, settings, basemap, selectedMetrics, annotations]
  );

  const applyView = useCallback(
    (view: PresentationView, opts?: { keepMode?: boolean }) => {
      setPrefs((p) => ({ ...p, viewMode: view.viewMode, basemap: view.basemap, layers: { ...view.visibleLayers }, settings: { ...view.sceneSettings }, scenario: view.scenarioId }));
      if (!opts?.keepMode) setModeRaw(view.mode);
      setActiveView(view.id);
      setActiveSlide(null); // a saved view is not a slide — the storyboard / slideshow re-select theirs right after
      // The renderer for `view.viewMode` may mount on the next frame; the pose request carries a token so it is applied once mounted.
      cameraApi.requestPose(view.camera);
    },
    [cameraApi]
  );

  const featureCount = useMemo(() => objects.filter((o) => o.selectable && o.type !== "boundary").length, [objects]);
  const planFeatureCount = useMemo(() => objects.filter((o) => PLAN_TYPES.has(o.type) && !o.id.startsWith("ctx-") && !o.id.startsWith("street-tree-")).length, [objects]);

  return {
    ...cameraApi,
    projectId,
    load,
    retry,
    data,
    baseData,
    objects,
    visibleObjects,
    isLayerVisible,
    mode,
    setMode,
    viewMode,
    setViewMode,
    scenarios,
    scenarioOptions,
    selectedScenario,
    selectedScenarioOption,
    currentPlanOption: currentPlanOpt,
    setScenario,
    scenarioLabel,
    selection,
    selectedObject,
    select,
    layers,
    toggleLayer,
    setGroup,
    setLayers,
    basemap,
    setBasemap,
    settings,
    updateSettings,
    resetSettings,
    setSettings,
    focus,
    focusObject,
    presentation,
    annotations,
    selectedMetrics,
    savedViews,
    activeView,
    activeSlide,
    setActiveSlide,
    captureView,
    applyView,
    featureCount,
    planFeatureCount,
  };
}

/** The 2-D map camera (centre in world metres + scale) as exposed by `useMapView`. */
export interface Camera2d {
  center: { x: number; y: number };
  scale: number;
}

/** Idle window before visualization prefs are written to localStorage. */
const PREFS_SAVE_DEBOUNCE_MS = 400;

const PLAN_TYPES = new Set<SpatialObject["type"]>(["building", "road", "path", "green", "water", "parking", "tree"]);

const EMPTY: SpatialObject[] = [];
const EMPTY_OPTIONS: ScenarioOption[] = [];
const EMPTY_ANNOTATIONS: Annotation[] = [];
const EMPTY_METRICS: PresentationMetricId[] = [];

interface TaggedPrefs {
  for: string | null;
  viewMode: ViewMode;
  basemap: BasemapId;
  layers: LayerVisibility;
  settings: VisualizationSettings;
  scenario: string | null;
}
