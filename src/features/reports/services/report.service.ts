import { isPersonalizationEnabled } from "../../settings/services/settings.service";
import { REPORT_TYPE_META, SECTION_CATALOG } from "../data/report.catalog";
import type {
  ReportConfig,
  ReportSectionConfig,
  ReportSectionId,
  ReportStatus,
  ReportType,
} from "../types/report.types";

/**
 * Reports persistence + lifecycle, in the same shape as the other feature
 * services: synchronous localStorage behind sanitising readers, so a future
 * Java/Spring Boot report service can replace the body of these functions
 * without touching the UI.
 *
 * Reports are stored per project (`urbanforma.report.<projectId>`), matching
 * how planning / analysis / optimization / visualization key their documents.
 */

const STORAGE_PREFIX = "urbanforma.report.";
const LAST_PROJECT_KEY = "urbanforma.report.lastProjectId";
/** Hard cap so a project report list stays usable (and storage stays small). */
export const MAX_REPORTS = 12;

function storageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`;
}

export function newReportId(): string {
  return `rep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------------------
// Sanitising (corrupt storage must never crash the workspace)
// ---------------------------------------------------------------------------

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isBool = (v: unknown): v is boolean => typeof v === "boolean";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const SECTION_IDS = new Set<string>(SECTION_CATALOG.map((s) => s.id));
const STATUSES: ReportStatus[] = ["draft", "generating", "ready", "failed"];

function sanitizeSection(raw: unknown): ReportSectionConfig | null {
  if (!isRecord(raw) || !isStr(raw.id) || !SECTION_IDS.has(raw.id)) return null;
  return {
    id: raw.id as ReportSectionId,
    enabled: isBool(raw.enabled) ? raw.enabled : true,
    order: isNum(raw.order) ? raw.order : 0,
  };
}

function sanitizeReport(raw: unknown, projectId: string): ReportConfig | null {
  if (!isRecord(raw)) return null;
  const type: ReportType = isStr(raw.type) && raw.type in REPORT_TYPE_META ? (raw.type as ReportType) : "comprehensive";
  const sections = Array.isArray(raw.sections)
    ? (raw.sections.map(sanitizeSection).filter((s): s is ReportSectionConfig => s !== null))
    : [];
  // Guarantee every catalogue section has a slot, so sections added after a
  // report was saved still appear in it. They are inserted at their *catalogue*
  // position (fractional order, normalised below) rather than appended, so the
  // figure sections land next to the content they belong to.
  const present = new Set(sections.map((s) => s.id));
  const defaults = new Set(REPORT_TYPE_META[type].sections);
  const merged = [...sections];
  SECTION_CATALOG.forEach((meta, catalogueIndex) => {
    if (present.has(meta.id)) return;
    let after = -1;
    for (let i = catalogueIndex - 1; i >= 0; i -= 1) {
      const neighbour = merged.find((s) => s.id === SECTION_CATALOG[i].id);
      if (neighbour) {
        after = neighbour.order;
        break;
      }
    }
    merged.push({ id: meta.id, enabled: defaults.has(meta.id), order: after + 0.5 });
  });
  const ordered = merged.sort((a, b) => a.order - b.order).map((section, i) => ({ ...section, order: i }));

  return {
    id: isStr(raw.id) && raw.id ? raw.id : newReportId(),
    projectId,
    type,
    title: isStr(raw.title) && raw.title.trim() ? raw.title.slice(0, 90) : "Untitled report",
    description: isStr(raw.description) ? raw.description.slice(0, 280) : "",
    sections: ordered,
    status: isStr(raw.status) && (STATUSES as string[]).includes(raw.status) ? (raw.status as ReportStatus) : "draft",
    version: isNum(raw.version) && raw.version >= 1 ? Math.floor(raw.version) : 1,
    createdAt: isStr(raw.createdAt) ? raw.createdAt : new Date().toISOString(),
    updatedAt: isStr(raw.updatedAt) ? raw.updatedAt : new Date().toISOString(),
    lastGeneratedAt: isStr(raw.lastGeneratedAt) ? raw.lastGeneratedAt : null,
  };
}

// ---------------------------------------------------------------------------
// Read / write
// ---------------------------------------------------------------------------

export function loadReports(projectId: string): ReportConfig[] | null {
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.map((r) => sanitizeReport(r, projectId)).filter((r): r is ReportConfig => r !== null);
  } catch {
    return null;
  }
}

export function saveReports(projectId: string, reports: ReportConfig[]): void {
  try {
    window.localStorage.setItem(storageKey(projectId), JSON.stringify(reports.slice(0, MAX_REPORTS)));
  } catch {
    /* storage unavailable — reports are session-only */
  }
}

export function rememberLastReportProject(projectId: string): void {
  // Privacy → Personalization off: skip writing convenience history.
  if (!isPersonalizationEnabled()) return;
  try {
    window.localStorage.setItem(LAST_PROJECT_KEY, projectId);
  } catch {
    /* ignore */
  }
}

export function getLastReportProject(): string | null {
  try {
    return window.localStorage.getItem(LAST_PROJECT_KEY);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export function sectionsForType(type: ReportType): ReportSectionConfig[] {
  const enabled = new Set<ReportSectionId>(REPORT_TYPE_META[type].sections);
  return SECTION_CATALOG.map((s, i) => ({ id: s.id, enabled: enabled.has(s.id), order: i }));
}

export function createReport(projectId: string, type: ReportType, projectName: string): ReportConfig {
  const now = new Date().toISOString();
  const label = REPORT_TYPE_META[type].label;
  return {
    id: newReportId(),
    projectId,
    type,
    title: (projectName.trim() ? `${label} — ${projectName.trim()}` : label).slice(0, 90),
    description: REPORT_TYPE_META[type].description,
    sections: sectionsForType(type),
    status: "draft",
    version: 1,
    createdAt: now,
    updatedAt: now,
    lastGeneratedAt: null,
  };
}

export function duplicateReport(report: ReportConfig): ReportConfig {
  const now = new Date().toISOString();
  return {
    ...report,
    id: newReportId(),
    title: `${report.title} (copy)`.slice(0, 90),
    status: "draft",
    version: 1,
    createdAt: now,
    updatedAt: now,
    lastGeneratedAt: null,
    sections: report.sections.map((s) => ({ ...s })),
  };
}

/** Stamp a report as generated: bumps the version and records the timestamp. */
export function markGenerated(report: ReportConfig, status: ReportStatus): ReportConfig {
  const now = new Date().toISOString();
  return {
    ...report,
    status,
    version: report.version + 1,
    updatedAt: now,
    lastGeneratedAt: status === "ready" ? now : report.lastGeneratedAt,
  };
}
