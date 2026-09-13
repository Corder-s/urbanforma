import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BimIndex } from "../lib/bimModel";
import { seedIssues } from "../lib/bimModel";
import { createIssue, deleteIssue, loadIssues, saveIssues, updateIssue, type NewIssueInput } from "../services/bim.service";
import type { BimIssue, BimIssueSeverity, BimIssueStatus, BimModel } from "../types/bim.types";

export interface BimIssueCounts {
  total: number;
  open: number;
  inReview: number;
  resolved: number;
  bySeverity: Record<BimIssueSeverity, number>;
}

export interface BimIssuesApi {
  issues: BimIssue[];
  counts: BimIssueCounts;
  /** True when the list came from storage or was seeded — the UI says which. */
  seeded: boolean;
  create: (input: NewIssueInput) => BimIssue;
  update: (id: string, patch: Partial<Pick<BimIssue, "title" | "description" | "severity" | "status" | "elementIds" | "location">>) => void;
  setStatus: (id: string, status: BimIssueStatus) => void;
  remove: (id: string) => void;
  /** Restores the demo findings for this model (local issues are kept). */
  reseed: () => void;
}

const EMPTY_COUNTS: BimIssueCounts = {
  total: 0,
  open: 0,
  inReview: 0,
  resolved: 0,
  bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
};

/**
 * Coordination issues of a project. Stored locally; the demo findings are
 * seeded once per model from the derived elements (and always labelled as demo
 * in the UI). Creating, editing and resolving issues is real and persisted.
 */
export function useBimIssues(projectId: string | null, index: BimIndex | null, model: BimModel | null): BimIssuesApi {
  const [issues, setIssues] = useState<BimIssue[]>([]);
  const [seeded, setSeeded] = useState(false);
  const seededFor = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setIssues([]);
      setSeeded(false);
      seededFor.current = null;
      return;
    }
    const stored = loadIssues(projectId);
    if (stored) {
      setIssues(stored);
      setSeeded(stored.some((i) => i.source === "demo"));
      seededFor.current = `${projectId}:${model?.id ?? ""}`;
      return;
    }
    if (!index || !model) return;
    const key = `${projectId}:${model.id}`;
    if (seededFor.current === key) return;
    seededFor.current = key;
    const demo = seedIssues(index, model);
    saveIssues(projectId, demo);
    setIssues(demo);
    setSeeded(true);
  }, [projectId, index, model]);

  const create = useCallback(
    (input: NewIssueInput): BimIssue => {
      const next = projectId ? createIssue(projectId, input) : [];
      const created = next[0];
      if (created) setIssues(next);
      return created ?? {
        id: "",
        title: input.title,
        description: input.description,
        severity: input.severity,
        elementIds: input.elementIds,
        status: "open",
        location: input.location,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: "local",
      };
    },
    [projectId]
  );

  const update = useCallback(
    (id: string, patch: Partial<Pick<BimIssue, "title" | "description" | "severity" | "status" | "elementIds" | "location">>) => {
      if (!projectId) return;
      setIssues(updateIssue(projectId, id, patch));
    },
    [projectId]
  );

  const setStatus = useCallback((id: string, status: BimIssueStatus) => update(id, { status }), [update]);

  const remove = useCallback(
    (id: string) => {
      if (!projectId) return;
      setIssues(deleteIssue(projectId, id));
    },
    [projectId]
  );

  const reseed = useCallback(() => {
    if (!projectId || !index || !model) return;
    const demo = seedIssues(index, model);
    const local = issues.filter((i) => i.source === "local");
    const merged = [...local, ...demo.filter((d) => !local.some((l) => l.title === d.title))];
    saveIssues(projectId, merged);
    setIssues(merged);
    setSeeded(true);
  }, [projectId, index, model, issues]);

  const counts = useMemo<BimIssueCounts>(() => {
    const c: BimIssueCounts = { total: issues.length, open: 0, inReview: 0, resolved: 0, bySeverity: { ...EMPTY_COUNTS.bySeverity } };
    for (const i of issues) {
      if (i.status === "open") c.open += 1;
      else if (i.status === "in-review") c.inReview += 1;
      else c.resolved += 1;
      c.bySeverity[i.severity] += 1;
    }
    return c;
  }, [issues]);

  return { issues, counts, seeded, create, update, setStatus, remove, reseed };
}
