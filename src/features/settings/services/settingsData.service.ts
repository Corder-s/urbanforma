import { SETTINGS_STORAGE_KEY, invalidateSettingsCache, loadSettings, reseedSettingsCache } from "./settings.service";

/**
 * Data & storage management (§13) — the inventory of everything this prototype
 * stores, plus the explicit actions that clear or export it.
 *
 * Split out of `settings.service.ts` for one reason: size on the critical path.
 * The core service (defaults, sanitize, load/save, and the small synchronous
 * accessors other features read) is imported by the settings provider, which
 * wraps the whole app and therefore sits in the entry chunk of *every* page. The
 * category table and the clear/export routines are used by exactly two Settings
 * panels, so they belong in the lazily-loaded Settings chunk instead. Dependency
 * direction is one-way (this module → the core), and there is still one storage
 * key, one cache and one copy of the sanitising logic.
 */

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
  reseedSettingsCache();
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
