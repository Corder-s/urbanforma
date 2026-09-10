import {
  MapPinned,
  Activity,
  Building2,
  FileText,
  FolderPlus,
} from "lucide-react";
import { DEV_PROJECTS, PROJECT_LOCATIONS } from "./data/projects.data";
import { DEV_PROJECT_DETAILS, buildCreatedProjectDetail } from "./data/project-details.data";
import type {
  AreaUnit,
  CreateProjectErrors,
  CreateProjectFormValues,
  CreateProjectInput,
  DashboardData,
  DevelopmentDensity,
  DistanceUnit,
  PlanningPriority,
  Project,
  ProjectDetail,
  ProjectSort,
  ProjectStatus,
  ProjectType,
  SustainabilityGoal,
  UpdatedFilter,
} from "./project.types";

/**
 * Projects data service.
 *
 * This is the seam the future backend plugs into:
 *
 *   React UI → GET /api/projects  (Java Spring Boot) → PostgreSQL / PostGIS
 *
 * Today it returns development demo data with a simulated latency so loading
 * states are exercised. No page fetches data directly — everything calls this
 * service, so swapping in real API calls later is a one-file change.
 */

export type DashboardScenario = "normal" | "empty" | "error";

/** Dev-only: read an optional ?demo=<normal|empty|error|loading> scenario. */
export function getDemoScenario(): DashboardScenario | "loading" {
  if (typeof window === "undefined") return "normal";
  const v = new URLSearchParams(window.location.search).get("demo");
  if (v === "empty" || v === "error" || v === "loading") return v;
  return "normal";
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --- Local project store -----------------------------------------------------
//
// Projects created in this session are appended here so they show up in the
// Projects list, the dashboard and Project Details exactly like the seeded
// demo projects. When the backend lands, this store disappears and every
// function below becomes a thin fetch wrapper (same signatures).

const createdProjects: Project[] = [];
const createdDetails: Record<string, ProjectDetail> = {};

/** All projects visible to the app: newest user-created first, then demo data. */
function allProjects(): Project[] {
  return [...createdProjects, ...DEV_PROJECTS];
}

/** Format a hectare value for display: 51 → "51.0 ha", 9.4 → "9.4 ha". */
export function formatSiteArea(ha: number): string {
  return `${ha.toFixed(1)} ha`;
}

/** Fetch all projects (dev data today; GET /api/projects in the future). */
export async function getProjects(scenario?: DashboardScenario): Promise<Project[]> {
  const mode = scenario ?? getDemoScenario();
  await wait(650);
  if (mode === "error") throw new Error("Unable to load projects.");
  if (mode === "empty") return [];
  return allProjects();
}

/** Fetch a single project by id (GET /api/projects/:id in the future). */
export async function getProject(id: string): Promise<Project | null> {
  await wait(350);
  return allProjects().find((p) => p.id === id) ?? null;
}

/** Thrown by getProjectDetails when no project exists for the id (→ 404 later). */
export class ProjectNotFoundError extends Error {
  constructor(public readonly projectId: string) {
    super(`Project "${projectId}" was not found.`);
    this.name = "ProjectNotFoundError";
  }
}

/**
 * Fetch the full detail record for the Project Details page.
 *
 * Future: GET /api/projects/:id → 200 ProjectDetail | 404 → ProjectNotFoundError.
 * Today it resolves from local demo data with a short simulated latency. The
 * optional `?demo=error` query (dev only) simulates a failed request.
 */
export async function getProjectDetails(projectId: string, scenario?: DashboardScenario): Promise<ProjectDetail> {
  const mode = scenario ?? getDemoScenario();
  await wait(550);
  if (mode === "error") throw new Error("Unable to load this project.");
  const detail = createdDetails[projectId] ?? DEV_PROJECT_DETAILS[projectId];
  if (!detail) throw new ProjectNotFoundError(projectId);
  return detail;
}

/** Format an ISO date for display, e.g. "12 Mar 2026". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Format a whole number with thousands separators, e.g. 12480 → "12,480". */
export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/** Format WGS84 coordinates, e.g. "28.4595° N, 77.0266° E" ("Not set" for an unset 0,0 centre). */
export function formatCoordinates(center: { lat: number; lng: number }): string {
  if (center.lat === 0 && center.lng === 0) return "Not set";
  const lat = `${Math.abs(center.lat).toFixed(4)}° ${center.lat >= 0 ? "N" : "S"}`;
  const lng = `${Math.abs(center.lng).toFixed(4)}° ${center.lng >= 0 ? "E" : "W"}`;
  return `${lat}, ${lng}`;
}

export { PROJECT_LOCATIONS };

export const PROJECT_STATUSES: ProjectStatus[] = [
  "Planning",
  "Analysis",
  "Optimization",
  "Completed",
  "Archived",
];

/** Project types offered when creating a project (also drives the type filter). */
export const PROJECT_TYPES: ProjectType[] = [
  "Residential",
  "Commercial",
  "Mixed Use",
  "Industrial",
  "Institutional",
  "Public Space",
  "Urban Redevelopment",
  "Smart City District",
];

/** Legacy kinds used by the seeded demo projects (kept for the type filter). */
export const LEGACY_PROJECT_TYPES: ProjectType[] = [
  "Masterplan",
  "Site Planning",
  "Urban Design",
  "Development",
];

/** Every type a project can have — used by the Projects list filter. */
export const ALL_PROJECT_TYPES: ProjectType[] = [...PROJECT_TYPES, ...LEGACY_PROJECT_TYPES];

export const SORT_OPTIONS: { value: ProjectSort; label: string }[] = [
  { value: "recent", label: "Recently Updated" },
  { value: "name", label: "Name" },
  { value: "progress", label: "Progress" },
  { value: "siteArea", label: "Site Area" },
  { value: "created", label: "Created Date" },
];

/** Pure, testable client-side filtering + sorting used by the Projects page. */
export function filterAndSortProjects(
  projects: Project[],
  opts: {
    query: string;
    status: string; // "all" | ProjectStatus
    type: string; // "all" | ProjectType
    location: string; // "all" | location
    updated: UpdatedFilter;
    sort: ProjectSort;
  }
): Project[] {
  const q = opts.query.trim().toLowerCase();
  const now = Date.now();
  const windowMs: Record<Exclude<UpdatedFilter, "anytime">, number> = {
    today: 24 * 3_600_000,
    week: 7 * 24 * 3_600_000,
    month: 30 * 24 * 3_600_000,
  };

  const result = projects.filter((p) => {
    if (opts.status !== "all" && p.status !== opts.status) return false;
    if (opts.type !== "all" && p.type !== opts.type) return false;
    if (opts.location !== "all" && p.location !== opts.location) return false;
    if (opts.updated !== "anytime") {
      const age = now - new Date(p.updatedAtIso).getTime();
      if (age > windowMs[opts.updated]) return false;
    }
    if (q) {
      const hay = `${p.name} ${p.location} ${p.description}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const sorters: Record<ProjectSort, (a: Project, b: Project) => number> = {
    recent: (a, b) => +new Date(b.updatedAtIso) - +new Date(a.updatedAtIso),
    name: (a, b) => a.name.localeCompare(b.name),
    progress: (a, b) => b.progress - a.progress,
    siteArea: (a, b) => b.siteAreaHa - a.siteAreaHa,
    created: (a, b) => +new Date(b.createdAtIso) - +new Date(a.createdAtIso),
  };
  return [...result].sort(sorters[opts.sort]);
}

// --- Dashboard data (home page) -------------------------------------------------

const STAGES = [
  { key: "site", label: "Site", state: "done" as const },
  { key: "context", label: "Context", state: "done" as const },
  { key: "planning", label: "Planning", state: "done" as const },
  { key: "buildings", label: "Buildings", state: "current" as const },
  { key: "transport", label: "Transport", state: "upcoming" as const },
  { key: "landscape", label: "Landscape", state: "upcoming" as const },
  { key: "analysis", label: "Analysis", state: "upcoming" as const },
  { key: "optimization", label: "Optimization", state: "upcoming" as const },
  { key: "visualization", label: "Visualization", state: "upcoming" as const },
  { key: "bim", label: "BIM", state: "upcoming" as const },
];

const EMPTY_DASHBOARD: DashboardData = {
  featured: null,
  recent: [],
  portfolio: { activeProjects: 0, totalSiteArea: "0 ha", projectsInPlanning: 0, completedProjects: 0 },
  activity: [],
  attention: [],
  stages: [],
};

/** Load the Home/Dashboard data. Throws on an error scenario so callers show the error state. */
export async function loadDashboard(scenario?: DashboardScenario): Promise<DashboardData> {
  const mode = scenario ?? getDemoScenario();
  await wait(900);
  if (mode === "error") throw new Error("Unable to load workspace data.");
  if (mode === "empty") return EMPTY_DASHBOARD;

  const projects = allProjects();
  const featured = projects.find((p) => p.id === "smart-city-masterplan") ?? projects[0];
  const recent = projects.filter((p) => p.status !== "Archived").slice(0, 5);
  const active = projects.filter((p) => p.status !== "Archived");
  const totalHa = active.reduce((sum, p) => sum + p.siteAreaHa, 0);

  return {
    featured,
    recent,
    portfolio: {
      activeProjects: active.length,
      totalSiteArea: formatSiteArea(totalHa),
      projectsInPlanning: active.filter((p) => p.status === "Planning").length,
      completedProjects: projects.filter((p) => p.status === "Completed").length,
    },
    activity: [
      { id: "a1", label: "Site boundary updated", time: "12 minutes ago", icon: MapPinned, tone: "blue" },
      { id: "a2", label: "Environmental analysis completed", time: "35 minutes ago", icon: Activity, tone: "green" },
      { id: "a3", label: "Residential zone modified", time: "2 hours ago", icon: Building2, tone: "teal" },
      { id: "a4", label: "New project created", time: "Yesterday", icon: FolderPlus, tone: "blue" },
      { id: "a5", label: "BIM export completed", time: "Yesterday", icon: FileText, tone: "amber" },
    ],
    attention: [
      {
        id: "t1",
        title: "Environmental analysis ready",
        text: "Your latest site analysis for Smart City Masterplan is ready to review.",
        actionLabel: "Review Analysis",
        to: "/app/analysis",
      },
      {
        id: "t2",
        title: "BIM export ready",
        text: "Your latest export package for Riverside Quarter is available.",
        actionLabel: "View Export",
        to: "/app/reports",
      },
    ],
    stages: STAGES,
  };
}

/** Greeting based on local time: Good morning / Good afternoon / Good evening. */
export function greeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// --- Create Project ---------------------------------------------------------------

export const AREA_UNITS: { value: AreaUnit; label: string; short: string }[] = [
  { value: "ha", label: "Hectares", short: "ha" },
  { value: "m2", label: "Square meters", short: "m²" },
  { value: "km2", label: "Square kilometers", short: "km²" },
];
export const DISTANCE_UNITS: { value: DistanceUnit; label: string }[] = [
  { value: "m", label: "Meters" },
  { value: "km", label: "Kilometers" },
];
export const DENSITIES: DevelopmentDensity[] = ["Low", "Medium", "High"];
export const PLANNING_PRIORITIES: PlanningPriority[] = [
  "Balanced Development",
  "Sustainability",
  "Mobility",
  "Housing",
  "Economic Development",
  "Public Realm",
];
export const SUSTAINABILITY_GOALS: SustainabilityGoal[] = ["Standard", "Enhanced", "High Sustainability"];

export const EMPTY_CREATE_FORM: CreateProjectFormValues = {
  name: "",
  description: "",
  type: "",
  location: "",
  siteArea: "",
  areaUnit: "ha",
  latitude: "",
  longitude: "",
  targetPopulation: "",
  density: "Medium",
  planningPriority: "Balanced Development",
  sustainabilityGoal: "Standard",
  distanceUnit: "m",
};

/** Convert an area in any supported unit to hectares (canonical storage unit). */
export function toHectares(value: number, unit: AreaUnit): number {
  if (unit === "m2") return value / 10_000;
  if (unit === "km2") return value * 100;
  return value;
}

/** Convert hectares to square meters (derived display value). */
export function hectaresToSquareMeters(ha: number): number {
  return ha * 10_000;
}

/** Parse a numeric text field; returns null when empty or not a finite number. */
export function parseNumber(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Validate the Create Project form. Pure — returns a map of field → message.
 * Mirrors the rules the backend will enforce so errors match later on.
 */
export function validateCreateProject(v: CreateProjectFormValues): CreateProjectErrors {
  const errors: CreateProjectErrors = {};
  const name = v.name.trim();
  if (!name) errors.name = "Project name is required.";
  else if (name.length < 3) errors.name = "Project name must be at least 3 characters.";
  else if (name.length > 80) errors.name = "Project name must be 80 characters or fewer.";

  if (!v.type) errors.type = "Select a project type.";
  if (!v.location.trim()) errors.location = "Location is required.";

  const area = parseNumber(v.siteArea);
  if (v.siteArea.trim() === "") errors.siteArea = "Site area is required.";
  else if (area === null) errors.siteArea = "Enter a valid number.";
  else if (area <= 0) errors.siteArea = "Site area must be greater than 0.";

  const lat = parseNumber(v.latitude);
  if (v.latitude.trim() !== "" && (lat === null || lat < -90 || lat > 90)) errors.latitude = "Latitude must be between -90 and 90.";
  const lng = parseNumber(v.longitude);
  if (v.longitude.trim() !== "" && (lng === null || lng < -180 || lng > 180)) errors.longitude = "Longitude must be between -180 and 180.";
  if ((v.latitude.trim() === "") !== (v.longitude.trim() === "")) {
    const key = v.latitude.trim() === "" ? "latitude" : "longitude";
    errors[key] = errors[key] ?? "Enter both latitude and longitude, or leave both empty.";
  }

  const pop = parseNumber(v.targetPopulation);
  if (v.targetPopulation.trim() !== "" && (pop === null || pop < 0 || !Number.isInteger(pop))) {
    errors.targetPopulation = "Enter a whole number of people.";
  }
  return errors;
}

/** Build the typed payload from validated form values. */
export function toCreateProjectInput(v: CreateProjectFormValues): CreateProjectInput {
  const lat = parseNumber(v.latitude);
  const lng = parseNumber(v.longitude);
  const pop = parseNumber(v.targetPopulation);
  return {
    name: v.name.trim(),
    description: v.description.trim(),
    type: v.type as ProjectType,
    location: v.location.trim(),
    siteArea: parseNumber(v.siteArea) ?? 0,
    areaUnit: v.areaUnit,
    latitude: lat ?? undefined,
    longitude: lng ?? undefined,
    targetPopulation: pop ?? undefined,
    density: v.density,
    planningPriority: v.planningPriority,
    sustainabilityGoal: v.sustainabilityGoal,
    distanceUnit: v.distanceUnit,
  };
}

/** URL-safe id from the name, made unique against existing projects. */
function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "project";
  const taken = new Set(allProjects().map((p) => p.id));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

/**
 * Create a project. Future: POST /api/projects → 201 Project.
 * Today it builds the record locally (status "Planning", progress 0), stores it
 * in the session store so it appears in Projects / Details, and resolves it.
 */
export async function createProject(
  input: CreateProjectInput,
  owner: { name: string; role: string; email: string }
): Promise<Project> {
  await wait(800);
  const nowIso = new Date().toISOString();
  const project: Project = {
    id: slugify(input.name),
    name: input.name,
    location: input.location,
    description: input.description || `${input.type} project in ${input.location}.`,
    type: input.type,
    status: "Planning",
    siteAreaHa: toHectares(input.siteArea, input.areaUnit),
    progress: 0,
    updatedAt: "Just now",
    updatedAtIso: nowIso,
    createdAtIso: nowIso,
    stage: "Site & Context",
    thumbVariant: createdProjects.length % 5,
    env: { heat: "—", sunlight: "—", wind: "—", greenCoverage: "—", carbon: "—", score: 0 },
    preferences: {
      targetPopulation: input.targetPopulation,
      density: input.density,
      planningPriority: input.planningPriority,
      sustainabilityGoal: input.sustainabilityGoal,
      areaUnit: input.areaUnit,
      distanceUnit: input.distanceUnit,
    },
    center:
      input.latitude !== undefined && input.longitude !== undefined
        ? { lat: input.latitude, lng: input.longitude }
        : undefined,
  };
  createdProjects.unshift(project);
  createdDetails[project.id] = buildCreatedProjectDetail(project, owner);
  return project;
}

// --- Drafts (localStorage; replaced by a backend draft endpoint later) --------

export const CREATE_PROJECT_DRAFT_KEY = "urbanforma.createProject.draft";

export interface CreateProjectDraft {
  values: CreateProjectFormValues;
  savedAtIso: string;
}

function isDraftShape(x: unknown): x is { values: Record<string, unknown>; savedAtIso: string } {
  if (!x || typeof x !== "object") return false;
  const d = x as Record<string, unknown>;
  return typeof d.savedAtIso === "string" && !!d.values && typeof d.values === "object";
}

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;

/**
 * Coerce whatever is in storage into a well-formed form state: free-text
 * fields become strings, enum fields fall back to defaults when the stored
 * value is unknown, and missing keys take the empty-form value. A draft can
 * therefore never crash the form, even if it was saved by an older build or
 * edited by hand.
 */
function sanitizeDraftValues(raw: Record<string, unknown>): CreateProjectFormValues {
  const e = EMPTY_CREATE_FORM;
  return {
    name: str(raw.name),
    description: str(raw.description),
    type: oneOf<ProjectType | "">(raw.type, ["", ...PROJECT_TYPES, ...LEGACY_PROJECT_TYPES], ""),
    location: str(raw.location),
    siteArea: str(raw.siteArea),
    areaUnit: oneOf(raw.areaUnit, AREA_UNITS.map((u) => u.value), e.areaUnit),
    latitude: str(raw.latitude),
    longitude: str(raw.longitude),
    targetPopulation: str(raw.targetPopulation),
    density: oneOf(raw.density, DENSITIES, e.density),
    planningPriority: oneOf(raw.planningPriority, PLANNING_PRIORITIES, e.planningPriority),
    sustainabilityGoal: oneOf(raw.sustainabilityGoal, SUSTAINABILITY_GOALS, e.sustainabilityGoal),
    distanceUnit: oneOf(raw.distanceUnit, DISTANCE_UNITS.map((u) => u.value), e.distanceUnit),
  };
}

/** Read a previously saved draft (null when none / unreadable). */
export function loadProjectDraft(): CreateProjectDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CREATE_PROJECT_DRAFT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isDraftShape(parsed)) return null;
    if (Number.isNaN(new Date(parsed.savedAtIso).getTime())) return null;
    return { values: sanitizeDraftValues(parsed.values), savedAtIso: parsed.savedAtIso };
  } catch {
    return null;
  }
}

/** Persist the current (possibly incomplete) form as a draft. */
export function saveProjectDraft(values: CreateProjectFormValues): CreateProjectDraft | null {
  if (typeof window === "undefined") return null;
  const draft: CreateProjectDraft = { values, savedAtIso: new Date().toISOString() };
  try {
    window.localStorage.setItem(CREATE_PROJECT_DRAFT_KEY, JSON.stringify(draft));
    return draft;
  } catch {
    return null; // storage full / disabled — caller shows a gentle notice
  }
}

export function clearProjectDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CREATE_PROJECT_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
