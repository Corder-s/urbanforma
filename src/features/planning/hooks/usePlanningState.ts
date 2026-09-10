import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cloneObject, createLineObject, createObjectAt } from "../lib/factory";
import { snap, translateObject } from "../lib/geometry";
import {
  getPlanningState,
  getSiteInfo,
  ProjectNotFoundError,
  rememberLastProject,
  savePlanningState,
} from "../services/planning.service";
import { TOOL_BY_ID } from "../data/tools.data";
import type {
  ContextLayerKey,
  LayerVisibility,
  PlanningDocument,
  PlanningObject,
  Point,
  SelectionId,
  StudioMode,
  StudioSettings,
  ToolId,
} from "../types/planning.types";
import { usePlanningHistory } from "./usePlanningHistory";

export type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "not-found"; projectId: string }
  | { status: "error"; message: string }
  | { status: "ready" };

export type SaveState = "clean" | "dirty" | "saving" | "saved" | "error";

/** The undoable part of the studio state. */
interface Snapshot {
  objects: PlanningObject[];
  layers: LayerVisibility;
}

const EMPTY: Snapshot = {
  objects: [],
  layers: { roads: true, buildings: true, green: true, water: true, terrain: true, transit: false, utilities: false },
};

const GRID_STEP = 5; // metres

/**
 * All Planning Studio state for one project: document loading, undoable
 * objects/layers, selection, active tool, in-progress line drafts, drag
 * moves, save status and studio settings. Rendering components stay dumb.
 */
export function usePlanningState(projectId: string | null) {
  const [load, setLoad] = useState<LoadState>({ status: projectId ? "loading" : "idle" });
  const [doc, setDoc] = useState<PlanningDocument | null>(null);
  const history = usePlanningHistory<Snapshot>(EMPTY);
  const { present, commit, commitFrom, replace, undo, redo, reset, canUndo, canRedo } = history;

  const [selection, setSelection] = useState<SelectionId>(null);
  const [tool, setToolState] = useState<ToolId>("select");
  const [mode, setMode] = useState<StudioMode>("plan");
  const [draft, setDraft] = useState<Point[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("clean");
  const [savedAtIso, setSavedAtIso] = useState<string | null>(null);
  const [settings, setSettings] = useState<StudioSettings>({ showGrid: true, snapToGrid: true, showLabels: true });
  const [notice, setNotice] = useState<string | null>(null);

  const dragBase = useRef<Snapshot | null>(null);
  const noticeTimer = useRef<number | null>(null);
  const loadedRef = useRef<string | null>(null);
  /** Snapshot that matches what is persisted (set on load and after each save). */
  const baseline = useRef<Snapshot>(EMPTY);

  const flash = useCallback((msg: string) => {
    setNotice(msg);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 2600);
  }, []);
  useEffect(() => () => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
  }, []);

  // --- load ----------------------------------------------------------------
  useEffect(() => {
    if (!projectId) {
      setLoad({ status: "idle" });
      setDoc(null);
      reset(EMPTY);
      return;
    }
    let cancelled = false;
    setLoad({ status: "loading" });
    setSelection(null);
    setDraft([]);
    getPlanningState(projectId)
      .then((d) => {
        if (cancelled) return;
        const snapshot = { objects: d.objects, layers: d.layers };
        baseline.current = snapshot;
        setDoc(d);
        reset(snapshot);
        setSavedAtIso(d.savedAtIso);
        setSaveState("clean");
        loadedRef.current = projectId;
        rememberLastProject(projectId);
        setLoad({ status: "ready" });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ProjectNotFoundError) setLoad({ status: "not-found", projectId });
        else setLoad({ status: "error", message: e instanceof Error ? e.message : "Unable to load the planning document." });
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, reset]);

  // The document is dirty whenever the present snapshot differs from the
  // persisted baseline (so undoing back to the saved state reads as clean).
  useEffect(() => {
    if (load.status !== "ready" || loadedRef.current !== projectId) return;
    const dirty = present !== baseline.current;
    setSaveState((s) => {
      if (s === "saving") return s;
      if (dirty) return "dirty";
      return s === "dirty" ? "clean" : s;
    });
  }, [present, load.status, projectId]);

  const presentRef = useRef(present);
  presentRef.current = present;

  // --- derived --------------------------------------------------------------
  const objects = present.objects;
  const layers = present.layers;
  const selectedObject = useMemo(
    () => (selection && selection !== "site" ? objects.find((o) => o.id === selection) ?? null : null),
    [objects, selection]
  );
  const siteInfo = useMemo(() => (projectId ? getSiteInfo(projectId) : null), [projectId]);
  const toolDef = TOOL_BY_ID[tool];

  // --- tools -----------------------------------------------------------------
  const setTool = useCallback((next: ToolId) => {
    setToolState(next);
    setDraft([]);
    if (next === "boundary") setSelection("site");
  }, []);

  const snapPoint = useCallback(
    (p: Point): Point => (settings.snapToGrid ? { x: snap(p.x, GRID_STEP), y: snap(p.y, GRID_STEP) } : p),
    [settings.snapToGrid]
  );

  /** Click on empty canvas space (world coordinates). */
  const canvasClick = useCallback(
    (raw: Point) => {
      const p = snapPoint(raw);
      if (toolDef.kind === "select" || toolDef.kind === "site") {
        setSelection(toolDef.kind === "site" ? "site" : null);
        return;
      }
      if (toolDef.kind === "place") {
        const created = createObjectAt(tool, p, objects);
        if (!created) return;
        commit({ ...present, objects: [...objects, created] });
        setSelection(created.id);
        return;
      }
      if (toolDef.kind === "line") {
        setDraft((d) => {
          const next = [...d, p];
          if (tool === "measure" && next.length === 2) {
            const created = createLineObject(tool, next, objects);
            if (created) {
              commit({ ...present, objects: [...objects, created] });
              setSelection(created.id);
            }
            return [];
          }
          return next;
        });
      }
    },
    [toolDef.kind, tool, objects, present, commit, snapPoint]
  );

  const finishDraft = useCallback(() => {
    // Double-click adds a duplicate final vertex — drop consecutive duplicates.
    const points = draft.filter((p, i) => i === 0 || Math.hypot(p.x - draft[i - 1].x, p.y - draft[i - 1].y) > 0.5);
    if (points.length < 2) {
      setDraft([]);
      return;
    }
    const created = createLineObject(tool, points, objects);
    if (created) {
      commit({ ...present, objects: [...objects, created] });
      setSelection(created.id);
    }
    setDraft([]);
  }, [draft, tool, objects, present, commit]);

  const cancelDraft = useCallback(() => setDraft([]), []);

  // --- selection & edits ------------------------------------------------------
  const select = useCallback((id: SelectionId) => {
    setSelection(id);
  }, []);

  const updateObject = useCallback(
    (id: string, patch: (o: PlanningObject) => PlanningObject) => {
      const next = objects.map((o) => (o.id === id ? patch(o) : o));
      commit({ ...present, objects: next });
    },
    [objects, present, commit]
  );

  const deleteObject = useCallback(
    (id: string) => {
      const target = objects.find((o) => o.id === id);
      if (!target) return;
      commit({ ...present, objects: objects.filter((o) => o.id !== id) });
      setSelection(null);
      flash(`${target.name} deleted`);
    },
    [objects, present, commit, flash]
  );

  const duplicateObject = useCallback(
    (id: string) => {
      const target = objects.find((o) => o.id === id);
      if (!target) return;
      const copy = cloneObject(target, objects);
      commit({ ...present, objects: [...objects, copy] });
      setSelection(copy.id);
      flash(`${target.name} duplicated`);
    },
    [objects, present, commit, flash]
  );

  /** Live move during a drag (no history entry). */
  const moveObject = useCallback(
    (id: string, dx: number, dy: number) => {
      if (!dragBase.current) dragBase.current = present;
      const base = dragBase.current;
      const next = base.objects.map((o) => (o.id === id ? translateObject(o, dx, dy) : o));
      replace({ ...base, objects: next });
    },
    [present, replace]
  );

  /** Drag finished — record a single undo step for the whole move. */
  const endMove = useCallback(
    (id: string, dx: number, dy: number) => {
      const base = dragBase.current;
      dragBase.current = null;
      if (!base) return;
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) {
        replace(base);
        return;
      }
      const d = settings.snapToGrid ? { x: snap(dx, GRID_STEP), y: snap(dy, GRID_STEP) } : { x: dx, y: dy };
      const next = base.objects.map((o) => (o.id === id ? translateObject(o, d.x, d.y) : o));
      commitFrom(base, { ...base, objects: next });
    },
    [commitFrom, replace, settings.snapToGrid]
  );

  // --- layers -----------------------------------------------------------------
  const toggleLayer = useCallback(
    (key: ContextLayerKey, value?: boolean) => {
      const nextLayers = { ...layers, [key]: value ?? !layers[key] };
      commit({ ...present, layers: nextLayers });
    },
    [layers, present, commit]
  );

  // --- save -------------------------------------------------------------------
  const save = useCallback(async () => {
    if (!projectId || saveState === "saving") return;
    setSaveState("saving");
    const snapshot = present;
    try {
      const iso = await savePlanningState(projectId, { objects: snapshot.objects, layers: snapshot.layers });
      baseline.current = snapshot;
      setSavedAtIso(iso);
      setSaveState(presentRef.current === snapshot ? "saved" : "dirty");
      flash("Saved just now");
    } catch (e) {
      setSaveState("error");
      flash(e instanceof Error ? e.message : "Save failed");
    }
  }, [projectId, present, saveState, flash]);

  // --- keyboard -----------------------------------------------------------------
  const undoSafe = useCallback(() => {
    if (canUndo) {
      undo();
      setSelection(null);
    }
  }, [canUndo, undo]);
  const redoSafe = useCallback(() => {
    if (canRedo) {
      redo();
      setSelection(null);
    }
  }, [canRedo, redo]);

  const retry = useCallback(() => {
    if (!projectId) return;
    loadedRef.current = null;
    setLoad({ status: "loading" });
    getPlanningState(projectId)
      .then((d) => {
        const snapshot = { objects: d.objects, layers: d.layers };
        baseline.current = snapshot;
        setDoc(d);
        reset(snapshot);
        setSavedAtIso(d.savedAtIso);
        setSaveState("clean");
        loadedRef.current = projectId;
        setLoad({ status: "ready" });
      })
      .catch((e: unknown) => {
        if (e instanceof ProjectNotFoundError) setLoad({ status: "not-found", projectId });
        else setLoad({ status: "error", message: e instanceof Error ? e.message : "Unable to load the planning document." });
      });
  }, [projectId, reset]);

  return {
    load,
    retry,
    doc,
    objects,
    layers,
    selection,
    selectedObject,
    siteInfo,
    tool,
    toolDef,
    setTool,
    mode,
    setMode,
    draft,
    canvasClick,
    finishDraft,
    cancelDraft,
    select,
    updateObject,
    deleteObject,
    duplicateObject,
    moveObject,
    endMove,
    toggleLayer,
    save,
    saveState,
    savedAtIso,
    undo: undoSafe,
    redo: redoSafe,
    canUndo,
    canRedo,
    settings,
    setSettings,
    notice,
    flash,
  };
}

export type PlanningState = ReturnType<typeof usePlanningState>;
