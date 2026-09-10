import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Bounds, Point } from "../types/planning.types";

/**
 * Viewport maths for the demo canvas: a 2-D camera (scale + translation)
 * mapping world metres to screen pixels. Owns zoom in/out, fit and reset so
 * the same API can drive a real map engine's camera later.
 */

export interface ViewTransform {
  /** Screen pixels per world metre. */
  scale: number;
  /** Screen offset of the world origin. */
  tx: number;
  ty: number;
}

const MIN_SCALE = 0.08;
const MAX_SCALE = 6;
const ZOOM_STEP = 1.25;

export function useCanvasView(world: Bounds | null, site: Bounds | null) {
  // The canvas container mounts *after* the document loads, so a plain ref +
  // mount-time effect would miss it. A callback ref stores the element in
  // state, and the measuring effect re-runs whenever the element changes.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
    setContainer(el);
  }, []);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<ViewTransform>({ scale: 1, tx: 0, ty: 0 });
  const fittedFor = useRef<string | null>(null);

  // Track the container's size (ResizeObserver where available).
  useEffect(() => {
    const el = container;
    if (!el) {
      setSize({ width: 0, height: 0 });
      return;
    }
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize((s) => (s.width === r.width && s.height === r.height ? s : { width: r.width, height: r.height }));
    };
    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [container]);

  const fitTo = useCallback(
    (b: Bounds | null, padding = 40) => {
      if (!b || size.width === 0 || size.height === 0) return;
      const scale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, Math.min((size.width - padding * 2) / b.width, (size.height - padding * 2) / b.height))
      );
      setView({
        scale,
        tx: size.width / 2 - (b.x + b.width / 2) * scale,
        ty: size.height / 2 - (b.y + b.height / 2) * scale,
      });
    },
    [size.width, size.height]
  );

  const fitSite = useCallback(() => fitTo(site, 48), [fitTo, site]);
  const resetView = useCallback(() => fitTo(world, 16), [fitTo, world]);

  // Fit the site the first time a document + container size are both known.
  const siteKey = site ? `${site.x},${site.y},${site.width},${site.height}` : null;
  useEffect(() => {
    if (!siteKey || size.width === 0) return;
    if (fittedFor.current === siteKey) return;
    fittedFor.current = siteKey;
    fitTo(site, 48);
  }, [siteKey, site, size.width, fitTo]);
  useEffect(() => {
    // A new document (or a remount) should fit again.
    if (!container) fittedFor.current = null;
  }, [container]);

  const zoomAt = useCallback((factor: number, at?: Point) => {
    setView((v) => {
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
      const k = scale / v.scale;
      const cx = at?.x ?? size.width / 2;
      const cy = at?.y ?? size.height / 2;
      return { scale, tx: cx - (cx - v.tx) * k, ty: cy - (cy - v.ty) * k };
    });
  }, [size.width, size.height]);

  const zoomIn = useCallback(() => zoomAt(ZOOM_STEP), [zoomAt]);
  const zoomOut = useCallback(() => zoomAt(1 / ZOOM_STEP), [zoomAt]);
  const panBy = useCallback((dx: number, dy: number) => setView((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy })), []);
  const zoomTo100 = useCallback(() => {
    // "100 %" = 1 screen pixel per metre, keeping the current centre.
    setView((v) => {
      const k = 1 / v.scale;
      const cx = size.width / 2;
      const cy = size.height / 2;
      return { scale: 1, tx: cx - (cx - v.tx) * k, ty: cy - (cy - v.ty) * k };
    });
  }, [size.width, size.height]);

  const toWorld = useCallback(
    (screen: Point): Point => ({ x: (screen.x - view.tx) / view.scale, y: (screen.y - view.ty) / view.scale }),
    [view]
  );

  /** Nominal map scale like "1:2,500" assuming 96 dpi (demo). */
  const scaleLabel = useMemo(() => {
    const metresPerPixel = 1 / view.scale;
    const denominator = Math.round((metresPerPixel * 96) / 0.0254);
    const nice = denominator >= 1000 ? Math.round(denominator / 100) * 100 : Math.round(denominator / 10) * 10;
    return `1:${Math.max(nice, 1).toLocaleString("en-US")}`;
  }, [view.scale]);

  const zoomPercent = Math.round(view.scale * 100);

  return {
    /** Object ref for event maths (read-only). */
    containerRef,
    /** Attach this to the canvas container element. */
    setContainerRef,
    size,
    view,
    zoomIn,
    zoomOut,
    zoomAt,
    zoomTo100,
    panBy,
    fitSite,
    resetView,
    toWorld,
    scaleLabel,
    zoomPercent,
    canZoomIn: view.scale < MAX_SCALE - 1e-6,
    canZoomOut: view.scale > MIN_SCALE + 1e-6,
  };
}
