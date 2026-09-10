import { getProject, ProjectNotFoundError } from "../../projects/project.service";
import type { Project } from "../../projects/project.types";
import { buildBlankSite, buildDemoDocument, DEFAULT_LAYERS, getRecipe, PLANNING_RECIPES } from "../data/planning.data";
import type {
  ContextLayerKey,
  LayerVisibility,
  PlanningDocument,
  PlanningObject,
  PlanningSavePayload,
} from "../types/planning.types";

/**
 * Planning service — the only module the studio talks to for documents.
 *
 *   getPlanningState(projectId)        → future GET /api/projects/:id/plan
 *   savePlanningState(projectId, doc)  → future PUT /api/projects/:id/plan
 *
 * Today: demo documents generated from `planning.data.ts`, with the user's
 * local edits persisted in localStorage so a reload restores their work.
 */

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const PLAN_STORAGE_PREFIX = "urbanforma.plan.";
export const LAST_PROJECT_KEY = "urbanforma.plan.lastProjectId";

export function planStorageKey(projectId: string): string {
  return `${PLAN_STORAGE_PREFIX}${projectId}`;
}

export interface PlanningProjectSummary {
  id: string;
  name: string;
  location: string;
  status: Project["status"];
}

/** Projects that can be opened in the studio (demo recipes ∪ known projects). */
export async function getPlanningProjects(): Promise<PlanningProjectSummary[]> {
  await wait(120);
  const recipeIds = new Set(PLANNING_RECIPES.map((r) => r.projectId));
  const known = await Promise.all(PLANNING_RECIPES.map((r) => getProject(r.projectId)));
  const list: PlanningProjectSummary[] = PLANNING_RECIPES.map((r, i) => {
    const p = known[i];
    return { id: r.projectId, name: p?.name ?? r.name, location: p?.location ?? "", status: p?.status ?? "Planning" };
  });
  return list.filter((p) => recipeIds.has(p.id) && p.status !== "Archived");
}

// ---------------------------------------------------------------------------
// Local persistence helpers
// ---------------------------------------------------------------------------

const OBJECT_TYPES = new Set<PlanningObject["type"]>([
  "building", "road", "path", "parking", "public-space", "green", "tree-zone", "water", "parcel", "label", "measure",
]);

function isObject(x: unknown): x is PlanningObject {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.type === "string" && OBJECT_TYPES.has(o.type as PlanningObject["type"]) && typeof o.x === "number" && typeof o.y === "number";
}

function readSaved(projectId: string): PlanningSavePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(planStorageKey(projectId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const p = parsed as Record<string, unknown>;
    if (p.version !== 1 || p.projectId !== projectId || !Array.isArray(p.objects) || typeof p.savedAtIso !== "string") return null;
    const objects = (p.objects as unknown[]).filter(isObject);
    const layers = sanitizeLayers(p.layers);
    return { version: 1, projectId, objects, layers, savedAtIso: p.savedAtIso };
  } catch {
    return null;
  }
}

function sanitizeLayers(raw: unknown): LayerVisibility {
  const out: LayerVisibility = { ...DEFAULT_LAYERS };
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Record<string, unknown>;
  (Object.keys(out) as ContextLayerKey[]).forEach((k) => {
    if (typeof r[k] === "boolean") out[k] = r[k] as boolean;
  });
  return out;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load the planning document for a project.
 * Resolution order: locally saved edits → demo document → blank site for
 * projects that exist but have no demo plan (e.g. user-created ones).
 * Throws ProjectNotFoundError when the project id is unknown.
 */
export async function getPlanningState(projectId: string): Promise<PlanningDocument> {
  await wait(650);
  const project = await getProject(projectId);
  const demo = buildDemoDocument(projectId);
  if (!project && !demo) throw new ProjectNotFoundError(projectId);

  const base: PlanningDocument =
    demo ??
    {
      projectId,
      site: buildBlankSite(project?.siteAreaHa ?? 10),
      objects: [],
      layers: { ...DEFAULT_LAYERS },
      savedAtIso: null,
      source: "demo",
    };

  const saved = readSaved(projectId);
  if (saved) {
    return { ...base, objects: saved.objects, layers: saved.layers, savedAtIso: saved.savedAtIso, source: "local" };
  }
  return base;
}

/** Persist the document locally (future PUT /api/projects/:id/plan). */
export async function savePlanningState(projectId: string, doc: Pick<PlanningDocument, "objects" | "layers">): Promise<string> {
  await wait(500);
  const payload: PlanningSavePayload = {
    version: 1,
    projectId,
    objects: doc.objects,
    layers: doc.layers,
    savedAtIso: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(planStorageKey(projectId), JSON.stringify(payload));
  } catch {
    throw new Error("Unable to save locally — storage is unavailable.");
  }
  return payload.savedAtIso;
}

/** Forget local edits so the demo document is used again. */
export function discardLocalPlan(projectId: string): void {
  try {
    window.localStorage.removeItem(planStorageKey(projectId));
  } catch {
    /* ignore */
  }
}

export function hasLocalPlan(projectId: string): boolean {
  return readSaved(projectId) !== null;
}

export function rememberLastProject(projectId: string): void {
  try {
    window.localStorage.setItem(LAST_PROJECT_KEY, projectId);
  } catch {
    /* ignore */
  }
}

export function getLastProjectId(): string | null {
  try {
    return window.localStorage.getItem(LAST_PROJECT_KEY);
  } catch {
    return null;
  }
}

/** Headline site metrics for the inspector (demo values from the recipe). */
export function getSiteInfo(projectId: string) {
  return getRecipe(projectId)?.siteInfo ?? null;
}

export { ProjectNotFoundError };
