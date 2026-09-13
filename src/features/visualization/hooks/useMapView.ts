import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getMapDefaults } from "../../settings/services/settings.service";
import type { Bounds, Point } from "../types/visualization.types";

/**
 * 2-D map camera: world metres → screen pixels (scale + translation).
 * Independent from the renderer so a real map engine can expose the same API.
 */
export interface MapTransform {
  scale: number;
  tx: number;
  ty: number;
}

const MIN_SCALE = 0.06;
const MAX_SCALE = 8;
const STEP = 1.3;

/**
 * @param initialZoom factor applied to the fitted scale when a project is first
 * framed. Defaults to the Settings → Map "default zoom" preference (percent), so
 * every 2-D map in the app — visualization, analysis, optimization and the BIM
 * viewport — opens at the same framing. Callers may override it.
 */
export function useMapView(
  world: Bounds | null,
  site: Bounds | null,
  resetKey: string | null = null,
  initialZoom?: number
) {
  const defaultZoom = getMapDefaults().defaultZoom / 100;
  const openingZoom = initialZoom ?? defaultZoom;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
    setContainer(el);
  }, []);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<MapTransform>({ scale: 1, tx: 0, ty: 0 });
  const fittedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!container) {
      setSize({ width: 0, height: 0 }); // view transform is kept so 2D → 3D → 2D returns to the same place
      return;
    }
    const update = () => {
      const r = container.getBoundingClientRect();
      setSize((s) => (s.width === r.width && s.height === r.height ? s : { width: r.width, height: r.height }));
    };
    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
  }, [container]);

  const fitTo = useCallback(
    (b: Bounds | null, padding = 40, zoom = 1) => {
      if (!b || size.width === 0 || size.height === 0) return;
      const fit = Math.min((size.width - padding * 2) / b.width, (size.height - padding * 2) / b.height);
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, fit * zoom));
      setView({ scale, tx: size.width / 2 - (b.x + b.width / 2) * scale, ty: size.height / 2 - (b.y + b.height / 2) * scale });
    },
    [size.width, size.height]
  );

  const fitSite = useCallback(() => fitTo(site, 48), [fitTo, site]);
  const resetView = useCallback(() => fitTo(world, 12), [fitTo, world]);

  const siteKey = site ? `${resetKey ?? ""}:${site.x},${site.y},${site.width},${site.height}` : null;
  useEffect(() => {
    if (!siteKey || size.width === 0 || fittedFor.current === siteKey) return;
    fittedFor.current = siteKey;
    // Only the *opening* framing takes the preference: an explicit "Fit site"
    // always frames the site exactly, and user zooming is untouched.
    fitTo(site, 48, openingZoom);
  }, [siteKey, site, size.width, fitTo, openingZoom]);

  const zoomAt = useCallback((factor: number, at?: Point) => {
    setView((v) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
      const k = next / v.scale;
      const cx = at?.x ?? size.width / 2;
      const cy = at?.y ?? size.height / 2;
      return { scale: next, tx: cx - (cx - v.tx) * k, ty: cy - (cy - v.ty) * k };
    });
  }, [size.width, size.height]);

  const zoomIn = useCallback(() => zoomAt(STEP), [zoomAt]);
  const zoomOut = useCallback(() => zoomAt(1 / STEP), [zoomAt]);
  const panBy = useCallback((dx: number, dy: number) => setView((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy })), []);

  /** Centre the view on a world point at (optionally) a minimum scale. */
  const centerOn = useCallback(
    (p: Point, minScale?: number) => {
      setView((v) => {
        const scale = minScale ? Math.max(v.scale, Math.min(MAX_SCALE, minScale)) : v.scale;
        return { scale, tx: size.width / 2 - p.x * scale, ty: size.height / 2 - p.y * scale };
      });
    },
    [size.width, size.height]
  );

  /** Exact camera restore: centre the view on a world point at a given scale (saved views / slides). */
  const lookAt = useCallback(
    (p: Point, scale: number) => {
      const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
      setView({ scale: s, tx: size.width / 2 - p.x * s, ty: size.height / 2 - p.y * s });
    },
    [size.width, size.height]
  );

  const toWorld = useCallback((sx: number, sy: number): Point => ({ x: (sx - view.tx) / view.scale, y: (sy - view.ty) / view.scale }), [view]);

  /** World point at the centre of the viewport (what a saved 2-D camera stores). */
  const center = useMemo<Point>(() => ({ x: (size.width / 2 - view.tx) / view.scale, y: (size.height / 2 - view.ty) / view.scale }), [size.width, size.height, view]);

  /** "1:2,500"-style scale for the status bar (assumes 96 dpi). */
  const scaleLabel = useMemo(() => {
    const metresPerPx = 1 / view.scale;
    const denom = metresPerPx * (96 / 0.0254);
    const nice = denom >= 10000 ? Math.round(denom / 1000) * 1000 : denom >= 1000 ? Math.round(denom / 100) * 100 : Math.round(denom / 10) * 10;
    return `1:${nice.toLocaleString("en-US")}`;
  }, [view.scale]);

  /** Scale bar: a "nice" metre length and its pixel width. */
  const scaleBar = useMemo(() => {
    const targetPx = 96;
    const metres = targetPx / view.scale;
    const pow = Math.pow(10, Math.floor(Math.log10(metres)));
    const candidates = [1, 2, 5, 10].map((m) => m * pow);
    const nice = candidates.reduce((best, c) => (Math.abs(c - metres) < Math.abs(best - metres) ? c : best), candidates[0]);
    return { metres: nice, px: nice * view.scale, label: nice >= 1000 ? `${nice / 1000} km` : `${nice} m` };
  }, [view.scale]);

  return useMemo(
    () => ({ containerRef, setContainerRef, size, view, center, zoomIn, zoomOut, zoomAt, panBy, fitSite, resetView, centerOn, lookAt, toWorld, scaleLabel, scaleBar }),
    [setContainerRef, size, view, center, zoomIn, zoomOut, zoomAt, panBy, fitSite, resetView, centerOn, lookAt, toWorld, scaleLabel, scaleBar]
  );
}

export type MapViewApi = ReturnType<typeof useMapView>;
