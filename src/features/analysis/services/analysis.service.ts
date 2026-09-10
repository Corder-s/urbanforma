import { getDemoScenario } from "../../projects/project.service";
import { getSpatialData, getVisualizationProjects, ProjectNotFoundError, type VisualizationProjectSummary } from "../../visualization/services/visualization.service";
import type { SpatialDataset } from "../../visualization/types/visualization.types";
import { ANALYSIS_LAST_PROJECT_KEY, ANALYSIS_PREFS_KEY, ANALYSIS_RUN_KEY, isCategoryId } from "../data/analysis.data";
import { ENGINE_VERSION, runDemoAnalysis } from "../lib/analysis.engine";
import type { AnalysisCategoryId, AnalysisMetric, AnalysisResult, AnalysisViewMode, ExportFormat } from "../types/analysis.types";

/**
 * Analysis service — the only module the workspace talks to for analysis data.
 *
 *   runAnalysis(projectId)                → future POST /api/projects/:id/analysis
 *   getAnalysis(projectId)                → future GET  /api/projects/:id/analysis
 *   getAnalysisMetric(projectId, metricId)→ future GET  /api/projects/:id/analysis/metrics/:metricId
 *
 * Today everything is local: the spatial dataset comes from the Step 12
 * service and the demo engine derives the result synchronously. The "run"
 * progress shown in the UI is local processing choreography, not a network
 * request. When a backend exists this module becomes a thin fetch adapter and
 * nothing above it changes.
 */

export type AnalysisProjectSummary = VisualizationProjectSummary;

export async function getAnalysisProjects(): Promise<AnalysisProjectSummary[]> {
  return getVisualizationProjects();
}

/** Load the spatial dataset the analysis runs on (shared with Visualization). */
export async function getAnalysisSpatialData(projectId: string): Promise<SpatialDataset> {
  return getSpatialData(projectId);
}

/**
 * Compute a fresh analysis for a project. Pure and fast (a few ms); the
 * caller decides how to present progress. Throws for unknown projects and for
 * the dev-only `?demo=error` scenario so the error state can be exercised.
 */
export async function runAnalysis(projectId: string, data?: SpatialDataset): Promise<AnalysisResult> {
  if (getDemoScenario() === "error") throw new Error("The analysis engine did not respond. This is a simulated failure for the demo.");
  const spatial = data ?? (await getSpatialData(projectId));
  const result = runDemoAnalysis(spatial, new Date().toISOString());
  saveLastRun(result);
  return result;
}

/**
 * Last completed analysis for a project, or a fresh baseline computation when
 * none has been run in this browser. `fromRun` tells the UI whether the user
 * has explicitly run the analysis (drives the status bar / "last run" copy).
 */
export async function getAnalysis(projectId: string, data?: SpatialDataset): Promise<{ result: AnalysisResult; fromRun: boolean }> {
  const stored = loadLastRun(projectId);
  const spatial = data ?? (await getSpatialData(projectId));
  if (stored && stored.engine.version === ENGINE_VERSION) {
    // Re-derive against the current plan so a changed plan never shows stale
    // geometry, but keep the original run timestamp.
    return { result: runDemoAnalysis(spatial, stored.generatedAt), fromRun: true };
  }
  return { result: runDemoAnalysis(spatial, new Date().toISOString()), fromRun: false };
}

export async function getAnalysisMetric(projectId: string, metricId: string): Promise<AnalysisMetric | null> {
  const { result } = await getAnalysis(projectId);
  return result.metrics.find((m) => m.id === metricId) ?? null;
}

// ---------------------------------------------------------------------------
// Export (frontend/demo) — the same result object feeds PDF / CSV / GeoJSON later
// ---------------------------------------------------------------------------

export interface ExportArtifact {
  filename: string;
  mime: string;
  content: string;
}

export function buildExport(result: AnalysisResult, format: ExportFormat): ExportArtifact {
  const stamp = result.generatedAt.slice(0, 10);
  const slug = result.projectId;
  if (format === "data") {
    // Flat metric table — a CSV writer / GeoJSON encoder can consume the same rows.
    const header = ["metric_id", "category", "name", "value", "unit", "score", "status", "text"];
    const rows = result.metrics.map((m) => [m.id, m.category, m.name, Number.isFinite(m.value) ? String(m.value) : "", m.unit, m.score !== undefined ? String(m.score) : "", m.status, m.text ?? ""]);
    const csv = [header, ...rows].map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
    return { filename: `${slug}-analysis-data-${stamp}.csv`, mime: "text/csv;charset=utf-8", content: `# UrbanForma demo analysis — illustrative values, not measurements\n${csv}\n` };
  }
  const lines: string[] = [];
  lines.push(`UrbanForma — Analysis Summary`);
  lines.push(`Project: ${result.projectName}`);
  lines.push(`Generated: ${new Date(result.generatedAt).toLocaleString("en-US")}`);
  lines.push(`Engine: ${result.engine.kind} ${result.engine.version} — ${result.engine.note}`);
  lines.push("");
  lines.push(`Urban Performance Score: ${result.overallScore} / 100`);
  for (const b of result.breakdown) lines.push(`  ${b.label}: ${b.score}`);
  lines.push("");
  lines.push("Key Findings");
  result.findings.forEach((f, i) => lines.push(`  ${i + 1}. ${f.text}`));
  lines.push("");
  lines.push("Planning Considerations");
  for (const c of result.considerations) lines.push(`  • ${c.title} — ${c.detail}`);
  lines.push("");
  lines.push("Comparison (Current vs Baseline)");
  for (const c of result.comparison) lines.push(`  ${c.label}: ${c.current}${c.unit === "percent" ? "%" : ""} vs ${c.baseline}${c.unit === "percent" ? "%" : ""}`);
  lines.push("");
  lines.push("All values are demo/estimated values for a visualization prototype.");
  return { filename: `${slug}-analysis-summary-${stamp}.txt`, mime: "text/plain;charset=utf-8", content: lines.join("\n") + "\n" };
}

/** Trigger a browser download for an artifact (no-op outside a browser). */
export function downloadArtifact(a: ExportArtifact): boolean {
  try {
    if (typeof window === "undefined" || typeof URL.createObjectURL !== "function") return false;
    const blob = new Blob([a.content], { type: a.mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = a.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Local persistence (last run per project, view prefs, last project)
// ---------------------------------------------------------------------------

function saveLastRun(result: AnalysisResult): void {
  try {
    // Only provenance is stored; the result is always re-derived from the current plan.
    window.localStorage.setItem(`${ANALYSIS_RUN_KEY}.${result.projectId}`, JSON.stringify({ generatedAt: result.generatedAt, engine: result.engine }));
  } catch {
    /* storage unavailable */
  }
}

function loadLastRun(projectId: string): Pick<AnalysisResult, "generatedAt" | "engine"> | null {
  try {
    const raw = window.localStorage.getItem(`${ANALYSIS_RUN_KEY}.${projectId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { generatedAt?: unknown; engine?: { version?: unknown } };
    if (typeof parsed.generatedAt !== "string" || typeof parsed.engine?.version !== "string") return null;
    return { generatedAt: parsed.generatedAt, engine: { kind: "demo", version: parsed.engine.version, note: "" } };
  } catch {
    return null;
  }
}

export interface AnalysisPrefs {
  category: AnalysisCategoryId;
  viewMode: AnalysisViewMode;
}

export function loadAnalysisPrefs(projectId: string): AnalysisPrefs | null {
  try {
    const raw = window.localStorage.getItem(`${ANALYSIS_PREFS_KEY}.${projectId}`);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Record<keyof AnalysisPrefs, unknown>>;
    return { category: isCategoryId(typeof p.category === "string" ? p.category : null) ? (p.category as AnalysisCategoryId) : "overview", viewMode: p.viewMode === "3d" ? "3d" : "2d" };
  } catch {
    return null;
  }
}

export function saveAnalysisPrefs(projectId: string, prefs: AnalysisPrefs): void {
  try {
    window.localStorage.setItem(`${ANALYSIS_PREFS_KEY}.${projectId}`, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function rememberLastAnalyzedProject(projectId: string): void {
  try {
    window.localStorage.setItem(ANALYSIS_LAST_PROJECT_KEY, projectId);
  } catch {
    /* ignore */
  }
}

export function getLastAnalyzedProject(): string | null {
  try {
    return window.localStorage.getItem(ANALYSIS_LAST_PROJECT_KEY);
  } catch {
    return null;
  }
}

export { ProjectNotFoundError };
