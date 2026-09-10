/**
 * Planning Studio domain model.
 *
 * Everything here is engine-agnostic: the demo SVG canvas renders these
 * objects today, and a GIS/3D engine (MapLibre, Cesium, Three.js…) can
 * consume the same documents later. Coordinates are local metres with the
 * origin at the top-left of the project's world extent ("Demo / Local" CRS).
 */

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Objects
// ---------------------------------------------------------------------------

export type PlanningObjectType =
  | "building"
  | "road"
  | "path"
  | "parking"
  | "public-space"
  | "green"
  | "tree-zone"
  | "water"
  | "parcel"
  | "label"
  | "measure";

export type LandUse = "Residential" | "Commercial" | "Mixed Use" | "Civic" | "Institutional" | "Industrial";
export type BuildingDensity = "Low" | "Medium" | "High";
export type ObjectStatus = "Existing" | "Proposed" | "Approved" | "Under Review";
export type RoadClass = "Arterial" | "Collector" | "Local" | "Pedestrian";

export interface BuildingProperties {
  floors: number;
  /** Metres. */
  height: number;
  /** Square metres. */
  footprint: number;
  landUse: LandUse;
  density: BuildingDensity;
  status: ObjectStatus;
}

export interface RoadProperties {
  roadClass: RoadClass;
  lanes: number;
  status: ObjectStatus;
}

export interface AreaProperties {
  /** Human label such as "Park", "Plaza", "Surface parking", "River". */
  category: string;
  status: ObjectStatus;
}

export interface LabelProperties {
  text: string;
}

interface ObjectBase {
  id: string;
  /** Short reference such as "B-014" or "Park Street". */
  name: string;
  /** Anchor / centroid in world metres. */
  x: number;
  y: number;
  /** Degrees, clockwise. */
  rotation?: number;
}

export interface BuildingObject extends ObjectBase {
  type: "building";
  /** Footprint size in metres (rotation applies around the centre). */
  width: number;
  height: number;
  properties: BuildingProperties;
}

export interface LinearObject extends ObjectBase {
  type: "road" | "path";
  points: Point[];
  /** Carriageway / path width in metres. */
  width: number;
  properties: RoadProperties;
}

export type AreaObjectType = "green" | "tree-zone" | "water" | "parking" | "public-space" | "parcel";

export interface AreaObject extends ObjectBase {
  type: AreaObjectType;
  /** Closed polygon in world metres. */
  points: Point[];
  properties: AreaProperties;
}

export interface LabelObject extends ObjectBase {
  type: "label";
  properties: LabelProperties;
}

export interface MeasureObject extends ObjectBase {
  type: "measure";
  points: [Point, Point];
}

export type PlanningObject = BuildingObject | LinearObject | AreaObject | LabelObject | MeasureObject;

// ---------------------------------------------------------------------------
// Site & context (read-only in this step; owned by the future GIS module)
// ---------------------------------------------------------------------------

export interface TransitContext {
  line: Point[];
  stations: { point: Point; name: string }[];
}

export interface SiteContext {
  /** Muted surrounding blocks (decorative, not selectable). */
  blocks: Bounds[];
  /** Surrounding streets as polylines. */
  roads: { points: Point[]; width: number }[];
  /** Terrain contour polylines (demo). */
  contours: Point[][];
  transit: TransitContext;
  utilities: Point[][];
  /** Decorative street trees along main roads. */
  streetTrees: Point[];
  /** Developable block plates inside the site (drawn under buildings). */
  blockPlates: Bounds[];
}

export interface SiteDefinition {
  /** Closed site boundary polygon. */
  boundary: Point[];
  /** Bounding box of the boundary. */
  bounds: Bounds;
  /** Full drawable extent (site + surroundings). */
  world: Bounds;
  context: SiteContext;
  coordinateSystem: "Demo / Local";
  boundaryStatus: "Defined" | "Not defined";
}

// ---------------------------------------------------------------------------
// Layers, tools, modes
// ---------------------------------------------------------------------------

export type ContextLayerKey = "roads" | "buildings" | "green" | "water" | "terrain" | "transit" | "utilities";
export type LayerVisibility = Record<ContextLayerKey, boolean>;

export type ToolId =
  | "select"
  | "boundary"
  | "parcel"
  | "building"
  | "road"
  | "path"
  | "parking"
  | "public-space"
  | "green"
  | "tree-zone"
  | "water"
  | "residential"
  | "commercial"
  | "mixed-use"
  | "civic"
  | "label"
  | "measure";

export type ToolGroup = "Site" | "Layout" | "Landscape" | "Urban Elements" | "Annotation";

/** How the canvas interprets clicks while the tool is active. */
export type ToolKind = "select" | "site" | "place" | "line";

export type StudioMode = "plan" | "context" | "3d";

export interface StudioSettings {
  showGrid: boolean;
  snapToGrid: boolean;
  showLabels: boolean;
}

// ---------------------------------------------------------------------------
// Documents (what the service loads / saves)
// ---------------------------------------------------------------------------

export interface PlanningDocument {
  projectId: string;
  site: SiteDefinition;
  objects: PlanningObject[];
  layers: LayerVisibility;
  /** ISO timestamp of the last local save, null when never saved. */
  savedAtIso: string | null;
  /** Where the objects came from. */
  source: "demo" | "local";
}

/** Persisted shape (future PUT /api/projects/:id/plan body). */
export interface PlanningSavePayload {
  version: 1;
  projectId: string;
  objects: PlanningObject[];
  layers: LayerVisibility;
  savedAtIso: string;
}

export type SelectionId = string | "site" | null;
