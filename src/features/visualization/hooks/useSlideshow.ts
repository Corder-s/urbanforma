import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VisualizationState } from "./useVisualizationState";
import type { PresentationSlide, WorkspaceMode } from "../types/visualization.types";

export interface SlideshowApi {
  active: boolean;
  index: number;
  total: number;
  slide: PresentationSlide | null;
  start: (fromSlideId?: string) => void;
  exit: () => void;
  go: (dir: -1 | 1) => void;
  first: () => void;
  last: () => void;
}

/**
 * Slide show over the storyboard. Starting it switches the workspace to
 * Present mode and applies the first slide's saved view to the shared state;
 * ← → Space PageUp/PageDown Home End navigate, Esc exits. The renderer is the
 * same one used in Explore / Present — only the chrome changes.
 */
export function useSlideshow(state: VisualizationState): SlideshowApi {
  const { presentation, applyView, setActiveSlide, mode, setMode } = state;
  const { slides, viewOf } = presentation;
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const previousMode = useRef<WorkspaceMode>("explore");
  const applied = useRef<string | null>(null);
  const total = slides.length;
  const slide = active ? slides[Math.min(index, Math.max(0, total - 1))] ?? null : null;

  const start = useCallback(
    (fromSlideId?: string) => {
      if (slides.length === 0) return;
      previousMode.current = mode;
      applied.current = null;
      setIndex(Math.max(0, slides.findIndex((s) => s.id === fromSlideId)));
      setMode("present");
      setActive(true);
    },
    [slides, mode, setMode]
  );

  const exit = useCallback(() => {
    setActive(false);
    setMode(previousMode.current);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
  }, [setMode]);

  const go = useCallback((dir: -1 | 1) => setIndex((i) => Math.max(0, Math.min(total - 1, i + dir))), [total]);
  const first = useCallback(() => setIndex(0), []);
  const last = useCallback(() => setIndex(Math.max(0, total - 1)), [total]);

  // apply the slide's saved view whenever the shown slide changes
  useEffect(() => {
    if (!active || !slide || applied.current === slide.id) return;
    applied.current = slide.id;
    const v = viewOf(slide);
    if (v) applyView({ ...v, annotations: slide.annotations }, { keepMode: true });
    setActiveSlide(slide.id); // the shown slide's annotations follow the active slide
  }, [active, slide, viewOf, applyView, setActiveSlide]);

  // storyboard emptied while showing → leave the show
  useEffect(() => {
    if (active && total === 0) exit();
  }, [active, total, exit]);

  // leaving the project ends the show
  useEffect(() => {
    if (!state.projectId) setActive(false);
  }, [state.projectId]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // a menu or dialog inside the show owns Escape
      if (e.key === "Escape" && document.activeElement?.closest('[role="menu"], [role="alertdialog"], [role="dialog"][data-inner]')) return;
      switch (e.key) {
        case "ArrowRight":
        case " ":
        case "PageDown":
          go(1);
          break;
        case "ArrowLeft":
        case "PageUp":
          go(-1);
          break;
        case "Home":
          first();
          break;
        case "End":
          last();
          break;
        case "Escape":
          exit();
          break;
        default:
          return;
      }
      e.preventDefault();
      e.stopPropagation();
    };
    // capture phase so the renderers' own key handlers (arrows = pan) never swallow slide navigation
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [active, go, first, last, exit]);

  return useMemo(() => ({ active, index: Math.min(index, Math.max(0, total - 1)), total, slide, start, exit, go, first, last }), [active, index, total, slide, start, exit, go, first, last]);
}
