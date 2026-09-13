import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { RefObject } from "react";
import {
  useVisualizationState,
  type VisualizationState,
} from "../../visualization/hooks/useVisualizationState";
import { useMapView, type MapViewApi } from "../../visualization/hooks/useMapView";
import { getBimProjects, getLastBimProject, type BimProjectSummary } from "../services/bim.service";
import type { CityViewHandle } from "../../visualization/components/3d/CityView";
import { primaryElementByPlanningId, selectSceneObjects, visiblePlanningIds } from "../lib/bimModel";
import { useBimPrefs, type BimPrefsApi } from "./useBimPrefs";
import { useBimModels, type BimModelsApi } from "./useBimModels";
import { useBimFilters, type BimFiltersApi } from "./useBimFilters";
import { useBimIssues, type BimIssuesApi } from "./useBimIssues";
import { useBimCoordination, type BimCoordinationApi } from "./useBimCoordination";
import type { BimElement } from "../types/bim.types";

export type BimProjectsLoad =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; projects: BimProjectSummary[] };

export interface BimSelectionApi {
  selectedElementId: string | null;
  selectedElement: BimElement | null;
  /** Select in tree / inspector / issue list — the viewport follows. */
  selectElement: (id: string | null, opts?: { focus?: boolean }) => void;
  clearSelection: () => void;
}

export interface BimWorkspaceApi {
  projectId: string | null;
  projectName: string;
  setProjectId: (id: string) => void;
  projectsLoad: BimProjectsLoad;
  retryProjects: () => void;

  prefs: BimPrefsApi;
  models: BimModelsApi;
  filters: BimFiltersApi;
  issues: BimIssuesApi;
  coordination: BimCoordinationApi;
  selection: BimSelectionApi;

  /** The shared visualization state (Step 12/15) — the BIM module never copies it. */
  viz: VisualizationState;
  /** Same state with `visibleObjects` narrowed to what the BIM scene shows. */
  sceneState: VisualizationState;
  map: MapViewApi;
  cityRef: RefObject<CityViewHandle>;
  /** Number of spatial objects the viewport currently draws. */
  sceneObjectCount: number;
}

/**
 * The BIM workspace orchestrator.
 *
 * It owns no geometry and no engine: the dataset, camera, layers and selection
 * come from `useVisualizationState` (Step 12/15), the models and elements from
 * `useBimModels`, and the coordination evidence from the planning / analysis /
 * optimization / reports services. Selection is two-way — the tree, inspector,
 * issue list and viewport all read and write the same selected element.
 *
 * URL contract: `?projectId=<id>` and optional `&elementId=<id>`, written with
 * `replace` so browsing models does not fill the history stack.
 */
export function useBimWorkspace(): BimWorkspaceApi {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramProjectId = searchParams.get("projectId");
  const paramElementId = searchParams.get("elementId");

  const [projectsLoad, setProjectsLoad] = useState<BimProjectsLoad>({ status: "loading" });
  const [projectsAttempt, setProjectsAttempt] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // --- projects -------------------------------------------------------------
  useEffect(() => {
    let active = true;
    setProjectsLoad({ status: "loading" });
    getBimProjects()
      .then((projects) => {
        if (active) setProjectsLoad({ status: "ready", projects });
      })
      .catch((err: unknown) => {
        if (active) {
          setProjectsLoad({ status: "error", message: err instanceof Error ? err.message : "The project list did not respond." });
        }
      });
    return () => {
      active = false;
    };
  }, [projectsAttempt]);

  const projects = projectsLoad.status === "ready" ? projectsLoad.projects : [];

  // Resolve the project once the list arrives: URL → last used → first.
  useEffect(() => {
    if (projects.length === 0) return;
    if (paramProjectId && projects.some((p) => p.id === paramProjectId)) return;
    const last = getLastBimProject();
    const next = (last && projects.some((p) => p.id === last) ? last : projects[0].id) ?? null;
    if (!next) return;
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.set("projectId", next);
        params.delete("elementId");
        return params;
      },
      { replace: true }
    );
  }, [projects, paramProjectId, setSearchParams]);

  const projectId = paramProjectId && projects.some((p) => p.id === paramProjectId) ? paramProjectId : null;
  const projectName = projects.find((p) => p.id === projectId)?.name ?? "";

  const setProjectId = useCallback(
    (id: string) => {
      setSelectedElementId(null);
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.set("projectId", id);
          params.delete("elementId");
          return params;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const retryProjects = useCallback(() => setProjectsAttempt((a) => a + 1), []);

  // --- shared visualization state (dataset, camera, layers, selection) -------
  const viz = useVisualizationState(projectId);
  const dataset = viz.data;
  const map = useMapView(dataset?.world ?? null, dataset?.siteBounds ?? null, projectId);
  const cityRef = useRef<CityViewHandle>(null);

  // --- BIM state -------------------------------------------------------------
  const prefs = useBimPrefs(projectId);
  const models = useBimModels(projectId, dataset, prefs.prefs.activeModelId, prefs.setActiveModel);
  const filters = useBimFilters(models.index, prefs.prefs.filters, prefs.prefs.layers, prefs.patchFilters, prefs.resetFilters);
  const issues = useBimIssues(projectId, models.index, models.activeModel);
  const coordination = useBimCoordination(
    projectId,
    prefs.prefs.mode === "overview" || prefs.prefs.mode === "coordination",
    dataset,
    models.index,
    models.quantities,
    models.models
  );

  // A project switch clears the selection.
  useEffect(() => setSelectedElementId(null), [projectId]);

  const { index } = models;
  // Stable callbacks from the shared state — using them keeps the effects below
  // from re-running on every render of the visualization hook.
  const vizSelect = viz.select;
  const vizFocus = viz.focusObject;
  const elementByPlanningId = useMemo(() => (index ? primaryElementByPlanningId(index) : new Map<string, BimElement>()), [index]);
  const modelObjectIds = useMemo(() => (index ? visiblePlanningIds(index, prefs.prefs.layers) : new Set<string>()), [index, prefs.prefs.layers]);

  // --- two-way selection sync -------------------------------------------------
  const selectedElement = useMemo(
    () => (selectedElementId && index ? (index.byId.get(selectedElementId) ?? null) : null),
    [selectedElementId, index]
  );

  const selectElement = useCallback(
    (id: string | null, opts?: { focus?: boolean }) => {
      setSelectedElementId(id);
      const element = id && index ? index.byId.get(id) : null;
      const objectId = element?.planningRef?.objectId ?? null;
      // The viewport highlights the linked planning object (both renderers read
      // the same selection), and optionally moves the camera to it.
      vizSelect(objectId);
      if (objectId && opts?.focus) vizFocus(objectId);
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (id) params.set("elementId", id);
          else params.delete("elementId");
          return params;
        },
        { replace: true }
      );
    },
    [index, vizSelect, vizFocus, setSearchParams]
  );

  const clearSelection = useCallback(() => selectElement(null), [selectElement]);

  /** Stable identity: consumers may put this in an effect's dependency list. */
  const selection = useMemo<BimSelectionApi>(
    () => ({ selectedElementId, selectedElement, selectElement, clearSelection }),
    [selectedElementId, selectedElement, selectElement, clearSelection]
  );

  // Viewport → tree/inspector: a click in the scene selects its model element.
  // A selection that already points at the same planning object (a wall the user
  // picked in the tree) is kept, so the finer element is not replaced by its
  // parent building.
  const vizSelection = viz.selection;
  useEffect(() => {
    if (!vizSelection || !index) return;
    const current = selectedElementId ? index.byId.get(selectedElementId) : null;
    if (current?.planningRef?.objectId === vizSelection) return;
    const element = elementByPlanningId.get(vizSelection);
    if (element) setSelectedElementId(element.id);
  }, [vizSelection, elementByPlanningId, selectedElementId, index]);

  // Deep link (?elementId=) → selection, once the model is derived.
  useEffect(() => {
    if (!paramElementId || !index) return;
    if (!index.byId.has(paramElementId)) return;
    if (paramElementId === selectedElementId) return;
    setSelectedElementId(paramElementId);
    const objectId = index.byId.get(paramElementId)?.planningRef?.objectId ?? null;
    if (objectId) vizSelect(objectId);
  }, [paramElementId, index, selectedElementId, vizSelect]);

  // --- scene -------------------------------------------------------------------
  const sceneObjects = useMemo(
    () => (dataset ? selectSceneObjects(dataset, viz.visibleObjects, modelObjectIds, prefs.prefs.sceneMode) : []),
    [dataset, viz.visibleObjects, modelObjectIds, prefs.prefs.sceneMode]
  );

  // Only `visibleObjects` is narrowed: `objects` stays the full dataset so the
  // map can still resolve the boundary and focus requests.
  const sceneState = useMemo<VisualizationState>(
    () => (sceneObjects === viz.visibleObjects ? viz : { ...viz, visibleObjects: sceneObjects }),
    [viz, sceneObjects]
  );

  return {
    projectId,
    projectName,
    setProjectId,
    projectsLoad,
    retryProjects,
    prefs,
    models,
    filters,
    issues,
    coordination,
    selection,
    viz,
    sceneState,
    map,
    cityRef,
    sceneObjectCount: sceneObjects.length,
  };
}
