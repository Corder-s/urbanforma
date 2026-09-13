import type { VisualizationProjectSummary } from "../../visualization/services/visualization.service";
import {
  BIM_ISSUES_PREFIX,
  BIM_LAST_PROJECT_KEY,
  BIM_MODELS_PREFIX,
  BIM_PREFS_PREFIX,
  CATEGORIES,
  DEFAULT_LAYERS,
  EMPTY_FILTERS,
  FORMATS,
  PROCESS_STEP_MS,
  UPLOAD_STEP_MS,
} from "../data/bim.data";
import { analysisInputs, deriveElements, estimateModelBytes, versionCounts, type BimIndex } from "../lib/bimModel";
import type { SpatialDataset } from "../../visualization/types/visualization.types";
import type {
  BimAnalysisInput,
  BimCategory,
  BimElement,
  BimFilters,
  BimFormat,
  BimIssue,
  BimIssueSeverity,
  BimIssueStatus,
  BimLayerKey,
  BimLayerVisibility,
  BimMode,
  BimModel,
  BimModelStatus,
  BimModelVersion,
  BimPrefs,
  BimProperty,
  BimSceneMode,
} from "../types/bim.types";

/**
 * BIM service — the seam where a real backend will land.
 *
 * Today every read is local: models are *derived* from the project's spatial
 * dataset (see `lib/bimModel.ts`), issues and preferences live in
 * `localStorage`. The function shapes are the future REST contract:
 *
 *   getBimProjects()      → GET  /api/bim/projects
 *   getModels(projectId)  → GET  /api/bim/projects/:id/models
 *   getElements(model)    → GET  /api/bim/models/:id/elements   (IFC engine)
 *   uploadModel(file)     → POST /api/bim/models (multipart → object storage)
 *   getIssues / createIssue / updateIssue → /api/bim/issues
 *
 * A Java/Spring "BIM Processing Service" (IFC parser + object storage) can
 * replace the bodies one by one without touching a single component.
 *
 * Nothing here fakes success: an uploaded file is measured (name, size, type)
 * and then reported as **failed** with the real reason — no parser is connected.
 */

export type BimProjectSummary = VisualizationProjectSummary;

export { getVisualizationProjects as getBimProjects } from "../../visualization/services/visualization.service";

// ---------------------------------------------------------------------------
// Small persistence helpers (same shape as the other modules)
// ---------------------------------------------------------------------------

const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isBool = (v: unknown): v is boolean => typeof v === "boolean";
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

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

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const MODE_IDS: BimMode[] = ["overview", "model", "coordination", "issues"];
const SEVERITIES: BimIssueSeverity[] = ["low", "medium", "high", "critical"];
const ISSUE_STATUSES: BimIssueStatus[] = ["open", "in-review", "resolved"];
const MODEL_STATUSES: BimModelStatus[] = ["ready", "uploading", "processing", "failed"];
const SCENE_MODES: BimSceneMode[] = ["bim", "city", "combined"];

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return isStr(value) && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

// ---------------------------------------------------------------------------
// Last project
// ---------------------------------------------------------------------------

export function rememberLastBimProject(projectId: string): void {
  writeJson(BIM_LAST_PROJECT_KEY, projectId);
}

export function getLastBimProject(): string | null {
  const raw = readJson(BIM_LAST_PROJECT_KEY);
  return isStr(raw) ? raw : null;
}

// ---------------------------------------------------------------------------
// Sanitisers (never trust storage)
// ---------------------------------------------------------------------------

const CATEGORY_IDS = new Set<string>(CATEGORIES.map((c) => c.id));
function isCategory(value: string): value is BimCategory {
  return CATEGORY_IDS.has(value);
}

function sanitizeFilters(raw: unknown): BimFilters {
  const f: BimFilters = { ...EMPTY_FILTERS };
  if (!isRecord(raw)) return f;
  if (isStr(raw.query)) f.query = raw.query.slice(0, 120);
  const strArray = (v: unknown) => (Array.isArray(v) ? v.filter(isStr).slice(0, 40) : []);
  f.categories = strArray(raw.categories).filter(isCategory);
  f.levels = strArray(raw.levels);
  f.buildings = strArray(raw.buildings);
  f.materials = strArray(raw.materials);
  if (isBool(raw.visibleOnly)) f.visibleOnly = raw.visibleOnly;
  return f;
}

function sanitizeLayers(raw: unknown): BimLayerVisibility {
  const layers: BimLayerVisibility = { ...DEFAULT_LAYERS };
  if (!isRecord(raw)) return layers;
  for (const key of Object.keys(layers) as BimLayerKey[]) if (isBool(raw[key])) layers[key] = raw[key];
  return layers;
}

export function sanitizePrefs(raw: unknown): BimPrefs {
  const prefs: BimPrefs = {
    sceneMode: "combined",
    layers: { ...DEFAULT_LAYERS },
    filters: { ...EMPTY_FILTERS },
    activeModelId: null,
    activeVersionId: null,
    mode: "overview",
  };
  if (!isRecord(raw)) return prefs;
  prefs.sceneMode = oneOf(raw.sceneMode, SCENE_MODES, "combined");
  prefs.mode = oneOf(raw.mode, MODE_IDS, "overview");
  prefs.layers = sanitizeLayers(raw.layers);
  prefs.filters = sanitizeFilters(raw.filters);
  if (isStr(raw.activeModelId)) prefs.activeModelId = raw.activeModelId;
  if (isStr(raw.activeVersionId)) prefs.activeVersionId = raw.activeVersionId;
  return prefs;
}

export function loadPrefs(projectId: string): BimPrefs {
  return sanitizePrefs(readJson(`${BIM_PREFS_PREFIX}${projectId}`));
}

export function savePrefs(projectId: string, prefs: BimPrefs): void {
  writeJson(`${BIM_PREFS_PREFIX}${projectId}`, prefs);
}

function sanitizeVersion(raw: unknown, index: number): BimModelVersion | null {
  if (!isRecord(raw) || !isStr(raw.id)) return null;
  return {
    id: raw.id,
    label: isStr(raw.label) ? raw.label : `v${index + 1}`,
    version: isNum(raw.version) ? raw.version : index + 1,
    createdAt: isStr(raw.createdAt) ? raw.createdAt : new Date().toISOString(),
    status: oneOf(raw.status, MODEL_STATUSES, "ready"),
    changes: Array.isArray(raw.changes) ? raw.changes.filter(isStr).slice(0, 8) : [],
    elementCount: isNum(raw.elementCount) ? raw.elementCount : 0,
    sizeBytes: isNum(raw.sizeBytes) ? raw.sizeBytes : 0,
  };
}

export function sanitizeModel(raw: unknown, projectId: string): BimModel | null {
  if (!isRecord(raw) || !isStr(raw.id) || !isStr(raw.name)) return null;
  const versions = (Array.isArray(raw.versions) ? raw.versions : [])
    .map((v, i) => sanitizeVersion(v, i))
    .filter((v): v is BimModelVersion => v !== null);
  const status = oneOf(raw.status, MODEL_STATUSES, "ready");
  return {
    id: raw.id,
    name: raw.name.slice(0, 120),
    projectId: isStr(raw.projectId) ? raw.projectId : projectId,
    fileName: isStr(raw.fileName) ? raw.fileName.slice(0, 160) : `${raw.id}.ifc`,
    format: oneOf<BimFormat>(raw.format, FORMATS.map((f) => f.id), "IFC"),
    sizeBytes: isNum(raw.sizeBytes) ? raw.sizeBytes : 0,
    version: isStr(raw.version) ? raw.version.slice(0, 12) : "1",
    uploadedAt: isStr(raw.uploadedAt) ? raw.uploadedAt : new Date().toISOString(),
    updatedAt: isStr(raw.updatedAt) ? raw.updatedAt : new Date().toISOString(),
    status,
    source: oneOf(raw.source, ["demo", "local", "upload"] as const, "local"),
    author: isStr(raw.author) ? raw.author.slice(0, 80) : "Unknown",
    schema: isStr(raw.schema) ? raw.schema.slice(0, 40) : "IFC4",
    statusNote: isStr(raw.statusNote) ? raw.statusNote.slice(0, 400) : undefined,
    versions,
    activeVersionId: isStr(raw.activeVersionId) && versions.some((v) => v.id === raw.activeVersionId) ? raw.activeVersionId : (versions[versions.length - 1]?.id ?? ""),
  };
}

function sanitizeIssue(raw: unknown): BimIssue | null {
  if (!isRecord(raw) || !isStr(raw.id) || !isStr(raw.title)) return null;
  const created = isStr(raw.createdAt) ? raw.createdAt : new Date().toISOString();
  return {
    id: raw.id,
    title: raw.title.slice(0, 140),
    description: isStr(raw.description) ? raw.description.slice(0, 1200) : "",
    severity: oneOf(raw.severity, SEVERITIES, "medium"),
    elementIds: Array.isArray(raw.elementIds) ? raw.elementIds.filter(isStr).slice(0, 20) : [],
    status: oneOf(raw.status, ISSUE_STATUSES, "open"),
    location: isStr(raw.location) ? raw.location.slice(0, 140) : "",
    createdAt: created,
    updatedAt: isStr(raw.updatedAt) ? raw.updatedAt : created,
    source: oneOf(raw.source, ["demo", "local"] as const, "local"),
  };
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

export function loadModels(projectId: string): BimModel[] {
  const raw = readJson(`${BIM_MODELS_PREFIX}${projectId}`);
  if (!Array.isArray(raw)) return [];
  return raw.map((m) => sanitizeModel(m, projectId)).filter((m): m is BimModel => m !== null);
}

export function saveModels(projectId: string, models: BimModel[]): void {
  writeJson(`${BIM_MODELS_PREFIX}${projectId}`, models);
}

export function newModelId(): string {
  return `bim-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "model";
}

function daysBefore(iso: string, days: number): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t - days * 86_400_000).toISOString();
}

/**
 * Builds the demo model of a project from its live spatial dataset. The record
 * is labelled `source: "demo"` everywhere it is shown, and its revision history
 * counts come from the derived element set — nothing is invented.
 */
export function buildDemoModel(projectId: string, dataset: SpatialDataset): { model: BimModel; elements: BimElement[] } {
  const id = `bim-demo-${projectId}`;
  const base: BimModel = {
    id,
    name: `${dataset.projectName} — federated model`,
    projectId,
    fileName: `${slugify(dataset.projectName)}.ifc`,
    format: "IFC",
    sizeBytes: 0,
    version: "3",
    uploadedAt: dataset.generatedAtIso,
    updatedAt: dataset.generatedAtIso,
    status: "ready",
    source: "demo",
    author: "UrbanForma derivation",
    schema: "IFC4",
    versions: [],
    activeVersionId: "",
  };
  const elements = deriveElements(dataset, base);
  const counts = versionCounts(elements);
  const versions: BimModelVersion[] = [
    {
      id: `${id}:v1`,
      label: "v1",
      version: 1,
      createdAt: daysBefore(dataset.generatedAtIso, 14),
      status: "ready",
      changes: ["Massing model derived from the planning document", "Site boundary, roads, landscape and GIS context included"],
      elementCount: counts.v1,
      sizeBytes: estimateModelBytes(counts.v1),
    },
    {
      id: `${id}:v2`,
      label: "v2",
      version: 2,
      createdAt: daysBefore(dataset.generatedAtIso, 7),
      status: "ready",
      changes: ["Principal buildings broken down to levels (LOD 300)", "Slabs, facade walls, columns, openings and stairs added"],
      elementCount: counts.v2,
      sizeBytes: estimateModelBytes(counts.v2),
    },
    {
      id: `${id}:v3`,
      label: "v3",
      version: 3,
      createdAt: dataset.generatedAtIso,
      status: "ready",
      changes: ["Roofs and typical-level groups added", "Quantities re-synced with the current project geometry"],
      elementCount: counts.v3,
      sizeBytes: estimateModelBytes(counts.v3),
    },
  ];
  const model: BimModel = {
    ...base,
    sizeBytes: estimateModelBytes(elements.length),
    versions,
    activeVersionId: versions[versions.length - 1].id,
  };
  return { model, elements };
}

/** Models of a project, seeding the demo model when nothing is stored yet. */
export async function getModels(projectId: string, dataset: SpatialDataset | null): Promise<{ models: BimModel[]; seeded: boolean }> {
  const stored = loadModels(projectId);
  const hasDemo = stored.some((m) => m.source === "demo");
  if (hasDemo || !dataset) return { models: stored, seeded: false };
  const { model } = buildDemoModel(projectId, dataset);
  const models = [model, ...stored];
  saveModels(projectId, models);
  return { models, seeded: true };
}

export function getActiveModel(models: BimModel[], preferredId: string | null): BimModel | null {
  if (models.length === 0) return null;
  const preferred = models.find((m) => m.id === preferredId && m.status === "ready");
  return preferred ?? models.find((m) => m.status === "ready") ?? models[0];
}

/** Elements of a model: derived from the live dataset, or empty when it is not usable. */
export function getElements(model: BimModel | null, dataset: SpatialDataset | null): BimElement[] {
  if (!model || !dataset || model.status !== "ready") return [];
  if (model.source === "demo") return deriveElements(dataset, model);
  // A locally registered upload has no parsed geometry — that is the truth.
  return [];
}

export function activeVersion(model: BimModel): BimModelVersion | null {
  return model.versions.find((v) => v.id === model.activeVersionId) ?? model.versions[model.versions.length - 1] ?? null;
}

/** Appends a revision to a model (used by "sync with project geometry"). */
export function createRevision(model: BimModel, elementCount: number, changes: string[]): BimModel {
  const version = model.versions.length + 1;
  const now = new Date().toISOString();
  const revision: BimModelVersion = {
    id: `${model.id}:v${version}`,
    label: `v${version}`,
    version,
    createdAt: now,
    status: "ready",
    changes,
    elementCount,
    sizeBytes: estimateModelBytes(elementCount),
  };
  return {
    ...model,
    version: String(version),
    updatedAt: now,
    sizeBytes: revision.sizeBytes,
    versions: [...model.versions, revision],
    activeVersionId: revision.id,
  };
}

export function updateModel(projectId: string, modelId: string, patch: Partial<BimModel>): BimModel[] {
  const models = loadModels(projectId).map((m) => (m.id === modelId ? { ...m, ...patch, id: m.id, projectId } : m));
  saveModels(projectId, models);
  return models;
}

export function deleteModel(projectId: string, modelId: string): BimModel[] {
  const models = loadModels(projectId).filter((m) => m.id !== modelId);
  saveModels(projectId, models);
  return models;
}

// ---------------------------------------------------------------------------
// Upload — honest local choreography (no parser, no fake success)
// ---------------------------------------------------------------------------

export interface UploadInput {
  fileName: string;
  sizeBytes: number;
  lastModified: number;
}

export function formatFromFileName(fileName: string): BimFormat | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".ifc")) return "IFC";
  if (lower.endsWith(".rvt")) return "RVT";
  if (lower.endsWith(".glb")) return "GLB";
  if (lower.endsWith(".gltf")) return "GLTF";
  return null;
}

export interface UploadResult {
  model: BimModel;
  /** Human-readable outcome — always shown, never hidden behind a spinner. */
  note: string;
}

/**
 * Registers a local file as a model record and runs the honest pipeline:
 * uploading → processing → **failed**, because no BIM processing service is
 * connected in this release. The file's real metadata is kept so the record is
 * useful (name, size, format, timestamp); its geometry is never pretended to be
 * parsed, and no element is invented from it.
 */
export async function uploadModel(projectId: string, input: UploadInput, onStage?: (model: BimModel) => void): Promise<UploadResult> {
  const id = newModelId();
  const format = formatFromFileName(input.fileName);
  const now = new Date(input.lastModified || Date.now()).toISOString();
  const record: BimModel = {
    id,
    name: input.fileName.replace(/\.[^.]+$/, "").slice(0, 120) || input.fileName,
    projectId,
    fileName: input.fileName,
    format: format ?? "IFC",
    sizeBytes: input.sizeBytes,
    version: "1",
    uploadedAt: now,
    updatedAt: new Date().toISOString(),
    status: "uploading",
    source: "upload",
    author: "Local upload",
    schema: format ? (FORMATS.find((f) => f.id === format)?.schema ?? "IFC4") : "Unknown",
    versions: [],
    activeVersionId: "",
  };

  if (input.sizeBytes <= 0) {
    const failedModel = finishFailed(record, "The selected file is empty (0 bytes).");
    onStage?.(failedModel);
    return { model: failedModel, note: failedModel.statusNote ?? "" };
  }
  if (!format) {
    const failedModel = finishFailed(record, `Unsupported file type. Expected ${FORMATS.map((f) => f.extension).join(", ")}.`);
    onStage?.(failedModel);
    return { model: failedModel, note: failedModel.statusNote ?? "" };
  }

  onStage?.(record);
  await wait(UPLOAD_STEP_MS);
  const processing: BimModel = { ...record, status: "processing", updatedAt: new Date().toISOString() };
  onStage?.(processing);
  await wait(PROCESS_STEP_MS);

  const failedModel = finishFailed(
    processing,
    "No BIM processing service is connected in this release. The file was read in the browser (name, size, type) but its geometry was not parsed — connect the Java/Spring BIM service to process it."
  );
  onStage?.(failedModel);
  return { model: failedModel, note: failedModel.statusNote ?? "" };
}

function finishFailed(model: BimModel, note: string): BimModel {
  const now = new Date().toISOString();
  const failedVersion: BimModelVersion = {
    id: `${model.id}:v1`,
    label: "v1",
    version: 1,
    createdAt: now,
    status: "failed",
    changes: ["Import attempted in the browser", note],
    elementCount: 0,
    sizeBytes: model.sizeBytes,
  };
  return { ...model, status: "failed", statusNote: note, updatedAt: now, versions: [failedVersion], activeVersionId: failedVersion.id };
}

/** Persists a model record (created or updated by the upload flow). */
export function persistModel(projectId: string, model: BimModel): BimModel[] {
  const models = loadModels(projectId);
  const next = models.some((m) => m.id === model.id) ? models.map((m) => (m.id === model.id ? model : m)) : [model, ...models];
  saveModels(projectId, next);
  return next;
}

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

export function loadIssues(projectId: string): BimIssue[] | null {
  const raw = readJson(`${BIM_ISSUES_PREFIX}${projectId}`);
  if (!Array.isArray(raw)) return null;
  return raw.map((i) => sanitizeIssue(i)).filter((i): i is BimIssue => i !== null);
}

export function saveIssues(projectId: string, issues: BimIssue[]): void {
  writeJson(`${BIM_ISSUES_PREFIX}${projectId}`, issues);
}

export interface NewIssueInput {
  title: string;
  description: string;
  severity: BimIssueSeverity;
  elementIds: string[];
  location: string;
}

export function createIssue(projectId: string, input: NewIssueInput): BimIssue[] {
  const now = new Date().toISOString();
  const issue: BimIssue = {
    id: `issue-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: input.title.trim().slice(0, 140) || "Untitled issue",
    description: input.description.trim().slice(0, 1200),
    severity: input.severity,
    elementIds: input.elementIds.slice(0, 20),
    status: "open",
    location: input.location.trim().slice(0, 140),
    createdAt: now,
    updatedAt: now,
    source: "local",
  };
  const issues = [issue, ...(loadIssues(projectId) ?? [])];
  saveIssues(projectId, issues);
  return issues;
}

export function updateIssue(projectId: string, issueId: string, patch: Partial<Pick<BimIssue, "title" | "description" | "severity" | "status" | "elementIds" | "location">>): BimIssue[] {
  const issues = (loadIssues(projectId) ?? []).map((i) =>
    i.id === issueId ? { ...i, ...patch, id: i.id, updatedAt: new Date().toISOString() } : i
  );
  saveIssues(projectId, issues);
  return issues;
}

export function deleteIssue(projectId: string, issueId: string): BimIssue[] {
  const issues = (loadIssues(projectId) ?? []).filter((i) => i.id !== issueId);
  saveIssues(projectId, issues);
  return issues;
}

// ---------------------------------------------------------------------------
// Report seam (Step 16 §16 — the BIM section reads this, nothing else)
// ---------------------------------------------------------------------------

export interface BimReportSummary {
  modelName: string;
  fileName: string;
  format: BimFormat;
  schema: string;
  version: string;
  status: BimModelStatus;
  source: BimModel["source"];
  updatedAt: string;
  elements: number;
  buildings: number;
  detailedBuildings: number;
  levels: number;
  grossFloorAreaM2: number;
  volumeM3: number;
  footprintM2: number;
  roadLengthM: number;
  landscapeM2: number;
  openIssues: number;
  /** True when no model could be derived (no dataset / failed import only). */
  unavailable: boolean;
}

/** Snapshot for the report document — computed on demand, never cached stale. */
export async function getBimReportSummary(projectId: string, dataset: SpatialDataset | null): Promise<BimReportSummary | null> {
  let models = loadModels(projectId);
  if (models.length === 0 && dataset) {
    models = (await getModels(projectId, dataset)).models;
  }
  const model = getActiveModel(models, null);
  const issues = await getIssues(projectId);
  const openIssues = issues.filter((i) => i.status !== "resolved").length;
  if (!model || !dataset) {
    return {
      modelName: "No model available",
      fileName: "—",
      format: "IFC",
      schema: "—",
      version: "—",
      status: "failed",
      source: "local",
      updatedAt: new Date().toISOString(),
      elements: 0,
      buildings: 0,
      detailedBuildings: 0,
      levels: 0,
      grossFloorAreaM2: 0,
      volumeM3: 0,
      footprintM2: 0,
      roadLengthM: 0,
      landscapeM2: 0,
      openIssues,
      unavailable: true,
    };
  }
  // Imported lazily so the report bundle does not pull the whole BIM module.
  const { buildIndex, computeQuantities } = await import("../lib/bimModel");
  const quantities = computeQuantities(buildIndex(getElements(model, dataset)));
  return {
    modelName: model.name,
    fileName: model.fileName,
    format: model.format,
    schema: model.schema,
    version: model.version,
    status: model.status,
    source: model.source,
    updatedAt: model.updatedAt,
    elements: quantities.elements,
    buildings: quantities.buildings,
    detailedBuildings: quantities.detailedBuildings,
    levels: quantities.levels,
    grossFloorAreaM2: quantities.grossFloorAreaM2,
    volumeM3: quantities.volumeM3,
    footprintM2: quantities.footprintM2,
    roadLengthM: quantities.roadLengthM,
    landscapeM2: Math.round(quantities.landscapeM2),
    openIssues,
    unavailable: false,
  };
}

// ---------------------------------------------------------------------------
// The service surface the UI calls — named for the future REST contract
//
//   React → bimService → Java/Spring Boot → BIM processing service
//         → IFC/BIM engine → object storage
//
// Each function is local today (a derived element index plus `localStorage`)
// and maps 1:1 onto an endpoint, so replacing the bodies with `fetch` calls
// does not change a single call site. `getModels`, `getElements`,
// `createIssue`, `updateIssue` and `uploadModel` live above; these complete the
// set.
// ---------------------------------------------------------------------------

/** `GET /api/projects/:projectId/bim/models/:modelId` — one model record. */
export async function getModel(
  projectId: string,
  modelId: string,
  dataset: SpatialDataset | null
): Promise<BimModel | null> {
  const { models } = await getModels(projectId, dataset);
  return models.find((m) => m.id === modelId) ?? null;
}

/** `GET /api/projects/:projectId/bim/elements/:elementId` — one element of the index. */
export function getElement(index: BimIndex | null, elementId: string): BimElement | null {
  return index?.byId.get(elementId) ?? null;
}

/** `GET /api/projects/:projectId/bim/elements/:elementId/properties` — the element's property sets. */
export function getProperties(element: BimElement | null): BimProperty[] {
  return element?.properties ?? [];
}

/** `GET /api/projects/:projectId/bim/issues` — stored issues (empty when none were raised). */
export async function getIssues(projectId: string): Promise<BimIssue[]> {
  return loadIssues(projectId) ?? [];
}

/**
 * `GET /api/projects/:projectId/bim/elements?q=` — element search.
 *
 * Re-exported from the derivation lib so callers go through the service: the
 * query runs against an index built once per model, never per keystroke.
 */
export { searchElements } from "../lib/bimModel";

/**
 * The BIM → Analysis payload: per-building height, footprint, floor area,
 * volume and (where modelled) facade and roof surfaces. Reference data only —
 * the Step 13 engine is untouched and still computes from planning geometry.
 */
export function getBimAnalysisInputs(index: BimIndex): BimAnalysisInput[] {
  return analysisInputs(index);
}
