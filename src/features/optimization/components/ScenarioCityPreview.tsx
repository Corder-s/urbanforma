import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Box } from "lucide-react";
import { CityScene } from "../../visualization/components/3d/CityScene";
import { DEFAULT_SETTINGS } from "../../visualization/data/visualization.data";
import type { CameraPreset, SpatialDataset, SpatialObject } from "../../visualization/types/visualization.types";
import { CHANGE_LEGEND } from "../data/optimization.data";
import type { DerivedSpatialState } from "../types/optimization.types";

interface ScenarioCityPreviewProps {
  current: SpatialDataset;
  derived: DerivedSpatialState | null;
  scenarioName: string | null;
  camera: { preset: CameraPreset; token: number };
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Objects the preview shows — the Step 12 default layer set (no POIs / utilities). */
function previewObjects(objects: SpatialObject[]): SpatialObject[] {
  return objects.filter((o) => o.type !== "poi" && o.type !== "utility" && o.type !== "transit" && o.type !== "parking");
}

const LEGEND = Object.fromEntries(CHANGE_LEGEND.map((l) => [l.kind, l]));

/**
 * 3D scenario preview: the Step 12 city renderer fed with the scenario
 * dataset. Added / modified buildings are tinted (legend colours) and removed
 * buildings show as translucent red footprints on the ground. Lazy-loaded so
 * Three.js never enters the main bundle.
 */
export function ScenarioCityPreview({ current, derived, scenarioName, camera, selectedId, onSelect }: ScenarioCityPreviewProps) {
  const data = derived?.dataset ?? current;
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const sceneRef = useRef<CityScene | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const hostRef = useCallback((el: HTMLDivElement | null) => setHost(el), []);
  const visible = useMemo(() => previewObjects(data.objects), [data]);
  const settings = useMemo(() => ({ ...DEFAULT_SETTINGS, labels: false, buildingShadows: true }), []);

  const onPick = useCallback(
    (id: string | null) => {
      if (!id || id === "site-boundary") return onSelect(null);
      const o = data.objects.find((x) => x.id === id);
      onSelect(o && o.type !== "tree" ? id : null);
    },
    [data, onSelect]
  );

  useEffect(() => {
    if (!host) return;
    let scene: CityScene | null = null;
    try {
      scene = new CityScene(host, { data, visible, settings, basemap: "light" }, { onSelect: onPick, onHover: setHover, reducedMotion: prefersReducedMotion() });
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
    // created once per host + project; dataset / overlay flow through the effects below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, current.projectId]);

  useEffect(() => {
    sceneRef.current?.update({ data, visible, settings, basemap: "light" });
  }, [data, visible, settings]);

  // change tint → scene
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (!derived) {
      scene.setOverlay(null);
      return;
    }
    const buildings = new Map<string, THREE.Color>();
    for (const [id, kind] of derived.changeOf) {
      const o = derived.dataset.objects.find((x) => x.id === id);
      if (o?.type !== "building") continue;
      buildings.set(id, new THREE.Color(kind === "added" ? LEGEND.added.fill : LEGEND.modified.fill));
    }
    // unchanged buildings keep a neutral shell so the changes stand out
    for (const o of derived.dataset.objects) if (o.type === "building" && !buildings.has(o.id)) buildings.set(o.id, new THREE.Color("#E8EDF5"));
    const zones = derived.removed
      .filter((o) => o.type === "building" && o.geometry.kind === "rect")
      .map((o) => {
        const g = o.geometry as { center: { x: number; y: number }; width: number; depth: number };
        return { bounds: { x: g.center.x - g.width / 2 - 2, y: g.center.y - g.depth / 2 - 2, width: g.width + 4, height: g.depth + 4 }, color: new THREE.Color(LEGEND.removed.stroke), opacity: 0.45 };
      });
    scene.setOverlay({ buildings, zones });
  }, [derived]);

  useEffect(() => {
    const o = selectedId ? data.objects.find((x) => x.id === selectedId) : null;
    sceneRef.current?.highlight(o?.type === "building" ? selectedId : null);
  }, [selectedId, data]);

  const lastCamera = useRef(camera.token);
  useEffect(() => {
    if (camera.token === lastCamera.current) return;
    lastCamera.current = camera.token;
    sceneRef.current?.preset(camera.preset);
  }, [camera]);

  const hovered = hover ? data.objects.find((o) => o.id === hover) ?? null : null;
  const hoverKind = hovered && derived ? derived.changeOf.get(hovered.id) : undefined;

  if (failed) {
    return (
      <div className="grid h-full w-full place-items-center bg-canvas p-6" role="status">
        <div className="max-w-sm rounded-2xl border border-line bg-surface p-6 text-center shadow-soft">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <Box className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="mt-3 text-base font-bold text-ink">3D preview unavailable</h3>
          <p className="mt-1 text-sm text-muted">This browser could not start WebGL. The 2D scenario map shows the same changes.</p>
          <p className="mt-2 text-xs text-muted">{failed}</p>
        </div>
      </div>
    );
  }

  const buildingCount = visible.filter((o) => o.type === "building").length;
  return (
    <div className="relative h-full w-full">
      <div
        ref={hostRef}
        role="application"
        tabIndex={0}
        aria-label={`3D preview of ${data.projectName}${scenarioName ? `, ${scenarioName} scenario` : ", current plan"}. Drag to orbit, right-drag or two fingers to pan, scroll or pinch to zoom. F fits the site, T top view, P perspective, R resets.`}
        aria-describedby="scenario-3d-status"
        className="h-full w-full touch-none overflow-hidden outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/30"
      />
      <p id="scenario-3d-status" className="sr-only" aria-live="polite">
        {`3D scene showing ${buildingCount} buildings${derived ? `; ${derived.addedIds.length} added, ${derived.removed.length} removed` : ""}.`}
      </p>
      {hovered && hovered.id !== selectedId && hovered.type === "building" && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-line bg-surface/95 px-2.5 py-1.5 text-xs font-semibold text-ink shadow-soft" aria-hidden="true">
          {hovered.name}
          <span className="ml-1.5 font-medium text-muted">
            · {hovered.properties.floors} fl{hoverKind ? ` · ${LEGEND[hoverKind].label}` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
