import { useCallback, useEffect, useMemo, useState } from "react";
import { MAX_SAVED_VIEWS } from "../data/presentation.data";
import { seedSavedViews } from "../data/presentation.seeds";
import { deleteView, getSavedViews, replaceSavedViews, saveView, updateView } from "../services/visualization.service";
import type { PresentationView, SpatialDataset } from "../types/visualization.types";

export interface SavedViewsApi {
  views: PresentationView[];
  loading: boolean;
  /** Persist a new view (built by the caller from the current state). */
  save: (view: PresentationView) => Promise<PresentationView | null>;
  rename: (viewId: string, name: string) => Promise<void>;
  duplicate: (viewId: string) => Promise<PresentationView | null>;
  remove: (viewId: string) => Promise<void>;
  /** Overwrite a stored view with new state (keeps id / name / createdAt). */
  overwrite: (viewId: string, view: PresentationView) => Promise<void>;
  full: boolean;
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Saved views of a project (localStorage today; the service maps to
 * /api/projects/:id/visualizations later). A project with no stored list is
 * seeded with a few demo views so the panel is never empty.
 */
export function useSavedViews(projectId: string | null, data: SpatialDataset | null): SavedViewsApi {
  const [state, setState] = useState<{ for: string | null; views: PresentationView[]; loading: boolean }>({ for: null, views: [], loading: false });

  useEffect(() => {
    if (!projectId || !data || data.projectId !== projectId) return;
    let active = true;
    setState({ for: projectId, views: [], loading: true });
    getSavedViews(projectId).then(async (stored) => {
      if (!active) return;
      if (stored) {
        setState({ for: projectId, views: stored, loading: false });
        return;
      }
      const seeded = seedSavedViews(data);
      await replaceSavedViews(projectId, seeded);
      if (active) setState({ for: projectId, views: seeded, loading: false });
    });
    return () => {
      active = false;
    };
  }, [projectId, data]);

  const views = state.for === projectId ? state.views : EMPTY;
  const loading = state.for === projectId && state.loading;

  const save = useCallback(
    async (view: PresentationView) => {
      if (!projectId || views.length >= MAX_SAVED_VIEWS) return null;
      const saved = await saveView(projectId, view);
      setState((s) => ({ ...s, views: [saved, ...s.views.filter((v) => v.id !== saved.id)] }));
      return saved;
    },
    [projectId, views.length]
  );

  const rename = useCallback(
    async (viewId: string, name: string) => {
      if (!projectId) return;
      const trimmed = name.trim().slice(0, 60);
      if (!trimmed) return;
      await updateView(projectId, viewId, { name: trimmed });
      setState((s) => ({ ...s, views: s.views.map((v) => (v.id === viewId ? { ...v, name: trimmed } : v)) }));
    },
    [projectId]
  );

  const duplicate = useCallback(
    async (viewId: string) => {
      if (!projectId || views.length >= MAX_SAVED_VIEWS) return null;
      const src = views.find((v) => v.id === viewId);
      if (!src) return null;
      const copy: PresentationView = { ...src, id: newId("view"), name: `${src.name} (copy)`.slice(0, 60), createdAt: new Date().toISOString(), annotations: src.annotations.map((a) => ({ ...a })) };
      await saveView(projectId, copy);
      setState((s) => {
        const i = s.views.findIndex((v) => v.id === viewId);
        const next = [...s.views];
        next.splice(i + 1, 0, copy);
        return { ...s, views: next };
      });
      // keep storage order in sync with the displayed order
      await replaceSavedViews(projectId, insertAfter(views, viewId, copy));
      return copy;
    },
    [projectId, views]
  );

  const remove = useCallback(
    async (viewId: string) => {
      if (!projectId) return;
      await deleteView(projectId, viewId);
      setState((s) => ({ ...s, views: s.views.filter((v) => v.id !== viewId) }));
    },
    [projectId]
  );

  const overwrite = useCallback(
    async (viewId: string, view: PresentationView) => {
      if (!projectId) return;
      const prev = views.find((v) => v.id === viewId);
      if (!prev) return;
      const next: PresentationView = { ...view, id: prev.id, name: prev.name, createdAt: prev.createdAt };
      await updateView(projectId, viewId, next);
      setState((s) => ({ ...s, views: s.views.map((v) => (v.id === viewId ? next : v)) }));
    },
    [projectId, views]
  );

  return useMemo(() => ({ views, loading, save, rename, duplicate, remove, overwrite, full: views.length >= MAX_SAVED_VIEWS }), [views, loading, save, rename, duplicate, remove, overwrite]);
}

function insertAfter(list: PresentationView[], id: string, item: PresentationView): PresentationView[] {
  const i = list.findIndex((v) => v.id === id);
  const next = [...list];
  next.splice(i + 1, 0, item);
  return next;
}

const EMPTY: PresentationView[] = [];
