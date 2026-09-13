import { useCallback, useEffect, useRef, useState } from "react";
import { REPORT_TYPE_META } from "../data/report.catalog";
import {
  MAX_REPORTS,
  createReport,
  duplicateReport,
  getLastReportProject,
  loadReports,
  markGenerated,
  rememberLastReportProject,
  saveReports,
  sectionsForType,
} from "../services/report.service";
import type {
  ReportConfig,
  ReportSectionConfig,
  ReportSectionId,
  ReportStatus,
  ReportType,
} from "../types/report.types";

/** Writes are debounced: toggling and reordering sections fires in bursts. */
const SAVE_DEBOUNCE_MS = 350;

interface ReportsState {
  for: string | null;
  reports: ReportConfig[];
  selectedId: string | null;
}

const EMPTY: ReportsState = { for: null, reports: [], selectedId: null };

const nowIso = () => new Date().toISOString();

function byOrder(sections: ReportSectionConfig[]): ReportSectionConfig[] {
  return [...sections].sort((a, b) => a.order - b.order);
}

export interface ReportsApi {
  reports: ReportConfig[];
  /** True once the list for the current project has been read. */
  ready: boolean;
  selectedId: string | null;
  selected: ReportConfig | null;
  select: (id: string | null) => void;
  create: (type: ReportType) => ReportConfig | null;
  duplicate: (id: string) => ReportConfig | null;
  remove: (id: string) => void;
  rename: (id: string, title: string, description?: string) => void;
  changeType: (id: string, type: ReportType) => void;
  toggleSection: (id: string, sectionId: ReportSectionId) => void;
  moveSection: (id: string, sectionId: ReportSectionId, direction: -1 | 1) => void;
  setAllSections: (id: string, enabled: boolean) => void;
  resetSections: (id: string) => void;
  setStatus: (id: string, status: ReportStatus) => void;
  /** Bumps the revision and stamps the generation time. */
  generated: (id: string, status: ReportStatus) => void;
  maxReports: number;
  full: boolean;
}

/**
 * Report list of one project: CRUD + section configuration, persisted locally.
 *
 * A project with no stored reports is seeded with one Comprehensive draft so
 * the workspace opens on a real document; deleting every report still shows the
 * empty state. Storage writes are debounced and flushed on project switch,
 * unmount and `pagehide`, exactly like the visualization preferences.
 */
export function useReports(projectId: string | null, options: { initialSelectedId?: string | null; projectName?: string } = {}): ReportsApi {
  const { initialSelectedId = null, projectName = "" } = options;
  const [state, setState] = useState<ReportsState>(EMPTY);
  const nameRef = useRef(projectName);
  nameRef.current = projectName;

  // --- load (and seed) the list for the project -------------------------------
  useEffect(() => {
    if (!projectId) {
      setState(EMPTY);
      return;
    }
    const stored = loadReports(projectId);
    const reports = stored && stored.length > 0 ? stored : [createReport(projectId, "comprehensive", nameRef.current)];
    if (!stored) saveReports(projectId, reports);
    rememberLastReportProject(projectId);
    const wanted =
      initialSelectedId && reports.some((r) => r.id === initialSelectedId)
        ? initialSelectedId
        : reports[0]?.id ?? null;
    setState({ for: projectId, reports, selectedId: wanted });
    // `initialSelectedId` is intentionally not a dependency: the URL is read
    // once per project, later selection changes are pushed *to* the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // A seeded report created before the project name was known gets its title.
  useEffect(() => {
    const name = projectName.trim();
    if (!projectId || !name) return;
    setState((s) => {
      if (s.for !== projectId) return s;
      let changed = false;
      const reports = s.reports.map((r) => {
        const bare = REPORT_TYPE_META[r.type].label;
        if (r.title === bare) {
          changed = true;
          return { ...r, title: `${bare} — ${name}`.slice(0, 90), updatedAt: nowIso() };
        }
        return r;
      });
      return changed ? { ...s, reports } : s;
    });
  }, [projectId, projectName]);

  // --- debounced persistence --------------------------------------------------
  const pending = useRef<{ id: string; reports: ReportConfig[] } | null>(null);
  const flush = useCallback(() => {
    const write = pending.current;
    if (!write) return;
    pending.current = null;
    saveReports(write.id, write.reports);
  }, []);

  // Declared before the write effect so switching project lands the outgoing
  // project's pending write first.
  useEffect(flush, [projectId, flush]);

  useEffect(() => {
    if (!projectId || state.for !== projectId) return;
    pending.current = { id: projectId, reports: state.reports };
    const timer = window.setTimeout(flush, SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [projectId, state.for, state.reports, flush]);

  useEffect(() => flush, [flush]);
  useEffect(() => {
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [flush]);

  // --- mutations --------------------------------------------------------------
  const patch = useCallback((id: string, fn: (report: ReportConfig) => ReportConfig) => {
    setState((s) =>
      s.reports.some((r) => r.id === id)
        ? { ...s, reports: s.reports.map((r) => (r.id === id ? fn(r) : r)) }
        : s
    );
  }, []);

  const select = useCallback((id: string | null) => setState((s) => ({ ...s, selectedId: id })), []);

  // Both creators compute the new report *outside* the state updater: React may
  // invoke an updater twice in StrictMode, which would otherwise return a
  // different object (and id) than the one stored.
  const create = useCallback(
    (type: ReportType) => {
      if (!projectId || state.for !== projectId || state.reports.length >= MAX_REPORTS) return null;
      const report = createReport(projectId, type, nameRef.current);
      setState((s) => (s.for === projectId ? { ...s, reports: [...s.reports, report], selectedId: report.id } : s));
      return report;
    },
    [projectId, state.for, state.reports.length]
  );

  const duplicate = useCallback(
    (id: string) => {
      if (!projectId || state.for !== projectId || state.reports.length >= MAX_REPORTS) return null;
      const index = state.reports.findIndex((r) => r.id === id);
      if (index < 0) return null;
      const copy = duplicateReport(state.reports[index]);
      setState((s) => {
        if (s.for !== projectId) return s;
        const reports = [...s.reports];
        reports.splice(index + 1, 0, copy);
        return { ...s, reports, selectedId: copy.id };
      });
      return copy;
    },
    [projectId, state.for, state.reports]
  );

  const remove = useCallback((id: string) => {
    setState((s) => {
      const index = s.reports.findIndex((r) => r.id === id);
      if (index < 0) return s;
      const reports = s.reports.filter((r) => r.id !== id);
      const selectedId =
        s.selectedId !== id
          ? s.selectedId
          : reports[index]?.id ?? reports[index - 1]?.id ?? reports[0]?.id ?? null;
      return { ...s, reports, selectedId };
    });
  }, []);

  /**
   * Title / description edits. An empty title is ignored rather than stored (the
   * field keeps its previous value), so a user clearing the input mid-edit never
   * produces an untitled report; the panel holds the raw keystrokes locally.
   */
  const rename = useCallback(
    (id: string, title: string, description?: string) => {
      const cleanTitle = title.trim().slice(0, 90);
      const cleanDescription = description === undefined ? undefined : description.trim().slice(0, 280);
      if (!cleanTitle && cleanDescription === undefined) return;
      patch(id, (r) => ({
        ...r,
        title: cleanTitle || r.title,
        description: cleanDescription === undefined ? r.description : cleanDescription,
        updatedAt: nowIso(),
      }));
    },
    [patch]
  );

  /** Changing the type adopts that type's default section set, keeping the order. */
  const changeType = useCallback(
    (id: string, type: ReportType) => {
      patch(id, (r) => {
        if (r.type === type) return r;
        const defaults = new Set(sectionsForType(type).filter((s) => s.enabled).map((s) => s.id));
        return {
          ...r,
          type,
          sections: r.sections.map((s) => ({ ...s, enabled: defaults.has(s.id) })),
          updatedAt: nowIso(),
        };
      });
    },
    [patch]
  );

  const toggleSection = useCallback(
    (id: string, sectionId: ReportSectionId) => {
      patch(id, (r) => ({
        ...r,
        sections: r.sections.map((s) => (s.id === sectionId ? { ...s, enabled: !s.enabled } : s)),
        updatedAt: nowIso(),
      }));
    },
    [patch]
  );

  const moveSection = useCallback(
    (id: string, sectionId: ReportSectionId, direction: -1 | 1) => {
      patch(id, (r) => {
        const list = byOrder(r.sections);
        const from = list.findIndex((s) => s.id === sectionId);
        const to = from + direction;
        if (from < 0 || to < 0 || to >= list.length) return r;
        const swapped = [...list];
        const [moved] = swapped.splice(from, 1);
        swapped.splice(to, 0, moved);
        return { ...r, sections: swapped.map((s, i) => ({ ...s, order: i })), updatedAt: nowIso() };
      });
    },
    [patch]
  );

  const setAllSections = useCallback(
    (id: string, enabled: boolean) => {
      patch(id, (r) => ({ ...r, sections: r.sections.map((s) => ({ ...s, enabled })), updatedAt: nowIso() }));
    },
    [patch]
  );

  const resetSections = useCallback(
    (id: string) => {
      patch(id, (r) => ({ ...r, sections: sectionsForType(r.type), updatedAt: nowIso() }));
    },
    [patch]
  );

  const setStatus = useCallback(
    (id: string, status: ReportStatus) => {
      patch(id, (r) => (r.status === status ? r : { ...r, status, updatedAt: nowIso() }));
    },
    [patch]
  );

  const generated = useCallback(
    (id: string, status: ReportStatus) => {
      patch(id, (r) => markGenerated(r, status));
    },
    [patch]
  );

  const reports = state.for === projectId && projectId !== null ? state.reports : EMPTY.reports;
  const selected = reports.find((r) => r.id === state.selectedId) ?? null;

  return {
    reports,
    ready: state.for === projectId && projectId !== null,
    selectedId: selected?.id ?? null,
    selected,
    select,
    create,
    duplicate,
    remove,
    rename,
    changeType,
    toggleSection,
    moveSection,
    setAllSections,
    resetSections,
    setStatus,
    generated,
    maxReports: MAX_REPORTS,
    full: reports.length >= MAX_REPORTS,
  };
}

/** The project a report was last opened for (restores the workspace on return). */
export function lastReportProjectId(): string | null {
  return getLastReportProject();
}
