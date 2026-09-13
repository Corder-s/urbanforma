import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import type { CameraPose, CameraPreset } from "../types/visualization.types";
import { getDefaultCameraPreset } from "../../settings/services/settings.service";

/** A 3-D pose the city renderer reports back (position + orbit target). */
export type Pose3d = { position: [number, number, number]; target: [number, number, number] };

export interface CameraRequest {
  pose: CameraPose;
  /** Monotonic token so the same request can be re-issued. */
  token: number;
}

export interface CameraApi {
  /** Camera preset request (token increments so the same preset can repeat). */
  camera: { preset: CameraPreset; token: number };
  requestCamera: (preset: CameraPreset) => void;
  /**
   * Token of the last preset request a renderer applied. Shared by both
   * renderers so a request issued while the other renderer was mounted (or
   * before the target renderer mounted) is applied exactly once.
   */
  cameraApplied: MutableRefObject<number>;
  /** Exact camera restore (saved views / slides). Renderers apply the pose that matches their view mode. */
  request: CameraRequest | null;
  requestPose: (pose: CameraPose) => void;
  requestApplied: MutableRefObject<number>;
  /** Last named preset that was applied (used when saving a view without an exact pose). */
  lastPreset: CameraPreset;
  /** The 3-D renderer publishes its pose here after every camera change. */
  report3d: (pose: Pose3d) => void;
  /** Latest reported 3-D pose (null before the city has rendered). */
  pose3d: () => Pose3d | null;
  /** Reactive copy of the latest 3-D pose (drives the north indicator in Present mode). */
  pose3dValue: Pose3d | null;
}

/**
 * Camera requests shared by both renderers. Presets are the Step 12 mechanism
 * (fit / top / perspective / reset) extended with the named presentation
 * cameras; poses are exact restores used by saved views and storyboard slides.
 */
export function useCamera(resetKey: string | null): CameraApi {
  // The opening camera comes from Settings → Map (default "fit", as before).
  const [camera, setCamera] = useState<{ preset: CameraPreset; token: number }>(() => ({ preset: getDefaultCameraPreset(), token: 0 }));
  const [request, setRequest] = useState<CameraRequest | null>(null);
  const [lastPreset, setLastPreset] = useState<CameraPreset>("overview");
  const pose3dRef = useRef<Pose3d | null>(null);
  const [pose3dValue, setPose3dValue] = useState<Pose3d | null>(null);
  const cameraApplied = useRef(0);
  const requestApplied = useRef(0);

  useEffect(() => {
    pose3dRef.current = null;
    setPose3dValue(null);
    setLastPreset("overview");
  }, [resetKey]);

  const requestCamera = useCallback((preset: CameraPreset) => {
    setCamera((c) => ({ preset, token: c.token + 1 }));
    setLastPreset(preset);
  }, []);

  const requestPose = useCallback((pose: CameraPose) => {
    if (pose.kind === "preset") {
      setCamera((c) => ({ preset: pose.preset, token: c.token + 1 }));
      setLastPreset(pose.preset);
      return;
    }
    setRequest((r) => ({ pose, token: (r?.token ?? 0) + 1 }));
  }, []);

  const report3d = useCallback((pose: Pose3d) => {
    pose3dRef.current = pose;
    setPose3dValue(pose);
  }, []);
  const pose3d = useCallback(() => pose3dRef.current, []);

  return useMemo(
    () => ({ camera, requestCamera, cameraApplied, request, requestPose, requestApplied, lastPreset, report3d, pose3d, pose3dValue }),
    [camera, requestCamera, request, requestPose, lastPreset, report3d, pose3d, pose3dValue]
  );
}
