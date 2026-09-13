import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_LAYERS, EMPTY_FILTERS, PREFS_SAVE_DEBOUNCE_MS } from "../data/bim.data";
import { loadPrefs, rememberLastBimProject, savePrefs } from "../services/bim.service";
import type {
  BimFilters,
  BimLayerKey,
  BimLayerVisibility,
  BimMode,
  BimModel,
  BimPrefs,
  BimSceneMode,
} from "../types/bim.types";

const DEFAULTS: BimPrefs = {
  sceneMode: "combined",
  layers: DEFAULT_LAYERS,
  filters: EMPTY_FILTERS,
  activeModelId: null,
  activeVersionId: null,
  mode: "overview",
};

export interface BimPrefsApi {
  prefs: BimPrefs;
  loaded: boolean;
  setMode: (mode: BimMode) => void;
  setSceneMode: (mode: BimSceneMode) => void;
  toggleLayer: (key: BimLayerKey, value?: boolean) => void;
  setLayers: (layers: BimLayerVisibility) => void;
  resetLayers: () => void;
  setFilters: (filters: BimFilters) => void;
  patchFilters: (patch: Partial<BimFilters>) => void;
  resetFilters: () => void;
  setActiveModel: (model: BimModel | null) => void;
}

/**
 * Per-project BIM preferences (mode, view mode, scene mode, layers, filters and
 * the active model). Persisted with a trailing debounce — the same pattern the
 * visualization module uses — and flushed on project switch, unmount and
 * `pagehide` so a change made just before navigating away is never dropped.
 */
export function useBimPrefs(projectId: string | null): BimPrefsApi {
  const [prefs, setPrefs] = useState<BimPrefs>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  /** Project the current `prefs` belong to — stops defaults overwriting storage. */
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setLoaded(false);
      loadedFor.current = null;
      return;
    }
    setPrefs(loadPrefs(projectId));
    loadedFor.current = projectId;
    setLoaded(true);
    rememberLastBimProject(projectId);
  }, [projectId]);

  const pending = useRef<{ id: string; prefs: BimPrefs } | null>(null);
  const flush = useCallback(() => {
    const queued = pending.current;
    if (!queued) return;
    pending.current = null;
    savePrefs(queued.id, queued.prefs);
  }, []);

  // Flush the outgoing project's write before the incoming one is queued.
  useEffect(flush, [projectId, flush]);

  useEffect(() => {
    if (!projectId || loadedFor.current !== projectId) return;
    pending.current = { id: projectId, prefs };
    const timer = window.setTimeout(flush, PREFS_SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [projectId, prefs, flush]);

  useEffect(flush, [flush]);
  useEffect(() => {
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [flush]);

  const patch = useCallback((fn: (p: BimPrefs) => BimPrefs) => setPrefs(fn), []);

  const setMode = useCallback((mode: BimMode) => patch((p) => ({ ...p, mode })), [patch]);
  const setSceneMode = useCallback((sceneMode: BimSceneMode) => patch((p) => ({ ...p, sceneMode })), [patch]);
  const toggleLayer = useCallback(
    (key: BimLayerKey, value?: boolean) => patch((p) => ({ ...p, layers: { ...p.layers, [key]: value ?? !p.layers[key] } })),
    [patch]
  );
  const setLayers = useCallback((layers: BimLayerVisibility) => patch((p) => ({ ...p, layers })), [patch]);
  const resetLayers = useCallback(() => patch((p) => ({ ...p, layers: { ...DEFAULT_LAYERS } })), [patch]);
  const setFilters = useCallback((filters: BimFilters) => patch((p) => ({ ...p, filters })), [patch]);
  const patchFilters = useCallback((next: Partial<BimFilters>) => patch((p) => ({ ...p, filters: { ...p.filters, ...next } })), [patch]);
  const resetFilters = useCallback(() => patch((p) => ({ ...p, filters: { ...EMPTY_FILTERS } })), [patch]);
  const setActiveModel = useCallback(
    (model: BimModel | null) => patch((p) => ({ ...p, activeModelId: model?.id ?? null, activeVersionId: model?.activeVersionId ?? null })),
    [patch]
  );

  return { prefs, loaded, setMode, setSceneMode, toggleLayer, setLayers, resetLayers, setFilters, patchFilters, resetFilters, setActiveModel };
}
