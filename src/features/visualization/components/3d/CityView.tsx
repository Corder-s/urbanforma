import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { Box } from "lucide-react";
import type { VisualizationState } from "../../hooks/useVisualizationState";
import type { Annotation, CameraPose } from "../../types/visualization.types";
import { CityScene } from "./CityScene";

interface CityViewProps {
  state: VisualizationState;
  /** Presentation annotations drawn in the scene (already filtered by the caller). */
  annotations?: Annotation[];
  /** Present mode: no hover chip / selection affordances. */
  presentation?: boolean;
}

/** A 360° inspection request — the BIM element/model turntable. */
export interface Inspect360Request {
  /** Spatial object to isolate and orbit; `null` orbits the whole site. */
  objectId: string | null;
  playing: boolean;
  /** Degrees per second. */
  speed: number;
  clockwise: boolean;
  /**
   * Azimuth, published ~8× a second while the camera moves. Write it straight
   * to a DOM node: a state update per frame would re-render the caller's whole
   * workspace for one number.
   */
  onAngle?: (degrees: number) => void;
}

/** Imperative surface for Capture View and the 360° inspection. */
export interface CityViewHandle {
  capture: () => string | null;
  /** Frame a target and orbit it 360°. Pass `null` to leave the inspection. */
  inspect360: (request: Inspect360Request | null) => void;
  /** Step the orbit by an exact angle (keyboard inspection, no animation). */
  nudge360: (degrees: number) => void;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const NO_ANNOTATIONS: Annotation[] = [];

/**
 * React wrapper for the Three.js city. Owns the lifecycle (create / update /
 * dispose), forwards camera + focus requests, publishes the camera pose for
 * saved views and provides the accessible fallback and live status for the
 * canvas.
 */
export const CityView = forwardRef<CityViewHandle, CityViewProps>(function CityView({ state, annotations = NO_ANNOTATIONS, presentation = false }, ref) {
  const { data, visibleObjects, settings, basemap, camera, cameraApplied, request, requestApplied, focus, selection, select, selectedObject, report3d } = state;
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const sceneRef = useRef<CityScene | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const hostRef = useCallback((el: HTMLDivElement | null) => setHost(el), []);

  /**
   * The request survives the scene's lifecycle: entering an inspection usually
   * means switching 2-D → 3-D, so the scene does not exist yet when the caller
   * asks. It is stashed and applied on creation, and re-applied after a project
   * change or a trip back to 2-D.
   */
  const pendingInspect = useRef<Inspect360Request | null>(null);
  /** Which target has already been framed, so playback changes do not re-fly. */
  const framedFor = useRef<string | null | undefined>(undefined);

  // Stable: the imperative handle and the create effect both close over it.
  const applyInspect = useCallback((request: Inspect360Request | null, scene: CityScene) => {
    if (request === null) {
      framedFor.current = undefined;
      scene.stopInspect360();
      return;
    }
    if (framedFor.current !== request.objectId) {
      framedFor.current = request.objectId;
      scene.inspect360(request.objectId);
    }
    scene.setTurntable({
      playing: request.playing,
      speed: request.speed,
      clockwise: request.clockwise,
      onAngle: request.onAngle,
    });
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      capture: () => sceneRef.current?.capture() ?? null,
      inspect360: (request) => {
        pendingInspect.current = request;
        const scene = sceneRef.current;
        if (scene) applyInspect(request, scene);
      },
      nudge360: (degrees) => sceneRef.current?.nudge360(degrees),
    }),
    [applyInspect]
  );

  // create / dispose --------------------------------------------------------------------------
  useEffect(() => {
    if (!host || !data) return;
    let scene: CityScene | null = null;
    try {
      scene = new CityScene(host, { data, visible: visibleObjects, settings, basemap }, { onSelect: select, onHover: setHover, reducedMotion: prefersReducedMotion(), onCamera: report3d });
      sceneRef.current = scene;
      setFailed(null);
      // pending requests (e.g. a saved view or slide that switched the view to 3D) are applied once the scene exists
      if (camera.token !== cameraApplied.current) {
        cameraApplied.current = camera.token;
        scene.preset(camera.preset);
      }
      if (request && request.token !== requestApplied.current) {
        requestApplied.current = request.token;
        applyRequest(scene, request.pose, host);
      }
      // An inspection requested before this scene existed (2-D → 3-D switch).
      if (pendingInspect.current) applyInspect(pendingInspect.current, scene);
    } catch (err) {
      setFailed(err instanceof Error ? err.message : "WebGL is not available in this browser.");
      return;
    }
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => scene?.resize()) : null;
    ro?.observe(host);
    const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    const onMq = () => scene?.setReducedMotion(!!mq?.matches);
    mq?.addEventListener?.("change", onMq);
    return () => {
      ro?.disconnect();
      mq?.removeEventListener?.("change", onMq);
      scene?.dispose();
      sceneRef.current = null;
      // A disposed scene invalidates the request: the next scene must frame the
      // target again, and a stale id must never be replayed into another
      // project's scene (the caller re-issues on the next view/project change).
      framedFor.current = undefined;
      pendingInspect.current = null;
    };
    // The scene is created once per host + project; later changes flow through
    // the update effects below, so only those two dependencies are intended.
  }, [host, data?.projectId]);

  // data / settings updates ------------------------------------------------------------------
  useEffect(() => {
    if (!data) return;
    sceneRef.current?.update({ data, visible: visibleObjects, settings, basemap });
  }, [data, visibleObjects, settings, basemap]);

  useEffect(() => {
    sceneRef.current?.setCameraHeight(settings.cameraHeight);
  }, [settings.cameraHeight]);

  useEffect(() => {
    sceneRef.current?.highlight(!presentation && selection && selectedObject?.type === "building" ? selection : null);
  }, [selection, selectedObject, presentation]);

  useEffect(() => {
    sceneRef.current?.setAnnotations(annotations);
  }, [annotations, data]);

  useEffect(() => {
    if (!sceneRef.current || camera.token === cameraApplied.current) return;
    cameraApplied.current = camera.token;
    sceneRef.current.preset(camera.preset);
  }, [camera, cameraApplied]);

  useEffect(() => {
    if (!request || request.token === requestApplied.current || !sceneRef.current || !host) return;
    requestApplied.current = request.token;
    applyRequest(sceneRef.current, request.pose, host);
  }, [request, requestApplied, host]);

  const lastFocus = useRef(focus?.token ?? 0);
  useEffect(() => {
    if (!focus || focus.token === lastFocus.current) return;
    lastFocus.current = focus.token;
    sceneRef.current?.focus(focus.objectId);
  }, [focus]);

  if (!data) return null;
  const hovered = hover && !presentation ? data.objects.find((o) => o.id === hover) ?? null : null;

  if (failed) {
    return (
      <div className="grid h-full w-full place-items-center bg-bg p-6" role="status">
        <div className="max-w-sm rounded-2xl border border-line bg-surface p-6 text-center shadow-soft">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <Box className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="mt-3 text-base font-bold text-ink">3D view unavailable</h3>
          <p className="mt-1 text-sm text-muted">This browser could not start WebGL. The 2D map shows the same site data.</p>
          <p className="mt-2 text-xs text-muted">{failed}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div
        ref={hostRef}
        role="application"
        tabIndex={0}
        aria-label={`3D city model of ${data.projectName}. Drag to orbit, right-drag or two fingers to pan, scroll or pinch to zoom. Arrow keys pan, Shift plus arrows orbit; F fits the site, T top view, P perspective, R resets, Escape clears the selection.`}
        aria-describedby="city-3d-status"
        className="h-full w-full touch-none overflow-hidden outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/30"
      />
      {/* accessible description of the rendered scene */}
      <p id="city-3d-status" className="sr-only" aria-live="polite">
        {`3D scene showing ${visibleObjects.filter((o) => o.type === "building").length} buildings, ${visibleObjects.filter((o) => o.type === "tree").length} trees and ${visibleObjects.filter((o) => o.type === "road" || o.type === "path").length} roads.`}
        {selectedObject && !presentation ? ` Selected: ${selectedObject.name}.` : ""}
        {annotations.length > 0 ? ` Annotations: ${annotations.map((a) => (a.detail ? `${a.text} ${a.detail}` : a.text)).join(", ")}.` : ""}
      </p>
      {hovered && hovered.id !== selection && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-line bg-surface/95 px-2.5 py-1.5 text-xs font-semibold text-ink shadow-soft" aria-hidden="true">
          {hovered.name}
          {hovered.type === "building" && <span className="ml-1.5 font-medium text-muted">· {hovered.properties.landUse}</span>}
        </div>
      )}
    </div>
  );
});

function applyRequest(scene: CityScene, pose: CameraPose, host: HTMLDivElement) {
  if (pose.kind === "3d") scene.setPose(pose.position, pose.target);
  else if (pose.kind === "2d") scene.setPose2d(pose.center, pose.scale, Math.min(host.clientWidth || 800, host.clientHeight || 600));
  else scene.preset(pose.preset);
}
