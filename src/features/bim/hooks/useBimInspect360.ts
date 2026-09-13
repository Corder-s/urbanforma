import { useCallback, useEffect, useMemo, useState } from "react";
import type { BimIndex } from "../lib/bimModel";
import type { BimElement } from "../types/bim.types";
import type { ViewMode } from "../../visualization/types/visualization.types";

/**
 * 360° inspection state for the BIM viewport.
 *
 * The turntable itself belongs to the shared camera rig — nothing here touches
 * three.js, and there is no second scene or camera. This hook only holds the
 * little bit of UI state around it (target, playback, speed, direction) plus the
 * entry/exit transitions, so the workspace can isolate the target through the
 * same `visibleObjects` lever the scene modes already use.
 */

/** Orbit rates: a slow read of every face, a normal tour, a quick spin. */
export const INSPECT_SPEEDS = [12, 24, 45] as const;
/** Degrees per second. */
export type InspectSpeed = (typeof INSPECT_SPEEDS)[number];

/**
 * Arrow-key stepping, in degrees. A positive step turns the camera
 * counter-clockwise as seen from above (three.js' azimuth increases), so
 * ArrowLeft is positive. 15° divides the circle into 24 exact steps.
 */
export const INSPECT_STEP_DEGREES = 15;

/**
 * Motion counts as reduced when Settings says so (`applyPreferences` writes
 * `data-motion` on the root element) or when the OS asks for it — Settings' own
 * `auto` value follows that same media query, so the two never disagree.
 */
export function prefersReducedMotion(): boolean {
  if (typeof document !== "undefined" && document.documentElement.dataset.motion === "reduced") return true;
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export interface BimInspect360Options {
  index: BimIndex | null;
  viewMode: ViewMode;
  /** Another project's geometry cannot be orbited, so the inspection closes. */
  projectId: string | null;
  /** The turntable only exists in the 3-D scene, so entering one switches to it. */
  onEnter3d: () => void;
}

export interface BimInspect360Api {
  /** An inspection is open; the target is isolated in the viewport. */
  active: boolean;
  /** Spatial object being orbited; null = the whole site. */
  targetObjectId: string | null;
  /** The element the tour started from; null = whole model. */
  targetElementId: string | null;
  /** What is being orbited, for the readout. */
  targetName: string;
  playing: boolean;
  speed: InspectSpeed;
  clockwise: boolean;
  /** Open in 2-D, where a turntable cannot run — the bar offers the switch. */
  needs3d: boolean;
  /** Motion is reduced: explains why playback starts paused. */
  motionReduced: boolean;
  enter: (element: BimElement | null) => void;
  exit: () => void;
  togglePlay: () => void;
  cycleSpeed: () => void;
  toggleDirection: () => void;
}

export function useBimInspect360({ index, viewMode, projectId, onEnter3d }: BimInspect360Options): BimInspect360Api {
  const [target, setTarget] = useState<{ elementId: string | null; objectId: string | null } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [clockwise, setClockwise] = useState(true);
  const [motionReduced, setMotionReduced] = useState(prefersReducedMotion);

  // Follow the OS while the page is open. A Settings change is picked up on the
  // next `enter`, which re-reads the same helper.
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setMotionReduced(prefersReducedMotion());
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Reduced motion always wins over playback.
  useEffect(() => {
    if (motionReduced) setPlaying(false);
  }, [motionReduced]);

  useEffect(() => {
    setTarget(null);
  }, [projectId]);

  const enter = useCallback(
    (element: BimElement | null) => {
      const reduced = prefersReducedMotion();
      setMotionReduced(reduced);
      setTarget({ elementId: element?.id ?? null, objectId: element?.planningRef?.objectId ?? null });
      // An element with no planning link has no geometry of its own to orbit, so
      // the tour falls back to the site — and says so.
      setPlaying(!reduced);
      if (viewMode !== "3d") onEnter3d();
    },
    [viewMode, onEnter3d]
  );

  const exit = useCallback(() => setTarget(null), []);
  const togglePlay = useCallback(() => setPlaying((p) => !p), []);
  const cycleSpeed = useCallback(() => setSpeedIndex((i) => (i + 1) % INSPECT_SPEEDS.length), []);
  const toggleDirection = useCallback(() => setClockwise((c) => !c), []);

  const element = target?.elementId && index ? index.byId.get(target.elementId) ?? null : null;
  const targetName = target ? (target.objectId ? element?.name ?? "Selected element" : "Whole site") : "";

  return useMemo(
    () => ({
      active: target !== null,
      targetObjectId: target?.objectId ?? null,
      targetElementId: target?.elementId ?? null,
      targetName,
      playing,
      speed: INSPECT_SPEEDS[speedIndex] ?? INSPECT_SPEEDS[1],
      clockwise,
      needs3d: target !== null && viewMode === "2d",
      motionReduced,
      enter,
      exit,
      togglePlay,
      cycleSpeed,
      toggleDirection,
    }),
    [target, targetName, playing, speedIndex, clockwise, viewMode, motionReduced, enter, exit, togglePlay, cycleSpeed, toggleDirection]
  );
}
