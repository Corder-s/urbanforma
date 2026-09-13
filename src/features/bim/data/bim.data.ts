import {
  Box,
  Building2,
  Columns3,
  DoorClosed,
  Fence,
  LandPlot,
  Layers,
  Map as MapIcon,
  Route,
  SquareStack,
  TreePine,
  Triangle,
  Waves,
  AppWindow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  BimCategory,
  BimCategoryDef,
  BimDiscipline,
  BimFilterPreset,
  BimFilters,
  BimFormat,
  BimIssueSeverity,
  BimIssueStatus,
  BimLayerDef,
  BimLayerKey,
  BimLayerVisibility,
  BimMode,
  BimModeDef,
  BimModelStatus,
  BimSceneMode,
  BimSceneModeDef,
  CoordinationStatus,
} from "../types/bim.types";

/**
 * BIM static vocabulary: modes, formats, categories, layers, filter presets and
 * the label/tone maps the UI renders. Element *derivation* lives in
 * `lib/bimModel.ts`; persistence in `services/bim.service.ts`.
 */

// ---------------------------------------------------------------------------
// Storage keys (per project, matching the other modules)
// ---------------------------------------------------------------------------

export const BIM_MODELS_PREFIX = "urbanforma.bim.models.";
export const BIM_ISSUES_PREFIX = "urbanforma.bim.issues.";
export const BIM_PREFS_PREFIX = "urbanforma.bim.prefs.";
export const BIM_LAST_PROJECT_KEY = "urbanforma.bim.lastProjectId";

export const PREFS_SAVE_DEBOUNCE_MS = 350;
export const SEARCH_DEBOUNCE_MS = 180;

/** Simulated upload/processing timings (local choreography, not a network call). */
export const UPLOAD_STEP_MS = 900;
export const PROCESS_STEP_MS = 1400;

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

export const MODES: BimModeDef[] = [
  { id: "overview", label: "Overview", hint: "Model dashboard, quantities and links to planning / analysis" },
  { id: "model", label: "Model", hint: "Model tree, BIM visualization and properties inspector" },
  { id: "coordination", label: "Coordination", hint: "Model versions, metadata and coordination checks" },
  { id: "issues", label: "Issues", hint: "Coordination issues and their affected elements" },
];

export const SCENE_MODES: BimSceneModeDef[] = [
  { id: "bim", label: "BIM view", hint: "Only the elements of the active model" },
  { id: "city", label: "City context", hint: "The full site model, as in Visualization" },
  { id: "combined", label: "Combined", hint: "Urban GIS + planning geometry + BIM massing" },
];

// ---------------------------------------------------------------------------
// Formats
// ---------------------------------------------------------------------------

export interface BimFormatDef {
  id: BimFormat;
  label: string;
  extension: string;
  /** Exchange standard the record claims. */
  schema: string;
  hint: string;
}

export const FORMATS: BimFormatDef[] = [
  { id: "IFC", label: "IFC", extension: ".ifc", schema: "IFC4", hint: "Industry Foundation Classes — open exchange standard" },
  { id: "RVT", label: "RVT", extension: ".rvt", schema: "Revit 2024", hint: "Autodesk Revit project (proprietary)" },
  { id: "GLB", label: "GLB", extension: ".glb", schema: "glTF 2.0", hint: "Binary glTF geometry" },
  { id: "GLTF", label: "GLTF", extension: ".gltf", schema: "glTF 2.0", hint: "JSON glTF geometry" },
];

export function getFormat(id: BimFormat): BimFormatDef {
  return FORMATS.find((f) => f.id === id) ?? FORMATS[0];
}

// ---------------------------------------------------------------------------
// Categories & disciplines
// ---------------------------------------------------------------------------

export const CATEGORIES: BimCategoryDef[] = [
  { id: "site", label: "Site", plural: "Sites", icon: LandPlot, discipline: "context" },
  { id: "building", label: "Building", plural: "Buildings", icon: Building2, discipline: "architecture" },
  { id: "level", label: "Level", plural: "Levels", icon: Layers, discipline: "architecture" },
  { id: "wall", label: "Wall", plural: "Walls", icon: SquareStack, discipline: "architecture" },
  { id: "floor", label: "Floor", plural: "Floors", icon: Columns3, discipline: "structure" },
  { id: "column", label: "Column", plural: "Columns", icon: Columns3, discipline: "structure" },
  { id: "door", label: "Door", plural: "Doors", icon: DoorClosed, discipline: "architecture" },
  { id: "window", label: "Window", plural: "Windows", icon: AppWindow, discipline: "architecture" },
  { id: "roof", label: "Roof", plural: "Roofs", icon: Triangle, discipline: "architecture" },
  { id: "stair", label: "Stair", plural: "Stairs", icon: Layers, discipline: "architecture" },
  { id: "road", label: "Road", plural: "Roads", icon: Route, discipline: "infrastructure" },
  { id: "infrastructure", label: "Infrastructure", plural: "Infrastructure", icon: Waves, discipline: "mep" },
  { id: "landscape", label: "Landscape", plural: "Landscape", icon: TreePine, discipline: "landscape" },
];

export function getCategory(id: BimCategory): BimCategoryDef {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

export const CATEGORY_ICON: Record<BimCategory, LucideIcon> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.icon])
) as Record<BimCategory, LucideIcon>;

export const DISCIPLINE_LABEL: Record<BimDiscipline, string> = {
  context: "Context",
  architecture: "Architecture",
  structure: "Structure",
  mep: "MEP",
  infrastructure: "Infrastructure",
  landscape: "Landscape",
};

/** Categories the tree groups under a building, in document order. */
export const BUILDING_GROUPS: BimCategory[] = ["wall", "floor", "column", "door", "window", "stair", "roof"];

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

export const LAYERS: BimLayerDef[] = [
  { key: "model", label: "BIM model", hint: "Everything in the active model", icon: Box },
  { key: "buildings", label: "Buildings", hint: "Building volumes and their parts", icon: Building2 },
  { key: "architecture", label: "Architecture", hint: "Walls, doors, windows, roofs, stairs", icon: AppWindow },
  { key: "structure", label: "Structure", hint: "Floors, columns, slabs", icon: Columns3 },
  { key: "mep", label: "MEP", hint: "Utilities and services (mapped, not modelled)", icon: Waves },
  { key: "infrastructure", label: "Infrastructure", hint: "Roads, paths and networks", icon: Route },
  { key: "landscape", label: "Landscape", hint: "Green, water, trees and open space", icon: TreePine },
  { key: "context", label: "Context", hint: "Surrounding city context from GIS", icon: MapIcon },
];

export const DEFAULT_LAYERS: BimLayerVisibility = {
  model: true,
  buildings: true,
  architecture: true,
  structure: true,
  mep: false,
  infrastructure: true,
  landscape: true,
  context: true,
};

export const LAYER_KEYS: BimLayerKey[] = LAYERS.map((l) => l.key);

/** Which layer(s) decide an element's visibility. */
export const DISCIPLINE_LAYER: Record<BimDiscipline, BimLayerKey> = {
  context: "context",
  architecture: "architecture",
  structure: "structure",
  mep: "mep",
  infrastructure: "infrastructure",
  landscape: "landscape",
};

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export const EMPTY_FILTERS: BimFilters = {
  query: "",
  categories: [],
  levels: [],
  buildings: [],
  materials: [],
  visibleOnly: false,
};

export const FILTER_PRESETS: { id: BimFilterPreset; label: string; categories: BimCategory[] }[] = [
  { id: "all", label: "All", categories: [] },
  { id: "buildings", label: "Buildings", categories: ["building"] },
  { id: "architecture", label: "Architecture", categories: ["wall", "door", "window", "roof", "stair"] },
  { id: "structure", label: "Structure", categories: ["floor", "column"] },
  { id: "mep", label: "MEP", categories: ["infrastructure"] },
  { id: "infrastructure", label: "Infrastructure", categories: ["road"] },
  { id: "landscape", label: "Landscape", categories: ["landscape"] },
];

/** Materials the derivation assigns — also the seed list for the material facet. */
export const MATERIALS: string[] = [
  "Concrete C30/37",
  "Reinforced concrete",
  "Brick masonry",
  "Structural steel",
  "CLT panel",
  "Glazed curtain wall",
  "Aluminium",
  "Timber cladding",
  "Bitumen",
  "Concrete pavers",
  "Grass / planting",
  "Water",
];

export const FACADE_MATERIALS = ["Glazed curtain wall", "Brick masonry", "CLT panel", "Aluminium", "Timber cladding"];
export const ROOF_MATERIALS = ["Bitumen", "Grass / planting", "Aluminium"];

// ---------------------------------------------------------------------------
// Status metadata (never colour-only — always with a label)
// ---------------------------------------------------------------------------

export const MODEL_STATUS_META: Record<BimModelStatus, { label: string; tone: "green" | "blue" | "amber" | "neutral"; dot: string }> = {
  ready: { label: "Ready", tone: "green", dot: "bg-success" },
  uploading: { label: "Uploading", tone: "blue", dot: "bg-primary" },
  processing: { label: "Processing", tone: "blue", dot: "bg-primary" },
  failed: { label: "Failed", tone: "amber", dot: "bg-warning" },
};

export const SEVERITY_META: Record<BimIssueSeverity, { label: string; tone: "neutral" | "blue" | "amber" | "green"; rank: number }> = {
  critical: { label: "Critical", tone: "amber", rank: 0 },
  high: { label: "High", tone: "amber", rank: 1 },
  medium: { label: "Medium", tone: "blue", rank: 2 },
  low: { label: "Low", tone: "neutral", rank: 3 },
};

export const ISSUE_STATUS_META: Record<BimIssueStatus, { label: string; tone: "neutral" | "blue" | "green" }> = {
  open: { label: "Open", tone: "neutral" },
  "in-review": { label: "In review", tone: "blue" },
  resolved: { label: "Resolved", tone: "green" },
};

export const COORDINATION_META: Record<CoordinationStatus, { label: string; tone: "green" | "amber" | "neutral" | "blue"; glyph: string }> = {
  ready: { label: "Ready", tone: "green", glyph: "✓" },
  warning: { label: "Warning", tone: "amber", glyph: "!" },
  missing: { label: "Missing", tone: "neutral", glyph: "–" },
  processing: { label: "Processing", tone: "blue", glyph: "…" },
};

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

export function levelName(index: number): string {
  if (index === 0) return "Ground";
  if (index < 0) return `Basement ${String(Math.abs(index)).padStart(2, "0")}`;
  return `Level ${String(index + 1).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Issue templates (demo coordination findings, labelled as demo in the UI)
// ---------------------------------------------------------------------------

export interface BimIssueTemplate {
  id: string;
  title: string;
  description: string;
  severity: BimIssueSeverity;
  /** Category the affected element is picked from. */
  category: BimCategory;
  locationOf: (elementName: string, level: string | null) => string;
}

export const ISSUE_TEMPLATES: BimIssueTemplate[] = [
  {
    id: "tpl-height-mismatch",
    title: "Model height differs from the planning record",
    description:
      "The authored height in the model does not match the height of the linked planning object. Confirm which value governs before the next issue of drawings.",
    severity: "high",
    category: "building",
    locationOf: (name) => `${name} · massing`,
  },
  {
    id: "tpl-missing-fire-exit",
    title: "Upper level has no modelled stair",
    description:
      "A level above ground has no stair element in the model. Egress cannot be verified until the circulation core is modelled or linked.",
    severity: "critical",
    category: "stair",
    locationOf: (name, level) => `${name} · ${level ?? "upper level"}`,
  },
  {
    id: "tpl-glazing-ratio",
    title: "Glazing ratio above the facade target",
    description:
      "The window area of this facade exceeds the target ratio used in the environmental analysis. Review with the analysis results before freezing the facade.",
    severity: "medium",
    category: "window",
    locationOf: (name, level) => `${name} · ${level ?? "facade"}`,
  },
  {
    id: "tpl-slab-thickness",
    title: "Slab thickness inconsistent between levels",
    description:
      "Two floors of the same building are modelled with different slab thicknesses without a documented reason.",
    severity: "low",
    category: "floor",
    locationOf: (name, level) => `${name} · ${level ?? "slab"}`,
  },
  {
    id: "tpl-unmapped-element",
    title: "Element has no planning reference",
    description:
      "This element is not linked to a Planning Studio object, so its quantities are not reflected in the urban metrics.",
    severity: "medium",
    category: "wall",
    locationOf: (name) => `${name} · unmapped`,
  },
];

// ---------------------------------------------------------------------------
// Formatting — reuses the Planning/Visualization formatters (no second copy)
// ---------------------------------------------------------------------------

export { formatArea, formatMetres } from "../../planning/lib/geometry";
import { formatVolume } from "../../settings/lib/units";

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** i;
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

/** Unit-aware (Settings → Units); kept under its BIM-facing name. */
export function formatVolumeM3(m3: number): string {
  return formatVolume(m3);
}

/** Date + time for model records, versions and issues. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** "just now" / "12 min ago" / "3 days ago" — used beside the absolute timestamp. */
export function relativeTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.round(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}
