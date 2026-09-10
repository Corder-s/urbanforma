import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MAX_ANNOTATIONS, MAX_SELECTED_METRICS, MAX_SLIDES } from "../data/presentation.data";
import { seedPresentation } from "../data/presentation.seeds";
import { getPresentation, savePresentation } from "../services/visualization.service";
import type { Annotation, Presentation, PresentationMetricId, PresentationSettings, PresentationSlide, PresentationTheme, PresentationView, SpatialDataset } from "../types/visualization.types";
import { newId } from "./useSavedViews";

export interface PresentationApi {
  presentation: Presentation | null;
  /** Slides sorted by order. */
  slides: PresentationSlide[];
  viewOf: (slide: PresentationSlide) => PresentationView | null;
  setTitle: (title: string) => void;
  setSubtitle: (subtitle: string) => void;
  setTheme: (theme: PresentationTheme) => void;
  updateSettings: (patch: Partial<PresentationSettings>) => void;
  toggleMetric: (id: PresentationMetricId) => void;
  setMetrics: (ids: PresentationMetricId[]) => void;
  // annotations — the working set; `useVisualizationState` routes these to the open slide instead
  addAnnotation: (a: Omit<Annotation, "id">) => Annotation | null;
  updateAnnotation: (id: string, patch: Partial<Omit<Annotation, "id">>) => void;
  removeAnnotation: (id: string) => void;
  // slides
  addSlide: (view: PresentationView, title: string, description: string, annotations: Annotation[]) => PresentationSlide | null;
  updateSlide: (slideId: string, patch: Partial<Pick<PresentationSlide, "title" | "description">>) => void;
  /** Re-capture the slide's view + annotations from the current state. */
  recaptureSlide: (slideId: string, view: PresentationView, annotations: Annotation[]) => void;
  /** Edit a slide's own annotation set. */
  patchSlideAnnotations: (slideId: string, fn: (list: Annotation[]) => Annotation[]) => void;
  duplicateSlide: (slideId: string) => PresentationSlide | null;
  deleteSlide: (slideId: string) => void;
  moveSlide: (slideId: string, dir: -1 | 1) => void;
  reorderSlide: (slideId: string, toIndex: number) => void;
  /** Reset the storyboard + settings back to the demo seed. */
  resetToDemo: () => void;
  saveState: "idle" | "saving" | "saved" | "error";
  full: boolean;
}

/**
 * The presentation of a project: title, theme, settings, working annotations,
 * selected metrics and the storyboard (slides + the views they captured).
 * Persisted locally per project (future GET/PUT /api/projects/:id/presentation).
 */
export function usePresentation(projectId: string | null, data: SpatialDataset | null): PresentationApi {
  const [state, setState] = useState<{ for: string | null; presentation: Presentation | null }>({ for: null, presentation: null });
  const [saveState, setSaveState] = useState<PresentationApi["saveState"]>("idle");
  const dirty = useRef(false);

  useEffect(() => {
    if (!projectId || !data || data.projectId !== projectId) return;
    let active = true;
    getPresentation(projectId).then(async (stored) => {
      if (!active) return;
      if (stored) {
        setState({ for: projectId, presentation: stored });
        return;
      }
      const seeded = seedPresentation(data);
      await savePresentation(projectId, seeded);
      if (active) setState({ for: projectId, presentation: seeded });
    });
    return () => {
      active = false;
    };
  }, [projectId, data]);

  const presentation = state.for === projectId ? state.presentation : null;

  // debounced persistence of user edits
  useEffect(() => {
    if (!presentation || !projectId || !dirty.current) return;
    setSaveState("saving");
    const t = window.setTimeout(() => {
      savePresentation(projectId, presentation).then((ok) => {
        dirty.current = false;
        setSaveState(ok ? "saved" : "error");
      });
    }, 250);
    return () => window.clearTimeout(t);
  }, [presentation, projectId]);

  const patch = useCallback((fn: (p: Presentation) => Presentation) => {
    dirty.current = true;
    setState((s) => (s.presentation ? { ...s, presentation: { ...fn(s.presentation), updatedAt: new Date().toISOString() } } : s));
  }, []);

  const slides = useMemo(() => (presentation ? [...presentation.slides].sort((a, b) => a.order - b.order) : EMPTY_SLIDES), [presentation]);
  const viewOf = useCallback((slide: PresentationSlide) => presentation?.views.find((v) => v.id === slide.viewId) ?? null, [presentation]);

  const setTitle = useCallback((title: string) => patch((p) => ({ ...p, title: title.slice(0, 80) })), [patch]);
  const setSubtitle = useCallback((subtitle: string) => patch((p) => ({ ...p, subtitle: subtitle.slice(0, 120) })), [patch]);
  const setTheme = useCallback((theme: PresentationTheme) => patch((p) => ({ ...p, theme })), [patch]);
  const updateSettings = useCallback((s: Partial<PresentationSettings>) => patch((p) => ({ ...p, settings: { ...p.settings, ...s } })), [patch]);
  const toggleMetric = useCallback(
    (id: PresentationMetricId) =>
      patch((p) => {
        const has = p.selectedMetrics.includes(id);
        if (has) return { ...p, selectedMetrics: p.selectedMetrics.filter((m) => m !== id) };
        if (p.selectedMetrics.length >= MAX_SELECTED_METRICS) return p;
        return { ...p, selectedMetrics: [...p.selectedMetrics, id] };
      }),
    [patch]
  );
  const setMetrics = useCallback((ids: PresentationMetricId[]) => patch((p) => ({ ...p, selectedMetrics: ids.slice(0, MAX_SELECTED_METRICS) })), [patch]);

  // --- annotations ---------------------------------------------------------------------------
  const addAnnotation = useCallback(
    (a: Omit<Annotation, "id">) => {
      if (!presentation || presentation.annotations.length >= MAX_ANNOTATIONS) return null;
      const ann: Annotation = { ...a, id: newId("ann") };
      patch((p) => ({ ...p, annotations: [...p.annotations, ann] }));
      return ann;
    },
    [presentation, patch]
  );
  const updateAnnotation = useCallback((id: string, a: Partial<Omit<Annotation, "id">>) => patch((p) => ({ ...p, annotations: p.annotations.map((x) => (x.id === id ? { ...x, ...a } : x)) })), [patch]);
  const removeAnnotation = useCallback((id: string) => patch((p) => ({ ...p, annotations: p.annotations.filter((x) => x.id !== id) })), [patch]);

  // --- slides -----------------------------------------------------------------------------------
  const addSlide = useCallback(
    (view: PresentationView, title: string, description: string, annotations: Annotation[]) => {
      if (!presentation || presentation.slides.length >= MAX_SLIDES) return null;
      const v: PresentationView = { ...view, id: newId("sv"), mode: "present" };
      const slide: PresentationSlide = { id: newId("slide"), title: title.trim().slice(0, 80) || `Slide ${presentation.slides.length + 1}`, description: description.slice(0, 280), viewId: v.id, scenarioId: view.scenarioId, annotations: annotations.map((a) => ({ ...a })), order: presentation.slides.length };
      patch((p) => ({ ...p, views: [...p.views, v], slides: [...p.slides, slide] }));
      return slide;
    },
    [presentation, patch]
  );
  const updateSlide = useCallback((slideId: string, s: Partial<Pick<PresentationSlide, "title" | "description">>) => patch((p) => ({ ...p, slides: p.slides.map((x) => (x.id === slideId ? { ...x, ...(s.title !== undefined ? { title: s.title.slice(0, 80) } : {}), ...(s.description !== undefined ? { description: s.description.slice(0, 280) } : {}) } : x)) })), [patch]);
  const recaptureSlide = useCallback(
    (slideId: string, view: PresentationView, annotations: Annotation[]) =>
      patch((p) => {
        const slide = p.slides.find((x) => x.id === slideId);
        if (!slide) return p;
        const v: PresentationView = { ...view, id: slide.viewId, mode: "present" };
        return { ...p, views: p.views.map((x) => (x.id === slide.viewId ? v : x)), slides: p.slides.map((x) => (x.id === slideId ? { ...x, scenarioId: view.scenarioId, annotations: annotations.map((a) => ({ ...a })) } : x)) };
      }),
    [patch]
  );
  const patchSlideAnnotations = useCallback((slideId: string, fn: (list: Annotation[]) => Annotation[]) => patch((p) => ({ ...p, slides: p.slides.map((x) => (x.id === slideId ? { ...x, annotations: fn(x.annotations).slice(0, MAX_ANNOTATIONS) } : x)) })), [patch]);
  const duplicateSlide = useCallback(
    (slideId: string) => {
      if (!presentation || presentation.slides.length >= MAX_SLIDES) return null;
      const src = presentation.slides.find((s) => s.id === slideId);
      const view = src ? presentation.views.find((v) => v.id === src.viewId) : null;
      if (!src || !view) return null;
      const v: PresentationView = { ...view, id: newId("sv") };
      const copy: PresentationSlide = { ...src, id: newId("slide"), title: `${src.title} (copy)`.slice(0, 80), viewId: v.id, annotations: src.annotations.map((a) => ({ ...a })), order: src.order + 0.5 };
      patch((p) => ({ ...p, views: [...p.views, v], slides: renumber([...p.slides, copy]) }));
      return copy;
    },
    [presentation, patch]
  );
  const deleteSlide = useCallback(
    (slideId: string) =>
      patch((p) => {
        const slide = p.slides.find((s) => s.id === slideId);
        if (!slide) return p;
        return { ...p, slides: renumber(p.slides.filter((s) => s.id !== slideId)), views: p.views.filter((v) => v.id !== slide.viewId) };
      }),
    [patch]
  );
  const reorderSlide = useCallback(
    (slideId: string, toIndex: number) =>
      patch((p) => {
        const sorted = [...p.slides].sort((a, b) => a.order - b.order);
        const from = sorted.findIndex((s) => s.id === slideId);
        if (from < 0) return p;
        const to = Math.max(0, Math.min(sorted.length - 1, toIndex));
        if (from === to) return p;
        const [item] = sorted.splice(from, 1);
        sorted.splice(to, 0, item);
        return { ...p, slides: sorted.map((s, i) => ({ ...s, order: i })) };
      }),
    [patch]
  );
  const moveSlide = useCallback(
    (slideId: string, dir: -1 | 1) => {
      const i = slides.findIndex((s) => s.id === slideId);
      if (i < 0) return;
      reorderSlide(slideId, i + dir);
    },
    [slides, reorderSlide]
  );

  const resetToDemo = useCallback(() => {
    if (!data) return;
    patch(() => seedPresentation(data));
  }, [data, patch]);

  return useMemo(
    () => ({ presentation, slides, viewOf, setTitle, setSubtitle, setTheme, updateSettings, toggleMetric, setMetrics, addAnnotation, updateAnnotation, removeAnnotation, addSlide, updateSlide, recaptureSlide, patchSlideAnnotations, duplicateSlide, deleteSlide, moveSlide, reorderSlide, resetToDemo, saveState, full: (presentation?.slides.length ?? 0) >= MAX_SLIDES }),
    [presentation, slides, viewOf, setTitle, setSubtitle, setTheme, updateSettings, toggleMetric, setMetrics, addAnnotation, updateAnnotation, removeAnnotation, addSlide, updateSlide, recaptureSlide, patchSlideAnnotations, duplicateSlide, deleteSlide, moveSlide, reorderSlide, resetToDemo, saveState]
  );
}

function renumber(slides: PresentationSlide[]): PresentationSlide[] {
  return [...slides].sort((a, b) => a.order - b.order).map((s, i) => ({ ...s, order: i }));
}

const EMPTY_SLIDES: PresentationSlide[] = [];
