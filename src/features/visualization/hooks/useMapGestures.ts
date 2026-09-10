import { useCallback, useEffect, useRef, useState } from "react";
import type { MapViewApi } from "./useMapView";

/**
 * Pointer + wheel + keyboard gestures for a 2-D map viewport (pan, wheel zoom
 * at the cursor, two-finger pinch, tap-to-select, arrow-key pan).
 *
 * Selection is resolved from the pointerdown target: once the container
 * captures the pointer, browsers retarget the follow-up click to the capturing
 * element, so per-feature onClick handlers would never fire. Any element with
 * `data-object-id` is selectable; a tap on the background selects `null`.
 *
 * Shared by the Visualization map and the Analysis map so both feel identical.
 */
export function useMapGestures(map: MapViewApi, onSelect: (id: string | null) => void) {
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; moved: boolean; objectId: string | null; pinchDist: number | null } | null>(null);
  const [panning, setPanning] = useState(false);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (pointers.current.size === 1) {
      const objectId = (e.target as Element).closest("[data-object-id]")?.getAttribute("data-object-id") ?? null;
      gesture.current = { x: e.clientX, y: e.clientY, moved: false, objectId, pinchDist: null };
    } else if (gesture.current) {
      gesture.current.moved = true; // a second finger turns the gesture into a pinch
      gesture.current.pinchDist = null;
    }
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const g = gesture.current;
      if (!g || !pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size >= 2) {
        const [a, b] = Array.from(pointers.current.values());
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const r = e.currentTarget.getBoundingClientRect();
        if (g.pinchDist) map.zoomAt(dist / g.pinchDist, { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top });
        g.pinchDist = dist;
        return;
      }
      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      if (!g.moved && Math.hypot(dx, dy) < 3) return;
      g.moved = true;
      setPanning(true);
      g.x = e.clientX;
      g.y = e.clientY;
      map.panBy(dx, dy);
    },
    [map]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      pointers.current.delete(e.pointerId);
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      if (pointers.current.size > 0) return;
      const g = gesture.current;
      gesture.current = null;
      setPanning(false);
      if (g && !g.moved) onSelect(g.objectId);
    },
    [onSelect]
  );

  // Wheel zoom needs a non-passive listener (to prevent page scroll), so it is
  // bound imperatively on the container element.
  const { containerRef, zoomAt, size } = map;
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, { x: e.clientX - r.left, y: e.clientY - r.top });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [containerRef, zoomAt, size.width]);

  // Arrow keys pan when the map itself is focused; other shortcuts are workspace-wide.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      const step = 60;
      if (e.key === "ArrowLeft") map.panBy(step, 0);
      else if (e.key === "ArrowRight") map.panBy(-step, 0);
      else if (e.key === "ArrowUp") map.panBy(0, step);
      else if (e.key === "ArrowDown") map.panBy(0, -step);
      else return;
      e.preventDefault();
    },
    [map]
  );

  return { panning, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onKeyDown } };
}
