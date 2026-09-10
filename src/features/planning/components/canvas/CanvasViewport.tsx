import { useCallback, useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type WheelEvent } from "react";
import type { Point } from "../../types/planning.types";
import type { ViewTransform } from "../../hooks/useCanvasView";

export type CursorMode = "select" | "place" | "line" | "site";

interface CanvasViewportProps {
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  setContainerRef: (el: HTMLDivElement | null) => void;
  view: ViewTransform;
  size: { width: number; height: number };
  cursor: CursorMode;
  showGrid: boolean;
  /** World-space extent used for the background sheet. */
  world: { x: number; y: number; width: number; height: number };
  onBackgroundClick: (world: Point) => void;
  onBackgroundDoubleClick: () => void;
  onPan: (dx: number, dy: number) => void;
  onZoomAt: (factor: number, at: Point) => void;
  onHover: (world: Point | null) => void;
  /** Object drag: called with the world-space delta since the drag started. */
  onObjectDragMove: (id: string, dx: number, dy: number) => void;
  onObjectDragEnd: (id: string, dx: number, dy: number) => void;
  /** Whether objects may be dragged (select tool only). */
  dragEnabled: boolean;
  children: ReactNode;
  ariaLabel: string;
}

const DRAG_THRESHOLD_PX = 4;

interface Gesture {
  kind: "pan" | "object";
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  moved: boolean;
  objectId?: string;
}

/**
 * The 2-D viewport: an SVG with a single transformed group. Handles panning
 * (drag on empty space), wheel zoom, click-vs-drag disambiguation and object
 * dragging. It knows nothing about planning objects — layers are children.
 * A real map engine would replace this component and the layers together.
 */
export function CanvasViewport({
  containerRef,
  setContainerRef,
  view,
  size,
  cursor,
  showGrid,
  world,
  onBackgroundClick,
  onBackgroundDoubleClick,
  onPan,
  onZoomAt,
  onHover,
  onObjectDragMove,
  onObjectDragEnd,
  dragEnabled,
  children,
  ariaLabel,
}: CanvasViewportProps) {
  const gesture = useRef<Gesture | null>(null);
  const [panning, setPanning] = useState(false);
  const patternId = useId().replace(/:/g, "");

  const toLocal = useCallback(
    (e: { clientX: number; clientY: number }): Point => {
      const rect = containerRef.current?.getBoundingClientRect();
      return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
    },
    [containerRef]
  );
  const toWorld = useCallback(
    (local: Point): Point => ({ x: (local.x - view.tx) / view.scale, y: (local.y - view.ty) / view.scale }),
    [view]
  );

  // Wheel zoom (ctrl/pinch or plain wheel) centred on the pointer. Registered
  // manually so it can be non-passive and prevent the page from scrolling.
  const [wheelHost, setWheelHost] = useState<HTMLDivElement | null>(null);
  const attachRef = useCallback(
    (el: HTMLDivElement | null) => {
      setContainerRef(el);
      setWheelHost(el);
    },
    [setContainerRef]
  );
  useEffect(() => {
    if (!wheelHost) return;
    const handler = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      onZoomAt(factor, toLocal(e));
    };
    wheelHost.addEventListener("wheel", handler, { passive: false });
    return () => wheelHost.removeEventListener("wheel", handler);
  }, [wheelHost, onZoomAt, toLocal]);

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const target = e.target as Element;
    const objectEl = target.closest<SVGElement>("[data-object-id]");
    const local = toLocal(e);
    const objectId = objectEl?.getAttribute("data-object-id") ?? undefined;
    const isDraggableObject = !!objectId && objectId !== "site" && dragEnabled;
    gesture.current = {
      kind: isDraggableObject ? "object" : "pan",
      pointerId: e.pointerId,
      startX: local.x,
      startY: local.y,
      lastX: local.x,
      lastY: local.y,
      moved: false,
      objectId: isDraggableObject ? objectId : undefined,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const local = toLocal(e);
    onHover(toWorld(local));
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;
    const dx = local.x - g.startX;
    const dy = local.y - g.startY;
    if (!g.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    if (!g.moved) {
      g.moved = true;
      if (g.kind === "pan") setPanning(true);
    }
    if (g.kind === "pan") {
      onPan(local.x - g.lastX, local.y - g.lastY);
    } else if (g.objectId) {
      onObjectDragMove(g.objectId, dx / view.scale, dy / view.scale);
    }
    g.lastX = local.x;
    g.lastY = local.y;
  };

  const endGesture = (e: ReactPointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;
    gesture.current = null;
    setPanning(false);
    const local = toLocal(e);
    if (g.kind === "object" && g.objectId) {
      if (g.moved) onObjectDragEnd(g.objectId, (local.x - g.startX) / view.scale, (local.y - g.startY) / view.scale);
      return;
    }
    // A pan that never moved is a click — but only on the background.
    const target = e.target as Element;
    if (!g.moved && !target.closest("[data-object-id]")) onBackgroundClick(toWorld(local));
  };

  const cursorClass =
    panning ? "cursor-grabbing" : cursor === "select" ? "cursor-grab" : cursor === "line" || cursor === "place" ? "cursor-crosshair" : "cursor-pointer";

  const gridMinor = 10; // metres
  const gridMajor = 50;

  return (
    <div
      ref={attachRef}
      className="relative h-full w-full touch-none select-none overflow-hidden bg-[#F1F5FB]"
      role="application"
      aria-label={ariaLabel}
    >
      <svg
        width={size.width || "100%"}
        height={size.height || "100%"}
        className={`block h-full w-full ${cursorClass}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onPointerLeave={() => onHover(null)}
        onDoubleClick={(e) => {
          if (!(e.target as Element).closest("[data-object-id]")) onBackgroundDoubleClick();
        }}
        onWheel={(e: WheelEvent) => e.stopPropagation()}
      >
        <defs>
          <pattern id={`${patternId}-minor`} width={gridMinor * view.scale} height={gridMinor * view.scale} patternUnits="userSpaceOnUse" x={view.tx} y={view.ty}>
            <path d={`M ${gridMinor * view.scale} 0 L 0 0 0 ${gridMinor * view.scale}`} fill="none" stroke="#DCE6F2" strokeWidth={0.6} />
          </pattern>
          <pattern id={`${patternId}-major`} width={gridMajor * view.scale} height={gridMajor * view.scale} patternUnits="userSpaceOnUse" x={view.tx} y={view.ty}>
            <path d={`M ${gridMajor * view.scale} 0 L 0 0 0 ${gridMajor * view.scale}`} fill="none" stroke="#CBD8EA" strokeWidth={0.9} />
          </pattern>
          <pattern id="uf-water-ripple" width={14} height={8} patternUnits="userSpaceOnUse">
            <path d="M0 4 Q 3.5 1 7 4 T 14 4" fill="none" stroke="#FFFFFF" strokeWidth={0.9} opacity={0.55} />
          </pattern>
          <pattern id="uf-parking-bays" width={5} height={10} patternUnits="userSpaceOnUse">
            <path d="M0 0 V10" stroke="#FFFFFF" strokeWidth={0.8} />
            <path d="M0 5 H5" stroke="#FFFFFF" strokeWidth={0.5} opacity={0.6} />
          </pattern>
          <pattern id="uf-paving" width={6} height={6} patternUnits="userSpaceOnUse">
            <path d="M0 0 H6 V6" fill="none" stroke="#FFFFFF" strokeWidth={0.6} opacity={0.6} />
          </pattern>
        </defs>

        {/* grid, in screen space so it stays crisp */}
        {showGrid && size.width > 0 && view.scale > 0.35 && (
          <>
            <rect width="100%" height="100%" fill={`url(#${patternId}-minor)`} />
            <rect width="100%" height="100%" fill={`url(#${patternId}-major)`} />
          </>
        )}

        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}>
          {/* world sheet */}
          <rect x={world.x} y={world.y} width={world.width} height={world.height} fill="#F7FAFE" stroke="#DCE6F2" strokeWidth={1 / view.scale} />
          {children}
        </g>
      </svg>
    </div>
  );
}
