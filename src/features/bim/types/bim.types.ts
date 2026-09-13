import type { LucideIcon } from "lucide-react";

/**
 * BIM (Building Information Modeling) domain model.
 *
 *   BimModel (record: file, format, version, status)
 *     └─ BimElement[]  (hierarchical: site → buildings → walls / floors / …)
 *          ├─ planningRef  → the Planning Studio / GIS object it describes
 *          ├─ properties   → identity, dimensions, material, custom PSets
 *          └─ quantities   → area / volume / height (available to analysis)
 *
 * Nothing here pretends a real BIM backend exists. Elements are derived
 * deterministically from the project's live `SpatialDataset` (Step 12 geometry),
 * so BIM, planning, analysis and visualization always describe the same site.
 * A future pipeline (IFC/RVT parsing in a Java service) returns these shapes.
 */

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

export type BimFormat = "IFC" | "RVT" | "GLTF" | "GLB";

/**
 * Lifecycle of a model record. `processing` → `failed` is the honest path for a
 * real uploaded file while no BIM backend is connected; demo models are derived
 * locally and are `ready` immediately.
 */
export type BimModelStatus = "ready" | "uploading" | "processing" | "failed";

export type BimModelSource = "demo" | "local" | "upload";

export interface BimModelVersion {
  id: string;
  /** "v1", "v2" … */
  label: string;
  version: number;
  createdAt: string;
  status: BimModelStatus;
  /** What changed in this revision (author-written or derived). */
  changes: string[];
  elementCount: number;
  /** Model record size at this revision, in bytes. */
  sizeBytes: number;
}

export interface BimModel {
  id: string;
  name: string;
  projectId: string;
  fileName: string;
  format: BimFormat;
  /** Bytes — real file size for uploads, derived record size for demo models. */
  sizeBytes: number;
  /** "1.4", "2.0" — the model's own version string. */
  version: string;
  uploadedAt: string;
  updatedAt: string;
  status: BimModelStatus;
  source: BimModelSource;
  author: string;
  /** Schema / exchange standard the record claims (IFC4, IFC2X3, Revit 2024 …). */
  schema: string;
  /** Why a model is not usable — surfaced verbatim in the UI. */
  statusNote?: string;
  versions: BimModelVersion[];
  activeVersionId: string;
}

// ---------------------------------------------------------------------------
// Elements
// ---------------------------------------------------------------------------

export type BimCategory =
  | "site"
  | "building"
  | "level"
  | "wall"
  | "floor"
  | "door"
  | "window"
  | "roof"
  | "column"
  | "stair"
  | "road"
  | "landscape"
  | "infrastructure";

/** Coordination discipline — drives the BIM layer panel. */
export type BimDiscipline =
  | "context"
  | "architecture"
  | "structure"
  | "mep"
  | "infrastructure"
  | "landscape";

/** Where the element sits in the tree (a model root, a container, or a part). */
export type BimElementKind = "model" | "site" | "building" | "group" | "element";

export interface BimProperty {
  id: string;
  /** Property set name — "Identity", "Dimensions", "Pset_WallCommon" … */
  group: string;
  label: string;
  value: string;
  unit?: string;
}

/** Reference to the Planning Studio / GIS object this element describes. */
export interface BimPlanningRef {
  objectId: string;
  objectType: string;
  objectName: string;
  /** Layer the planning object belongs to (Step 12 vocabulary). */
  layer: string;
}

export interface BimElement {
  id: string;
  /** IFC-style GlobalId (22-char base64-ish); demo values are deterministic. */
  globalId: string;
  name: string;
  category: BimCategory;
  kind: BimElementKind;
  discipline: BimDiscipline;
  parentId: string | null;
  /** Level name ("Ground", "Level 03") — null for site/landscape elements. */
  level: string | null;
  material?: string;
  /** Quantities. Optional: a door has area but no volume, a site has neither. */
  area?: number;
  volume?: number;
  height?: number;
  width?: number;
  length?: number;
  /** Storeys — buildings and level groups only. */
  floors?: number;
  /** Site-relative location in metres (x east, y south, z up). */
  location?: { x: number; y: number; z: number };
  properties: BimProperty[];
  visible: boolean;
  /** Mapping layer to planning/GIS — never a copy of the planning object. */
  planningRef: BimPlanningRef | null;
  /** Element counts of the derived sub-elements (shown in the tree). */
  childCount?: number;
}

/** Element plus its tree position (built by `buildTree`, not stored). */
export interface BimTreeNode {
  element: BimElement;
  depth: number;
  children: BimTreeNode[];
  /** Elements below this node (for the tree's count badge). */
  descendants: number;
}

// ---------------------------------------------------------------------------
// Layers, filters, search
// ---------------------------------------------------------------------------

export type BimLayerKey =
  | "model"
  | "buildings"
  | "architecture"
  | "structure"
  | "mep"
  | "infrastructure"
  | "landscape"
  | "context";

export type BimLayerVisibility = Record<BimLayerKey, boolean>;

export interface BimLayerDef {
  key: BimLayerKey;
  label: string;
  hint: string;
  icon: LucideIcon;
}

export interface BimCategoryDef {
  id: BimCategory;
  label: string;
  plural: string;
  icon: LucideIcon;
  discipline: BimDiscipline;
}

/** Typed, reusable filter set (also what gets persisted per project). */
export interface BimFilters {
  /** Debounced free-text query: name, id, globalId, category, level. */
  query: string;
  /** Empty = all categories. */
  categories: BimCategory[];
  /** Empty = all levels. */
  levels: string[];
  /** Empty = all buildings (element ids of building nodes). */
  buildings: string[];
  /** Empty = all materials. */
  materials: string[];
  /** Only elements currently visible in the model. */
  visibleOnly: boolean;
}

export type BimFilterPreset = "all" | "buildings" | "structure" | "architecture" | "mep" | "landscape" | "infrastructure";

export interface BimSearchResult {
  element: BimElement;
  /** Which field matched, for the result row's caption. */
  matchedOn: "name" | "id" | "globalId" | "category" | "level";
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export type BimViewMode = "2d" | "3d";

/** What the viewport shows: the model alone, the city, or both combined. */
export type BimSceneMode = "bim" | "city" | "combined";

export interface BimSceneModeDef {
  id: BimSceneMode;
  label: string;
  hint: string;
}

// ---------------------------------------------------------------------------
// Metrics, coordination, versions
// ---------------------------------------------------------------------------

export interface BimMetrics {
  models: number;
  buildings: number;
  elements: number;
  levels: number;
  floorAreaM2: number;
  volumeM3: number;
  sizeBytes: number;
  openIssues: number;
}

export type CoordinationStatus = "ready" | "warning" | "missing" | "processing";

export interface CoordinationCheck {
  id: string;
  label: string;
  status: CoordinationStatus;
  /** One line of evidence — never an invented validation result. */
  detail: string;
}

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

export type BimIssueSeverity = "low" | "medium" | "high" | "critical";
export type BimIssueStatus = "open" | "in-review" | "resolved";
export type BimIssueSource = "demo" | "local";

export interface BimIssue {
  id: string;
  title: string;
  description: string;
  severity: BimIssueSeverity;
  elementIds: string[];
  status: BimIssueStatus;
  /** Human location ("Building A · Level 02 · north facade"). */
  location: string;
  createdAt: string;
  updatedAt: string;
  source: BimIssueSource;
}

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

export type BimMode = "overview" | "model" | "coordination" | "issues";

export interface BimModeDef {
  id: BimMode;
  label: string;
  hint: string;
}

/** BIM ↔ planning ↔ analysis mapping row (§13/§14 of the step spec). */
/**
 * BIM-derived quantities, shaped for the Analysis service.
 *
 * This is a *reference payload*, not a second analysis engine: Step 13 still
 * computes its metrics from planning geometry. It is the typed data a future
 * `POST /api/analysis/bim-inputs` would carry, so the Analysis module can be fed
 * from the model (height, footprint, floor area, volume, facade and roof
 * surfaces) without the BIM module owning any analysis logic.
 */
export interface BimAnalysisInput {
  elementId: string;
  /** Planning / GIS object this element maps to (null when unmapped). */
  objectId: string | null;
  name: string;
  landUse: string | null;
  floors: number | null;
  heightM: number | null;
  footprintM2: number | null;
  grossFloorAreaM2: number | null;
  volumeM3: number | null;
  /** Summed wall area of the modelled sub-elements (null when not modelled). */
  facadeAreaM2: number | null;
  /** Summed roof area (null when not modelled). */
  roofAreaM2: number | null;
  /** Levels modelled beneath this building. */
  levelCount: number;
  /** True when the building is broken down to walls / slabs / openings. */
  detailed: boolean;
}

export interface BimPlanningLink {
  elementId: string;
  bimName: string;
  planningObjectId: string;
  planningName: string;
  planningType: string;
  footprintM2: number;
  heightM: number;
  floors: number;
  grossFloorAreaM2: number;
  volumeM3: number;
  landUse: string;
  density: string;
  /** Green/road context derived from the same dataset (not a second engine). */
  nearestStreetM: number | null;
  greenSharePct: number | null;
}

/**
 * Persisted per-project BIM preferences.
 *
 * The 2-D/3-D view mode is deliberately *not* here: it belongs to the shared
 * visualization state (Step 12/15), so BIM and GIS never keep two cameras.
 */
export interface BimPrefs {
  sceneMode: BimSceneMode;
  layers: BimLayerVisibility;
  filters: BimFilters;
  activeModelId: string | null;
  activeVersionId: string | null;
  mode: BimMode;
}
