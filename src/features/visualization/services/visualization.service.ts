import { getDemoScenario, getProject, getProjectDetails, ProjectNotFoundError } from "../../projects/project.service";
import { getPlanningState, getPlanningProjects, getSiteInfo } from "../../planning/services/planning.service";
import type { PlanningProjectSummary } from "../../planning/services/planning.service";
import { buildSpatialDataset } from "../data/spatial.data";
import { DEFAULT_LAYERS, DEFAULT_SETTINGS, PREFS_STORAGE_KEY, PRESENTATION_STORAGE_KEY, VIEWS_STORAGE_KEY, VIEW_STORAGE_KEY } from "../data/visualization.data";
import { DEFAULT_PRESENTATION_SETTINGS, DEFAULT_SELECTED_METRICS, PRESENTATION_METRICS, THEMES } from "../data/presentation.data";
import type {
  Annotation,
  BasemapId,
  CameraPose,
  CameraPreset,
  LayerVisibility,
  Presentation,
  PresentationMetricId,
  PresentationSettings,
  PresentationSlide,
  PresentationTheme,
  PresentationView,
  SpatialDataset,
  SpatialObject,
  ViewMode,
  VisualizationSettings,
} from "../types/visualization.types";

/**
 * Visualization service — the only module the workspace talks to for data.
 *
 *   getSpatialData(projectId)              → future GET /api/projects/:id/spatial
 *   getSpatialObject(projectId, objectId)  → future GET /api/projects/:id/spatial/:objectId
 *   getSavedViews(projectId)               → future GET  /api/projects/:id/visualizations
 *   saveView(projectId, view)              → future POST /api/projects/:id/visualizations
 *   updateView(viewId, data)               → future PUT  /api/projects/:id/visualizations/:viewId
 *   deleteView(viewId)                     → future DELETE /api/projects/:id/visualizations/:viewId
 *   getPresentation / savePresentation     → future GET/PUT /api/projects/:id/presentation
 *   (Capture View)                         → future POST /api/projects/:id/visualizations/render
 *
 * Today the dataset is derived from the demo/local planning document. When a
 * GIS backend exists, this module becomes an adapter (GeoJSON / vector tiles /
 * PostGIS → SpatialObject[]) and nothing above it changes.
 */

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type VisualizationProjectSummary = PlanningProjectSummary;

export async function getVisualizationProjects(): Promise<VisualizationProjectSummary[]> {
  return getPlanningProjects();
}

export async function getSpatialData(projectId: string): Promise<SpatialDataset> {
  await wait(200);
  // Dev-only `?demo=error` mirrors the other services so the error state can be exercised.
  if (getDemoScenario() === "error") throw new Error("The spatial service did not respond. This is a simulated failure for the demo.");
  const [project, plan, detail] = await Promise.all([
    getProject(projectId),
    getPlanningState(projectId),
    getProjectDetails(projectId, "normal").catch(() => null), // created projects may have no detail record yet
  ]);
  if (!project) throw new ProjectNotFoundError(projectId);
  const coordinates = detail?.siteContext.center ?? { lat: 0, lng: 0 };

  const recipe = getSiteInfo(projectId);
  const siteInfo = recipe ?? {
    siteAreaHa: project.siteAreaHa,
    buildings: plan.objects.filter((o) => o.type === "building").length,
    greenCoveragePct: 0,
    roadNetworkKm: 0,
    populationCapacity: 0,
  };

  return buildSpatialDataset(plan, {
    projectName: project.name,
    coordinates,
    siteInfo,
    source:
      plan.source === "local"
        ? { kind: "local-plan", note: "Derived from your locally saved plan (Planning Studio)" }
        : { kind: "demo", note: "Procedurally generated demo site — not survey data" },
  });
}

export async function getSpatialObject(projectId: string, objectId: string): Promise<SpatialObject | null> {
  const data = await getSpatialData(projectId);
  return data.objects.find((o) => o.id === objectId) ?? null;
}

// ---------------------------------------------------------------------------
// Local preferences (view mode, basemap, layers, settings) — per project
// ---------------------------------------------------------------------------

export interface VisualizationPrefs {
  viewMode: ViewMode;
  basemap: BasemapId;
  layers: LayerVisibility;
  settings: VisualizationSettings;
  /** Scenario shown in the viewport (`null` = current plan). */
  scenario: string | null;
}

const BASEMAP_IDS: BasemapId[] = ["urban", "light", "satellite", "terrain"];
const TIMES: VisualizationSettings["timeOfDay"][] = ["morning", "10:00", "14:00", "17:00", "evening"];
const ATMOS: VisualizationSettings["atmosphere"][] = ["clear", "soft-cloud", "hazy"];
const STYLES: VisualizationSettings["buildingStyle"][] = ["simple", "architectural", "height", "land-use"];
const PRESETS: CameraPreset[] = ["reset", "top", "perspective", "fit", "overview", "street", "birds-eye", "site-entrance", "central-district"];
const METRIC_IDS = PRESENTATION_METRICS.map((m) => m.id);
const THEME_IDS = THEMES.map((t) => t.id);

function isBool(x: unknown): x is boolean {
  return typeof x === "boolean";
}
function isNum(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}
function isStr(x: unknown): x is string {
  return typeof x === "string";
}
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function oneOf<T extends string>(x: unknown, list: readonly T[], fallback: T): T {
  return list.includes(x as T) ? (x as T) : fallback;
}

export function sanitizeLayers(raw: unknown): LayerVisibility {
  const layers: LayerVisibility = { ...DEFAULT_LAYERS };
  if (isRecord(raw)) {
    for (const k of Object.keys(layers) as (keyof LayerVisibility)[]) {
      const v = raw[k];
      if (isBool(v)) layers[k] = v;
    }
  }
  return layers;
}

export function sanitizeSettings(raw: unknown): VisualizationSettings {
  const settings: VisualizationSettings = { ...DEFAULT_SETTINGS };
  if (!isRecord(raw)) return settings;
  for (const k of Object.keys(settings) as (keyof VisualizationSettings)[]) {
    const v = raw[k];
    if (k === "sunIntensity" || k === "cameraHeight" || k === "sunPosition") {
      if (isNum(v)) settings[k] = Math.max(0, Math.min(100, v));
    } else if (k === "timeOfDay") settings.timeOfDay = oneOf(v, TIMES, DEFAULT_SETTINGS.timeOfDay);
    else if (k === "atmosphere") settings.atmosphere = oneOf(v, ATMOS, DEFAULT_SETTINGS.atmosphere);
    else if (k === "buildingStyle") settings.buildingStyle = oneOf(v, STYLES, DEFAULT_SETTINGS.buildingStyle);
    else if (isBool(v)) (settings as unknown as Record<string, boolean>)[k] = v;
  }
  return settings;
}

function sanitizePrefs(raw: unknown): VisualizationPrefs | null {
  if (!isRecord(raw)) return null;
  const viewMode: ViewMode = raw.viewMode === "3d" ? "3d" : "2d";
  const basemap: BasemapId = oneOf(raw.basemap, BASEMAP_IDS, "urban");
  return { viewMode, basemap, layers: sanitizeLayers(raw.layers), settings: sanitizeSettings(raw.settings), scenario: isStr(raw.scenario) ? raw.scenario : null };
}

export function loadPrefs(projectId: string): VisualizationPrefs | null {
  try {
    const raw = window.localStorage.getItem(`${PREFS_STORAGE_KEY}.${projectId}`);
    return raw ? sanitizePrefs(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function savePrefs(projectId: string, prefs: VisualizationPrefs): void {
  try {
    window.localStorage.setItem(`${PREFS_STORAGE_KEY}.${projectId}`, JSON.stringify(prefs));
  } catch {
    /* storage unavailable — preferences are session-only */
  }
}

export function rememberLastVisualizedProject(projectId: string): void {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, projectId);
  } catch {
    /* ignore */
  }
}

export function getLastVisualizedProject(): string | null {
  try {
    return window.localStorage.getItem(VIEW_STORAGE_KEY);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Saved views + presentation (local, per project)
// ---------------------------------------------------------------------------

function isPoint(x: unknown): x is { x: number; y: number } {
  return isRecord(x) && isNum(x.x) && isNum(x.y);
}

function isTriple(x: unknown): x is [number, number, number] {
  return Array.isArray(x) && x.length === 3 && x.every(isNum);
}

export function sanitizeCamera(raw: unknown): CameraPose {
  if (isRecord(raw)) {
    if (raw.kind === "2d" && isPoint(raw.center) && isNum(raw.scale)) return { kind: "2d", center: { x: raw.center.x, y: raw.center.y }, scale: Math.max(0.06, Math.min(8, raw.scale)) };
    if (raw.kind === "3d" && isTriple(raw.position) && isTriple(raw.target)) return { kind: "3d", position: [...raw.position], target: [...raw.target] };
    if (raw.kind === "preset") return { kind: "preset", preset: oneOf(raw.preset, PRESETS, "overview") };
  }
  return { kind: "preset", preset: "overview" };
}

export function sanitizeAnnotations(raw: unknown): Annotation[] {
  if (!Array.isArray(raw)) return [];
  const out: Annotation[] = [];
  for (const a of raw) {
    if (!isRecord(a) || !isStr(a.id) || !isStr(a.text) || !isPoint(a.position)) continue;
    const kind = oneOf(a.kind, ["title", "label", "callout", "metric"] as const, "label");
    out.push({ id: a.id, kind, text: a.text.slice(0, 80), detail: isStr(a.detail) ? a.detail.slice(0, 120) : undefined, position: { x: a.position.x, y: a.position.y } });
  }
  return out.slice(0, 24);
}

export function sanitizeMetrics(raw: unknown): PresentationMetricId[] {
  if (!Array.isArray(raw)) return [...DEFAULT_SELECTED_METRICS];
  const ids = raw.filter((m): m is PresentationMetricId => METRIC_IDS.includes(m as PresentationMetricId));
  return Array.from(new Set(ids)).slice(0, 4);
}

export function sanitizePresentationSettings(raw: unknown): PresentationSettings {
  const s: PresentationSettings = { ...DEFAULT_PRESENTATION_SETTINGS };
  if (isRecord(raw)) for (const k of Object.keys(s) as (keyof PresentationSettings)[]) if (isBool(raw[k])) s[k] = raw[k] as boolean;
  return s;
}

function sanitizeView(raw: unknown, projectId: string): PresentationView | null {
  if (!isRecord(raw) || !isStr(raw.id) || !isStr(raw.name)) return null;
  return {
    id: raw.id,
    projectId,
    name: raw.name.slice(0, 60),
    mode: raw.mode === "present" ? "present" : "explore",
    viewMode: raw.viewMode === "3d" ? "3d" : "2d",
    camera: sanitizeCamera(raw.camera),
    scenarioId: isStr(raw.scenarioId) ? raw.scenarioId : null,
    visibleLayers: sanitizeLayers(raw.visibleLayers),
    sceneSettings: sanitizeSettings(raw.sceneSettings),
    basemap: oneOf(raw.basemap, BASEMAP_IDS, "urban"),
    selectedMetrics: sanitizeMetrics(raw.selectedMetrics),
    annotations: sanitizeAnnotations(raw.annotations),
    createdAt: isStr(raw.createdAt) ? raw.createdAt : new Date().toISOString(),
  };
}

function sanitizeSlide(raw: unknown, viewIds: Set<string>, index: number): PresentationSlide | null {
  if (!isRecord(raw) || !isStr(raw.id) || !isStr(raw.title) || !isStr(raw.viewId) || !viewIds.has(raw.viewId)) return null;
  return {
    id: raw.id,
    title: raw.title.slice(0, 80),
    description: isStr(raw.description) ? raw.description.slice(0, 280) : "",
    viewId: raw.viewId,
    scenarioId: isStr(raw.scenarioId) ? raw.scenarioId : null,
    annotations: sanitizeAnnotations(raw.annotations),
    order: isNum(raw.order) ? raw.order : index,
  };
}

function viewsKey(projectId: string) {
  return `${VIEWS_STORAGE_KEY}.${projectId}`;
}
function presentationKey(projectId: string) {
  return `${PRESENTATION_STORAGE_KEY}.${projectId}`;
}

function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Saved views of a project, or `null` when nothing has been saved yet (the hook seeds demo views). */
export async function getSavedViews(projectId: string): Promise<PresentationView[] | null> {
  const raw = readJson(viewsKey(projectId));
  if (!Array.isArray(raw)) return null;
  return raw.map((v) => sanitizeView(v, projectId)).filter((v): v is PresentationView => v !== null);
}

async function writeViews(projectId: string, views: PresentationView[]): Promise<void> {
  writeJson(viewsKey(projectId), views);
}

export async function saveView(projectId: string, view: PresentationView): Promise<PresentationView> {
  const list = (await getSavedViews(projectId)) ?? [];
  const next = list.some((v) => v.id === view.id) ? list.map((v) => (v.id === view.id ? view : v)) : [view, ...list];
  await writeViews(projectId, next);
  return view;
}

export async function updateView(projectId: string, viewId: string, data: Partial<PresentationView>): Promise<PresentationView | null> {
  const list = (await getSavedViews(projectId)) ?? [];
  let updated: PresentationView | null = null;
  const next = list.map((v) => {
    if (v.id !== viewId) return v;
    updated = { ...v, ...data, id: v.id, projectId: v.projectId };
    return updated;
  });
  if (updated) await writeViews(projectId, next);
  return updated;
}

export async function deleteView(projectId: string, viewId: string): Promise<void> {
  const list = (await getSavedViews(projectId)) ?? [];
  await writeViews(
    projectId,
    list.filter((v) => v.id !== viewId)
  );
}

/** Replace the whole list (used after seeding or reordering). */
export async function replaceSavedViews(projectId: string, views: PresentationView[]): Promise<void> {
  await writeViews(projectId, views);
}

export async function getPresentation(projectId: string): Promise<Presentation | null> {
  const raw = readJson(presentationKey(projectId));
  if (!isRecord(raw) || raw.version !== 1) return null;
  const views = Array.isArray(raw.views) ? raw.views.map((v) => sanitizeView(v, projectId)).filter((v): v is PresentationView => v !== null) : [];
  const viewIds = new Set(views.map((v) => v.id));
  const slides = (Array.isArray(raw.slides) ? raw.slides.map((s, i) => sanitizeSlide(s, viewIds, i)).filter((s): s is PresentationSlide => s !== null) : []).sort((a, b) => a.order - b.order).map((s, i) => ({ ...s, order: i }));
  return {
    id: isStr(raw.id) ? raw.id : `pres-${projectId}`,
    projectId,
    title: isStr(raw.title) ? raw.title.slice(0, 80) : "",
    subtitle: isStr(raw.subtitle) ? raw.subtitle.slice(0, 120) : "",
    theme: oneOf(raw.theme, THEME_IDS, "urban" as PresentationTheme),
    views,
    slides,
    settings: sanitizePresentationSettings(raw.settings),
    selectedMetrics: sanitizeMetrics(raw.selectedMetrics),
    annotations: sanitizeAnnotations(raw.annotations),
    updatedAt: isStr(raw.updatedAt) ? raw.updatedAt : new Date().toISOString(),
  };
}

export async function savePresentation(projectId: string, presentation: Presentation): Promise<boolean> {
  return writeJson(presentationKey(projectId), { version: 1, ...presentation, projectId });
}

export function clearPresentation(projectId: string): void {
  try {
    window.localStorage.removeItem(presentationKey(projectId));
    window.localStorage.removeItem(viewsKey(projectId));
  } catch {
    /* ignore */
  }
}

export { ProjectNotFoundError };
