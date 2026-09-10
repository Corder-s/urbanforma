import { useCallback, useEffect, useState } from "react";
import { getSpatialData, ProjectNotFoundError } from "../services/visualization.service";
import type { SpatialDataset } from "../types/visualization.types";

export type SpatialLoad =
  | { status: "idle" }
  | { status: "loading"; projectId: string }
  | { status: "not-found"; projectId: string }
  | { status: "error"; projectId: string; message: string }
  | { status: "ready"; projectId: string; data: SpatialDataset };

/** Loads the spatial dataset for a project (future GET /api/projects/:id/spatial). */
export function useSpatialData(projectId: string | null) {
  const [load, setLoad] = useState<SpatialLoad>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!projectId) {
      setLoad({ status: "idle" });
      return;
    }
    let active = true;
    setLoad({ status: "loading", projectId });
    getSpatialData(projectId)
      .then((data) => {
        if (active) setLoad({ status: "ready", projectId, data });
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof ProjectNotFoundError) setLoad({ status: "not-found", projectId });
        else setLoad({ status: "error", projectId, message: err instanceof Error ? err.message : "Unable to load spatial data." });
      });
    return () => {
      active = false;
    };
  }, [projectId, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return { load, retry };
}
