import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Box } from "lucide-react";
import { CityScene, type SceneOverlay } from "../../visualization/components/3d/CityScene";
import { DEFAULT_SETTINGS, LAND_USE_STYLE } from "../../visualization/data/visualization.data";
import type { BuildingObject, SpatialObject } from "../../visualization/types/visualization.types";
import { RAMPS } from "../data/analysis.data";
import type { AnalysisState } from "../hooks/useAnalysisState";
import { rampColor } from "../lib/analysis.engine";
import type { AnalysisOverlay } from "../types/analysis.types";

interface AnalysisCityPreviewProps {
  state: AnalysisState;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Objects the preview shows — the Step 12 default layer set (no POIs / utilities). */
function previewObjects(objects: SpatialObject[]): SpatialObject[] {
  return objects.filter((o) => o.type !== "poi" && o.type !== "utility" && o.type !== "transit" && o.type !== "parking");
}

/** Colour a building for the active overlay (same ramps as the 2-D map). */
function buildingColor(overlay: AnalysisOverlay, b: BuildingObject, zoneValue: number | undefined): THREE.Color | null {
  const v = overlay.buildings[b.id];
  switch (overlay.type) {
    case "landuse":
      return new THREE.Color(LAND_USE_STYLE[b.properties.landUse].fill);
    case "height":
    case "density":
    case "carbon":
      return v === undefined ? null : new THREE.Color(rampColor(RAMPS[overlay.type], overlay.type === "carbon" ? 0.15 + v * 0.85 : 0.2 + v * 0.8));
    case "heat":
    case "solar":
      // zone value drives the building shell so towers read as part of their zone
      return zoneValue === undefined ? null : new THREE.Color(rampColor(RAMPS[overlay.type], zoneValue)).lerp(new THREE.Color("#ffffff"), 0.25);
    default:
      return null;
  }
}

/**
 * 3D Preview: the Step 12 city renderer with the active analysis painted on
 * it — building shells tinted per value and translucent zone plates on the
 * ground. Lazy-loaded so Three.js never enters the main bundle.
 */
export function AnalysisCityPreview({ state }: AnalysisCityPreviewProps) {
  const { data, activeOverlay, selectedArea, selectArea, camera, selectedBuilding } = state;
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const sceneRef = useRef<CityScene | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const hostRef = useCallback((el: HTMLDivElement | null) => setHost(el), []);
  const visible = useMemo(() => (data ? previewObjects(data.objects) : []), [data]);
  const settings = useMemo(() => ({ ...DEFAULT_SETTINGS, labels: false, buildingShadows: true }), []);

  // selection from the 3D scene: only buildings are meaningful for analysis
  const onSelect = useCallback(
    (id: string | null) => {
      if (!id || id === "site-boundary") return selectArea(null);
      const o = data?.objects.find((x) => x.id === id);
      selectArea(o?.type === "building" ? id : null);
    },
    [data, selectArea]
  );

  useEffect(() => {
    if (!host || !data) return;
    let scene: CityScene | null = null;
    try {
      scene = new CityScene(host, { data, visible, settings, basemap: "light" }, { onSelect, onHover: setHover, reducedMotion: prefersReducedMotion() });
      sceneRef.current = scene;
      setFailed(null);
    } catch (err) {
      setFailed(err instanceof Error ? err.message : "WebGL is not available in this browser.");
      return;
    }
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => scene?.resize()) : null;
    ro?.observe(host);
    return () => {
      ro?.disconnect();
      scene?.dispose();
      sceneRef.current = null;
    };
    // created once per host + project; overlay / selection flow through the effects below
  }, [host, data?.projectId]);

  useEffect(() => {
    if (!data) return;
    sceneRef.current?.update({ data, visible, settings, basemap: "light" });
  }, [data, visible, settings]);

  // overlay → scene
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !data) return;
    if (!activeOverlay) {
      scene.setOverlay(null);
      return;
    }
    const zoneOf = new Map<string, number>();
    for (const z of activeOverlay.zones) zoneOf.set(z.id, z.value);
    const zoneValueAt = (x: number, y: number) => {
      const z = activeOverlay.zones.find((c) => x >= c.bounds.x && x < c.bounds.x + c.bounds.width && y >= c.bounds.y && y < c.bounds.y + c.bounds.height);
      return z?.value;
    };
    const buildings = new Map<string, THREE.Color>();
    let any = false;
    for (const o of data.objects) {
      if (o.type !== "building") continue;
      const c = buildingColor(activeOverlay, o, zoneValueAt(o.geometry.center.x, o.geometry.center.y));
      if (c) {
        buildings.set(o.id, c);
        any = true;
      }
    }
    const ramp = activeOverlay.type === "landuse" || activeOverlay.type === "roads" ? null : RAMPS[activeOverlay.type];
    const zones: SceneOverlay["zones"] = ramp
      ? activeOverlay.zones.map((z) => ({ bounds: z.bounds, color: new THREE.Color(rampColor(ramp, z.value)), opacity: activeOverlay.type === "wind" ? 0.22 : 0.42 * (0.5 + 0.5 * z.coverage) }))
      : [];
    scene.setOverlay({ buildings: any ? buildings : null, zones });
  }, [activeOverlay, data]);

  useEffect(() => {
    sceneRef.current?.highlight(selectedBuilding?.type === "building" ? selectedArea : null);
  }, [selectedArea, selectedBuilding]);

  const lastCamera = useRef(camera.token);
  useEffect(() => {
    if (camera.token === lastCamera.current) return;
    lastCamera.current = camera.token;
    sceneRef.current?.preset(camera.preset);
  }, [camera]);

  if (!data) return null;
  const hovered = hover ? data.objects.find((o) => o.id === hover) ?? null : null;

  if (failed) {
    return (
      <div className="grid h-full w-full place-items-center bg-canvas p-6" role="status">
        <div className="max-w-sm rounded-2xl border border-line bg-surface p-6 text-center shadow-soft">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <Box className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="mt-3 text-base font-bold text-ink">3D preview unavailable</h3>
          <p className="mt-1 text-sm text-muted">This browser could not start WebGL. The 2D analysis map shows the same overlay.</p>
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
        aria-label={`3D preview of ${data.projectName}${activeOverlay ? ` with the ${activeOverlay.title.toLowerCase()} overlay` : ""}. Drag to orbit, right-drag or two fingers to pan, scroll or pinch to zoom. F fits the site, T top view, P perspective, R resets.`}
        aria-describedby="analysis-3d-status"
        className="h-full w-full touch-none overflow-hidden outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/30"
      />
      <p id="analysis-3d-status" className="sr-only" aria-live="polite">
        {`3D scene showing ${visible.filter((o) => o.type === "building").length} buildings${activeOverlay ? ` coloured by ${activeOverlay.title.toLowerCase()}` : ""}.`}
        {selectedBuilding ? ` Selected: ${selectedBuilding.name}.` : ""}
      </p>
      {hovered && hovered.id !== selectedArea && hovered.type === "building" && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-line bg-surface/95 px-2.5 py-1.5 text-xs font-semibold text-ink shadow-soft" aria-hidden="true">
          {hovered.name}
          <span className="ml-1.5 font-medium text-muted">· {hovered.properties.landUse}</span>
        </div>
      )}
    </div>
  );
}
