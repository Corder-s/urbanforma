import { useCallback, useEffect, useRef, useState } from "react";
import { buildReportModel } from "../lib/reportModel";
import type { ReportModel } from "../types/report.types";

export type ReportModelLoad =
  | { status: "idle" }
  | { status: "loading"; projectId: string }
  | { status: "error"; projectId: string; message: string }
  | { status: "ready"; projectId: string; model: ReportModel };

export interface ReportModelApi {
  load: ReportModelLoad;
  model: ReportModel | null;
  loading: boolean;
  /** Re-read every source (the "Generate report" action) and resolve the model. */
  reload: () => Promise<ReportModel | null>;
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : "The report data could not be read.";
}

/**
 * Owns the live report model for one project.
 *
 * The model is read from the existing services (never cached in storage), so
 * "Generate report" is simply another read: it returns fresh numbers and the
 * caller stamps the report revision. A request counter drops out-of-order
 * responses when the user switches project mid-load.
 */
export function useReportModel(projectId: string | null): ReportModelApi {
  const [load, setLoad] = useState<ReportModelLoad>({ status: "idle" });
  const requestRef = useRef(0);

  const run = useCallback(async (pid: string): Promise<ReportModel | null> => {
    const request = ++requestRef.current;
    setLoad({ status: "loading", projectId: pid });
    try {
      const model = await buildReportModel(pid);
      if (request === requestRef.current) setLoad({ status: "ready", projectId: pid, model });
      return model;
    } catch (err: unknown) {
      if (request === requestRef.current) setLoad({ status: "error", projectId: pid, message: messageOf(err) });
      return null;
    }
  }, []);

  useEffect(() => {
    if (!projectId) {
      requestRef.current += 1;
      setLoad({ status: "idle" });
      return;
    }
    void run(projectId);
  }, [projectId, run]);

  const reload = useCallback(
    () => (projectId ? run(projectId) : Promise.resolve(null)),
    [projectId, run]
  );

  return {
    load,
    model: load.status === "ready" ? load.model : null,
    loading: load.status === "loading",
    reload,
  };
}
