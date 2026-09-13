import { configureUnits } from "../lib/units";
import type {
  AccessibilitySettings,
  AppSettings,
  AppearanceSettings,
  BimLayerPresetResult,
  BimSettings,
  MapSettings,
  NotificationCategory,
  NotificationSettings,
  PrivacySettings,
  RenderQuality,
  UnitSettings,
  VisualizationPreferences,
} from "../types/settings.types";
import type { BimLayerKey } from "../../bim/types/bim.types";
import type { CameraPreset } from "../../visualization/types/visualization.types";

/**
 * Settings service (Step 18) — the single source of truth for workspace
 * preferences.
 *
 * Today it is `localStorage` behind a typed, shape-guarded API; the function
 * shapes are the future REST contract:
 *
 *   getSettings()     → GET    /api/me/settings
 *   updateSettings()  → PATCH  /api/me/settings
 *   resetSettings()   → DELETE /api/me/settings
 *   exportSettings()  → GET    /api/me/settings/export
 *
 * Guarantees the UI relies on:
 *   - reading can never throw (corrupt or partial blobs fall back to defaults),
 *   - writing is debounced by the caller, not by this module, and is a single
 *     serialised write of the whole tree,
 *   - no secret is ever stored here: passwords and tokens belong to the auth
 *     session and are deliberately out of scope (§4, §28),
 *   - other modules read *defaults* through the small accessors at the bottom,
 *     so a project's own saved state always wins over a global preference.
 */

export const SETTINGS_STORAGE_KEY = "urbanforma.settings";

/** Bumped when the tree changes shape; older blobs are migrated on read. */
export const SETTINGS_SCHEMA_VERSION = 1;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isBool = (v: unknown): v is boolean => typeof v === "boolean";
const isStr = (v: unknown): v is string => typeof v === "string";

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return isStr(value) && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

// ---------------------------------------------------------------------------
// Defaults — the values the app has always behaved as if they were set
// ---------------------------------------------------------------------------

export const DEFAULT_APPEARANCE: AppearanceSettings = { theme: "light", accent: "blue" };
export const DEFAULT_UNITS: UnitSettings = { system: "metric" };

export const DEFAULT_MAP: MapSettings = {
  defaultMode: "2d",
  defaultBasemap: "urban",
  defaultCamera: "fit",
  showGrid: true,
  showScale: true,
  showNorth: true,
  terrain: true,
};

export const DEFAULT_VISUALIZATION: VisualizationPreferences = {
  buildingStyle: "land-use",
  buildingShadows: true,
  heightEmphasis: false,
  trees: true,
  labels: true,
  roadNetwork: true,
  atmosphere: "clear",
  timeOfDay: "14:00",
  quality: "high",
};

export const DEFAULT_BIM: BimSettings = {
  defaultMode: "overview",
  defaultSceneMode: "combined",
  defaultSidePanel: "properties",
  layerPreset: "everything",
};

export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  projectUpdates: true,
  analysisCompleted: true,
  optimizationCompleted: true,
  reportGenerated: true,
  bimProcessing: true,
  system: true,
};

export const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  motion: "auto",
  contrast: "normal",
  focus: "keyboard",
  scale: "default",
};

export const DEFAULT_PRIVACY: PrivacySettings = {
  analytics: false,
  usageData: false,
  personalization: true,
};

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  appearance: { ...DEFAULT_APPEARANCE },
  units: { ...DEFAULT_UNITS },
  map: { ...DEFAULT_MAP },
  visualization: { ...DEFAULT_VISUALIZATION },
  bim: { ...DEFAULT_BIM },
  notifications: { ...DEFAULT_NOTIFICATIONS },
  accessibility: { ...DEFAULT_ACCESSIBILITY },
  privacy: { ...DEFAULT_PRIVACY },
};

/** Every notification category, in display order. */
export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  "projectUpdates",
  "analysisCompleted",
  "optimizationCompleted",
  "reportGenerated",
  "bimProcessing",
  "system",
];

// ---------------------------------------------------------------------------
// Sanitising / migration
// ---------------------------------------------------------------------------

function sanitizeAppearance(raw: unknown): AppearanceSettings {
  const d = DEFAULT_APPEARANCE;
  if (!isRecord(raw)) return { ...d };
  return {
    theme: oneOf(raw.theme, ["light", "dark", "system"] as const, d.theme),
    accent: oneOf(raw.accent, ["blue", "cyan", "slate"] as const, d.accent),
  };
}

function sanitizeUnits(raw: unknown): UnitSettings {
  if (!isRecord(raw)) return { ...DEFAULT_UNITS };
  return { system: oneOf(raw.system, ["metric", "imperial"] as const, DEFAULT_UNITS.system) };
}

function sanitizeMap(raw: unknown): MapSettings {
  const d = DEFAULT_MAP;
  if (!isRecord(raw)) return { ...d };
  return {
    defaultMode: oneOf(raw.defaultMode, ["2d", "3d"] as const, d.defaultMode),
    defaultBasemap: oneOf(raw.defaultBasemap, ["urban", "light", "satellite", "terrain"] as const, d.defaultBasemap),
    defaultCamera: oneOf(
      raw.defaultCamera,
      ["fit", "overview", "top", "perspective", "reset", "street", "birds-eye"] as const,
      d.defaultCamera
    ),
    showGrid: isBool(raw.showGrid) ? raw.showGrid : d.showGrid,
    showScale: isBool(raw.showScale) ? raw.showScale : d.showScale,
    showNorth: isBool(raw.showNorth) ? raw.showNorth : d.showNorth,
    terrain: isBool(raw.terrain) ? raw.terrain : d.terrain,
  };
}

function sanitizeVisualization(raw: unknown): VisualizationPreferences {
  const d = DEFAULT_VISUALIZATION;
  if (!isRecord(raw)) return { ...d };
  return {
    buildingStyle: oneOf(raw.buildingStyle, ["simple", "architectural", "height", "land-use"] as const, d.buildingStyle),
    buildingShadows: isBool(raw.buildingShadows) ? raw.buildingShadows : d.buildingShadows,
    heightEmphasis: isBool(raw.heightEmphasis) ? raw.heightEmphasis : d.heightEmphasis,
    trees: isBool(raw.trees) ? raw.trees : d.trees,
    labels: isBool(raw.labels) ? raw.labels : d.labels,
    roadNetwork: isBool(raw.roadNetwork) ? raw.roadNetwork : d.roadNetwork,
    atmosphere: oneOf(raw.atmosphere, ["clear", "soft-cloud", "hazy"] as const, d.atmosphere),
    timeOfDay: oneOf(raw.timeOfDay, ["morning", "10:00", "14:00", "17:00", "evening"] as const, d.timeOfDay),
    quality: oneOf(raw.quality, ["performance", "balanced", "high"] as const, d.quality),
  };
}

function sanitizeBim(raw: unknown): BimSettings {
  const d = DEFAULT_BIM;
  if (!isRecord(raw)) return { ...d };
  return {
    defaultMode: oneOf(raw.defaultMode, ["overview", "model", "coordination", "issues"] as const, d.defaultMode),
    defaultSceneMode: oneOf(raw.defaultSceneMode, ["bim", "city", "combined"] as const, d.defaultSceneMode),
    defaultSidePanel: oneOf(raw.defaultSidePanel, ["properties", "filters", "layers"] as const, d.defaultSidePanel),
    layerPreset: oneOf(
      raw.layerPreset,
      ["everything", "model", "architecture", "structure", "context-off"] as const,
      d.layerPreset
    ),
  };
}

function sanitizeNotifications(raw: unknown): NotificationSettings {
  const out: NotificationSettings = { ...DEFAULT_NOTIFICATIONS };
  if (!isRecord(raw)) return out;
  for (const key of NOTIFICATION_CATEGORIES) {
    if (isBool(raw[key])) out[key] = raw[key];
  }
  return out;
}

function sanitizeAccessibility(raw: unknown): AccessibilitySettings {
  const d = DEFAULT_ACCESSIBILITY;
  if (!isRecord(raw)) return { ...d };
  return {
    motion: oneOf(raw.motion, ["auto", "reduced"] as const, d.motion),
    contrast: oneOf(raw.contrast, ["normal", "high"] as const, d.contrast),
    focus: oneOf(raw.focus, ["keyboard", "always"] as const, d.focus),
    scale: oneOf(raw.scale, ["default", "large"] as const, d.scale),
  };
}

function sanitizePrivacy(raw: unknown): PrivacySettings {
  const d = DEFAULT_PRIVACY;
  if (!isRecord(raw)) return { ...d };
  return {
    analytics: isBool(raw.analytics) ? raw.analytics : d.analytics,
    usageData: isBool(raw.usageData) ? raw.usageData : d.usageData,
    personalization: isBool(raw.personalization) ? raw.personalization : d.personalization,
  };
}

/**
 * Turn whatever is in storage into a usable tree.
 *
 * A blob from an older `schemaVersion` is merged over the current defaults
 * field by field, which is the whole migration strategy this shape needs: new
 * sections arrive with their defaults, removed ones are dropped, and a value of
 * the wrong type can never reach a component.
 */
export function sanitizeSettings(raw: unknown): AppSettings {
  if (!isRecord(raw)) return structuredClone(DEFAULT_SETTINGS);
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    appearance: sanitizeAppearance(raw.appearance),
    units: sanitizeUnits(raw.units),
    map: sanitizeMap(raw.map),
    visualization: sanitizeVisualization(raw.visualization),
    bim: sanitizeBim(raw.bim),
    notifications: sanitizeNotifications(raw.notifications),
    accessibility: sanitizeAccessibility(raw.accessibility),
    privacy: sanitizePrivacy(raw.privacy),
  };
}

// ---------------------------------------------------------------------------
// Read / write
// ---------------------------------------------------------------------------

/** In-memory copy so a read is not a JSON.parse per call. */
let cache: AppSettings | null = null;

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  } catch {
    return null; // private mode / blocked storage — defaults apply
  }
}

function writeStorage(settings: AppSettings): boolean {
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

/** Read (and cache) the settings tree, applying the unit preference globally. */
export function loadSettings(): AppSettings {
  if (cache) return cache;
  const raw = readStorage();
  let parsed: unknown = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null; // corrupt blob → defaults, and the UI can say so
    }
  }
  cache = sanitizeSettings(parsed);
  configureUnits(cache.units.system);
  return cache;
}

/** `GET /api/me/settings` */
export async function getSettings(): Promise<AppSettings> {
  return loadSettings();
}

/** True when the stored blob exists but could not be parsed (surfaced in the UI). */
export function isStoredSettingsCorrupt(): boolean {
  const raw = readStorage();
  if (!raw) return false;
  try {
    JSON.parse(raw);
    return false;
  } catch {
    return true;
  }
}

export type SettingsPatch = {
  appearance?: Partial<AppearanceSettings>;
  units?: Partial<UnitSettings>;
  map?: Partial<MapSettings>;
  visualization?: Partial<VisualizationPreferences>;
  bim?: Partial<BimSettings>;
  notifications?: Partial<NotificationSettings>;
  accessibility?: Partial<AccessibilitySettings>;
  privacy?: Partial<PrivacySettings>;
};

/**
 * `PATCH /api/me/settings` — merge a partial tree, persist it, return the whole.
 *
 * The merge goes through `sanitizeSettings`, so a bad value in a patch is
 * corrected rather than stored. One write per call; callers debounce.
 */
/** Pure merge of a partial tree over a settings tree (always sanitised). */
export function mergeSettings(current: AppSettings, patch: SettingsPatch): AppSettings {
  return sanitizeSettings({
    ...current,
    appearance: { ...current.appearance, ...patch.appearance },
    units: { ...current.units, ...patch.units },
    map: { ...current.map, ...patch.map },
    visualization: { ...current.visualization, ...patch.visualization },
    bim: { ...current.bim, ...patch.bim },
    notifications: { ...current.notifications, ...patch.notifications },
    accessibility: { ...current.accessibility, ...patch.accessibility },
    privacy: { ...current.privacy, ...patch.privacy },
  });
}

/** Merge two patches so a burst of changes becomes one write. */
export function mergePatches(a: SettingsPatch | null, b: SettingsPatch): SettingsPatch {
  if (!a) return b;
  return {
    appearance: { ...a.appearance, ...b.appearance },
    units: { ...a.units, ...b.units },
    map: { ...a.map, ...b.map },
    visualization: { ...a.visualization, ...b.visualization },
    bim: { ...a.bim, ...b.bim },
    notifications: { ...a.notifications, ...b.notifications },
    accessibility: { ...a.accessibility, ...b.accessibility },
    privacy: { ...a.privacy, ...b.privacy },
  };
}

export function updateSettings(patch: SettingsPatch): AppSettings {
  const next = mergeSettings(loadSettings(), patch);
  cache = next;
  writeStorage(next);
  configureUnits(next.units.system);
  return next;
}

/** `DELETE /api/me/settings` — back to defaults (does not touch project data). */
export function resetSettings(): AppSettings {
  cache = structuredClone(DEFAULT_SETTINGS);
  writeStorage(cache);
  configureUnits(cache.units.system);
  return cache;
}

/** Drop the in-memory copy (another tab wrote, or storage was cleared). */
export function invalidateSettingsCache(): void {
  cache = null;
}

/** `GET /api/me/settings/export` — the settings tree as formatted JSON. */
export function exportSettings(): string {
  return JSON.stringify(loadSettings(), null, 2);
}

// ---------------------------------------------------------------------------
// Data management (§13) — everything this prototype stores, by category
// ---------------------------------------------------------------------------

export type DataCategory =
  | "savedViews"
  | "presentation"
  | "reports"
  | "planning"
  | "optimization"
  | "analysis"
  | "bim"
  | "visualizationPrefs"
  | "drafts"
  | "preferences";

export interface DataCategoryMeta {
  id: DataCategory;
  label: string;
  hint: string;
  /** First matching rule wins, so the order below matters. */
  match: (key: string) => boolean;
}

const startsWith = (prefix: string) => (key: string) => key.startsWith(prefix);
const isLastProject = (key: string) => key.endsWith(".lastProjectId");

/**
 * Storage map. Auth keys are deliberately **not** listed: clearing data must
 * never sign the user out by accident — that is an explicit action in the
 * Danger Zone.
 */
export const DATA_CATEGORIES: DataCategoryMeta[] = [
  {
    id: "savedViews",
    label: "Saved views & snapshots",
    hint: "Camera views and presentation snapshots saved in Visualization.",
    match: startsWith("urbanforma.visualization.views."),
  },
  {
    id: "presentation",
    label: "Presentation state",
    hint: "Storyboards, slides and presentation settings.",
    match: startsWith("urbanforma.visualization.presentation."),
  },
  {
    id: "visualizationPrefs",
    label: "GIS / 3D preferences",
    hint: "Per-project layers, basemap and scene settings.",
    match: startsWith("urbanforma.visualization.prefs."),
  },
  {
    id: "reports",
    label: "Reports",
    hint: "Saved report configurations and their revisions.",
    match: (key) => key.startsWith("urbanforma.report.") && !isLastProject(key),
  },
  {
    id: "planning",
    label: "Planning Studio drawings",
    hint: "Site plans, objects and annotations drawn per project.",
    match: (key) => key.startsWith("urbanforma.plan.") && !isLastProject(key),
  },
  {
    id: "optimization",
    label: "Optimization runs",
    hint: "Scenario generations, weights, constraints and applied versions.",
    match: startsWith("urbanforma.optimization.prefs."),
  },
  {
    id: "analysis",
    label: "Analysis runs",
    hint: "Cached analysis results and per-project analysis preferences.",
    match: (key) => key === "urbanforma.analysis.lastRun" || key === "urbanforma.analysis.prefs",
  },
  {
    id: "bim",
    label: "BIM models & issues",
    hint: "Registered model records, revisions and coordination issues.",
    match: (key) =>
      key.startsWith("urbanforma.bim.models.") ||
      key.startsWith("urbanforma.bim.issues.") ||
      key.startsWith("urbanforma.bim.prefs."),
  },
  {
    id: "drafts",
    label: "Unsaved drafts",
    hint: "The create-project form draft.",
    match: (key) => key === "urbanforma.createProject.draft",
  },
  {
    id: "preferences",
    label: "Preferences & recent projects",
    hint: "Workspace settings, optimization prefs and every “last project” pointer.",
    match: (key) =>
      key === SETTINGS_STORAGE_KEY ||
      isLastProject(key) ||
      key.startsWith("urbanforma.optimization.state."),
  },
];

/** Keys that are never touched by data management. */
export const AUTH_KEYS = ["urbanforma.session", "urbanforma.rememberedEmail"];

export interface DataCategoryCount {
  meta: DataCategoryMeta;
  keys: string[];
  bytes: number;
}

function allKeys(): string[] {
  try {
    return Object.keys(window.localStorage).filter((k) => k.startsWith("urbanforma."));
  } catch {
    return [];
  }
}

/** What is stored right now, grouped for the Data Management list. */
export function storageInventory(): { categories: DataCategoryCount[]; auth: string[]; totalBytes: number } {
  const keys = allKeys();
  const sizes = new Map<string, number>();
  for (const key of keys) {
    try {
      sizes.set(key, (window.localStorage.getItem(key) ?? "").length);
    } catch {
      sizes.set(key, 0);
    }
  }
  const categories: DataCategoryCount[] = DATA_CATEGORIES.map((meta) => {
    const matched = keys.filter(meta.match);
    return { meta, keys: matched, bytes: matched.reduce((sum, k) => sum + (sizes.get(k) ?? 0), 0) };
  }).filter((c) => c.keys.length > 0);

  return {
    categories,
    auth: keys.filter((k) => AUTH_KEYS.includes(k)),
    totalBytes: keys.reduce((sum, k) => sum + (sizes.get(k) ?? 0), 0),
  };
}

/** Remove one category. Returns the number of keys deleted. */
export function clearCategory(category: DataCategory): number {
  const meta = DATA_CATEGORIES.find((c) => c.id === category);
  if (!meta) return 0;
  const keys = allKeys().filter(meta.match);
  try {
    for (const key of keys) window.localStorage.removeItem(key);
  } catch {
    return 0;
  }
  if (category === "preferences") invalidateSettingsCache();
  return keys.length;
}

/**
 * Reset local demo data: everything except the signed-in session. The user stays
 * signed in — signing out is a separate, explicit action.
 */
export function resetLocalData(): { removed: number; keptAuth: boolean } {
  const keys = allKeys().filter((k) => !AUTH_KEYS.includes(k));
  try {
    for (const key of keys) window.localStorage.removeItem(key);
  } catch {
    return { removed: 0, keptAuth: false };
  }
  invalidateSettingsCache();
  cache = structuredClone(DEFAULT_SETTINGS);
  configureUnits(cache.units.system);
  return { removed: keys.length, keptAuth: true };
}

/** Everything stored, as a downloadable JSON document. Auth keys are excluded. */
export function exportLocalData(): { fileName: string; payload: string; keys: number } {
  const keys = allKeys().filter((k) => !AUTH_KEYS.includes(k)).sort();
  const data: Record<string, unknown> = {};
  for (const key of keys) {
    const raw = (() => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    })();
    if (raw === null) continue;
    try {
      data[key] = JSON.parse(raw);
    } catch {
      data[key] = raw;
    }
  }
  const stamp = new Date().toISOString().slice(0, 10);
  return {
    fileName: `urbanforma-local-data-${stamp}.json`,
    payload: JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        application: "UrbanForma",
        note: "Browser-local prototype data. Session and authentication keys are deliberately excluded.",
        keys: keys.length,
        data,
      },
      null,
      2
    ),
    keys: keys.length,
  };
}

// ---------------------------------------------------------------------------
// Defaults other modules read (§7, §8, §9, §27)
//
// Small, synchronous and dependency-free on purpose: the GIS, visualization and
// BIM modules import these instead of the settings UI, so opening Settings never
// pulls a 3-D engine and opening a workspace never pulls the settings page.
// ---------------------------------------------------------------------------

/** 3-D pixel-ratio cap for the chosen render quality. "high" is today's value. */
export function getRenderQualityCap(quality: RenderQuality = loadSettings().visualization.quality): number {
  return quality === "performance" ? 1 : quality === "balanced" ? 1.5 : 2;
}

/** Camera preset the GIS/3-D workspace opens with (default "fit"). */
export function getDefaultCameraPreset(): CameraPreset {
  return loadSettings().map.defaultCamera;
}

/** Map defaults the GIS workspace falls back to when a project has no prefs. */
export function getMapDefaults(): MapSettings {
  return loadSettings().map;
}

/** Scene defaults merged over the visualization module's own DEFAULT_SETTINGS. */
export function getVisualizationDefaults(): VisualizationPreferences {
  return loadSettings().visualization;
}

/** BIM workspace defaults (mode, scene, side panel, layer preset). */
export function getBimDefaults(): BimSettings {
  return loadSettings().bim;
}

const LAYER_PRESETS: Record<BimSettings["layerPreset"], BimLayerPresetResult> = {
  everything: {
    model: true,
    buildings: true,
    architecture: true,
    structure: true,
    mep: true,
    infrastructure: true,
    landscape: true,
    context: true,
  },
  model: {
    model: true,
    buildings: true,
    architecture: true,
    structure: true,
    mep: true,
    infrastructure: true,
    landscape: false,
    context: false,
  },
  architecture: {
    model: true,
    buildings: true,
    architecture: true,
    structure: false,
    mep: false,
    infrastructure: false,
    landscape: true,
    context: true,
  },
  structure: {
    model: true,
    buildings: true,
    architecture: false,
    structure: true,
    mep: true,
    infrastructure: true,
    landscape: false,
    context: false,
  },
  "context-off": {
    model: true,
    buildings: true,
    architecture: true,
    structure: true,
    mep: true,
    infrastructure: true,
    landscape: true,
    context: false,
  },
};

/** Resolve the BIM layer preset into concrete layer visibility. */
export function getBimLayerPreset(preset: BimSettings["layerPreset"] = loadSettings().bim.layerPreset): BimLayerPresetResult {
  return { ...LAYER_PRESETS[preset] };
}

/** All BIM layer keys, for callers that need to iterate a preset. */
export const BIM_LAYER_KEYS: BimLayerKey[] = [
  "model",
  "buildings",
  "architecture",
  "structure",
  "mep",
  "infrastructure",
  "landscape",
  "context",
];

/** Privacy: when off, modules skip writing "last project" convenience keys. */
export function isPersonalizationEnabled(): boolean {
  return loadSettings().privacy.personalization;
}

/** Notification categories the header is allowed to show. */
export function enabledNotificationCategories(): NotificationCategory[] {
  const prefs = loadSettings().notifications;
  return NOTIFICATION_CATEGORIES.filter((c) => prefs[c]);
}
