/**
 * GIS & 3D Visualization domain model.
 *
 * A single SpatialState feeds both renderers (2-D map SVG and 3-D Three.js
 * city). Coordinates are local metres in a "Local / Demo" CRS with the origin
 * at the top-left of the project world; +x east, +y south (map convention).
 * The 3-D renderer maps (x, y) → (x, -z) and elevation → +y.
 *
 * Nothing here is engine specific. A future GIS module can produce the same
 * SpatialObject[] from GeoJSON / vector tiles / PostGIS and the UI stays.
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
// Geometry (a deliberately small GeoJSON-like subset)
// ---------------------------------------------------------------------------

export type Geometry =
  | { kind: "point"; point: Point }
  | { kind: "line"; points: Point[]; width: number }
  | { kind: "polygon"; points: Point[] }
  /** Axis-aligned or rotated rectangle (fast path for buildings / blocks). */
  | { kind: "rect"; center: Point; width: number; depth: number; rotation?: number };

// ---------------------------------------------------------------------------
// Objects
// ---------------------------------------------------------------------------

export type SpatialObjectType = "building" | "road" | "path" | "green" | "water" | "tree" | "boundary" | "poi" | "terrain" | "block" | "context-building" | "parking" | "transit" | "utility";

export type LandUse = "Residential" | "Commercial" | "Mixed Use" | "Civic" | "Institutional" | "Industrial";
export type Density = "Low" | "Medium" | "High";
export type ObjectStatus = "Existing" | "Proposed" | "Approved" | "Under Review";

export interface BuildingProperties {
  landUse: LandUse;
  floors: number;
  /** Metres. */
  height: number;
  /** Square metres. */
  footprint: number;
  density: Density;
  status: ObjectStatus;
  /** Demo people capacity. */
  populationCapacity: number;
  /** Demo-only environmental indicators (no analysis engine behind them). */
  environmental: {
    solarExposure: number;
    heatSensitivity: "Low" | "Medium" | "High";
    greenProximityM: number;
  };
}

export interface RoadProperties {
  roadClass: "Arterial" | "Collector" | "Local" | "Pedestrian";
  lanes: number;
  /** Metres. */
  lengthM: number;
  status: ObjectStatus;
}

export interface AreaProperties {
  category: string;
  /** Square metres. */
  areaM2: number;
  status: ObjectStatus;
}

export interface PoiProperties {
  category: "Transit" | "Education" | "Health" | "Culture" | "Commerce" | "Recreation";
  description: string;
}

export interface TreeProperties {
  /** Canopy radius in metres. */
  canopyM: number;
  heightM: number;
}

export interface TransitProperties {
  mode: "Metro" | "Tram" | "Bus";
  stations: { point: Point; name: string }[];
}

export interface GenericProperties {
  note?: string;
}

export type SpatialProperties =
  | BuildingProperties
  | RoadProperties
  | AreaProperties
  | PoiProperties
  | TreeProperties
  | TransitProperties
  | GenericProperties;

interface SpatialBase<TType extends SpatialObjectType, TGeom extends Geometry, TProps> {
  id: string;
  type: TType;
  /** Human reference — "B-014", "Central Boulevard", "Riverside Park". */
  name: string;
  geometry: TGeom;
  properties: TProps;
  /** Layer this object belongs to (drives visibility). */
  layer: LayerKey;
  /** Selectable / searchable objects are "features"; decoration is not. */
  selectable: boolean;
  visible: boolean;
}

export type BuildingObject = SpatialBase<"building", Extract<Geometry, { kind: "rect" }>, BuildingProperties>;
export type RoadObject = SpatialBase<"road" | "path", Extract<Geometry, { kind: "line" }>, RoadProperties>;
export type AreaObject = SpatialBase<"green" | "water" | "parking" | "block", Extract<Geometry, { kind: "polygon" }>, AreaProperties>;
export type TreeObject = SpatialBase<"tree", Extract<Geometry, { kind: "point" }>, TreeProperties>;
export type BoundaryObject = SpatialBase<"boundary", Extract<Geometry, { kind: "polygon" }>, GenericProperties>;
export type PoiObject = SpatialBase<"poi", Extract<Geometry, { kind: "point" }>, PoiProperties>;
export type TerrainObject = SpatialBase<"terrain", Extract<Geometry, { kind: "line" }>, GenericProperties & { elevationM: number }>;
export type ContextBuildingObject = SpatialBase<"context-building", Extract<Geometry, { kind: "rect" }>, GenericProperties & { height: number }>;
export type TransitObject = SpatialBase<"transit", Extract<Geometry, { kind: "line" }>, TransitProperties>;
export type UtilityObject = SpatialBase<"utility", Extract<Geometry, { kind: "line" }>, GenericProperties & { network: string }>;

export type SpatialObject =
  | BuildingObject
  | RoadObject
  | AreaObject
  | TreeObject
  | BoundaryObject
  | PoiObject
  | TerrainObject
  | ContextBuildingObject
  | TransitObject
  | UtilityObject;

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

export type LayerKey =
  | "boundary"
  | "roads"
  | "buildings"
  | "blocks"
  | "water"
  | "green"
  | "trees"
  | "parks"
  | "transit"
  | "utilities"
  | "parking"
  | "terrain"
  | "context-buildings"
  | "poi";

export type LayerGroup = "Base" | "Landscape" | "Infrastructure" | "Context";

export type LayerVisibility = Record<LayerKey, boolean>;

// ---------------------------------------------------------------------------
// Site summary + dataset
// ---------------------------------------------------------------------------

export interface SiteSummary {
  siteAreaHa: number;
  buildings: number;
  greenCoveragePct: number;
  roadNetworkKm: number;
  waterAreaHa: number;
  populationCapacity: number;
  /** Demo centre coordinates (clearly labelled as demo in the UI). */
  coordinates: { lat: number; lng: number };
  coordinateSystem: "Local / Demo";
}

export interface SpatialDataset {
  projectId: string;
  projectName: string;
  /** Drawable world extent in metres. */
  world: Bounds;
  /** Site boundary bounds in metres. */
  siteBounds: Bounds;
  objects: SpatialObject[];
  summary: SiteSummary;
  /** Where the dataset came from — always a demo source in this version. */
  source: { kind: "demo"; note: string } | { kind: "local-plan"; note: string };
  generatedAtIso: string;
}

// ---------------------------------------------------------------------------
// Visualization state
// ---------------------------------------------------------------------------

export type ViewMode = "2d" | "3d";
export type BasemapId = "urban" | "light" | "satellite" | "terrain";

export type TimeOfDay = "morning" | "10:00" | "14:00" | "17:00" | "evening";
export type Atmosphere = "clear" | "soft-cloud" | "hazy";
export type BuildingStyle = "simple" | "architectural" | "height" | "land-use";

/**
 * Scene settings shared by the 2-D map and the 3-D city. Every field changes
 * what the demo renderers draw; none of them is a physical simulation (time
 * of day, atmosphere and lighting are visual presets only).
 */
export interface VisualizationSettings {
  buildingHeights: boolean;
  buildingShadows: boolean;
  terrain: boolean;
  labels: boolean;
  trees: boolean;
  roadNetwork: boolean;
  ambientLighting: boolean;
  /** 0–100 */
  sunIntensity: number;
  /** 0–100 (relative camera elevation for 3-D) */
  cameraHeight: number;
  // --- Step 15 additions ---------------------------------------------------
  /** Visibility switches that complement the layer panel (both must be on). */
  buildings: boolean;
  landscape: boolean;
  water: boolean;
  /** Visual lighting preset (no solar calculation). */
  timeOfDay: TimeOfDay;
  /** 0–100 east → west fine adjustment of the sun azimuth around the time-of-day preset. */
  sunPosition: number;
  atmosphere: Atmosphere;
  buildingStyle: BuildingStyle;
  /** Exaggerate building heights (3-D) so height differences read from afar. */
  heightEmphasis: boolean;
  /** Map furniture. */
  northArrow: boolean;
  scaleBar: boolean;
  /** 2-D reference grid (Settings → Map can change the default). */
  grid: boolean;
}

/** Alias used by the presentation model (spec naming). */
export type SceneSettings = VisualizationSettings;

/**
 * Camera preset requested by the UI; renderers interpret it. The first four
 * are the Step 12 view controls, the rest are named presentation cameras with
 * predefined demo positions derived from the site bounds.
 */
export type CameraPreset = "reset" | "top" | "perspective" | "fit" | "overview" | "street" | "birds-eye" | "site-entrance" | "central-district";

/** A restorable camera: an exact 2-D / 3-D pose or a named preset. */
export type CameraPose =
  | { kind: "2d"; center: Point; scale: number }
  | { kind: "3d"; position: [number, number, number]; target: [number, number, number] }
  | { kind: "preset"; preset: CameraPreset };

export interface FocusRequest {
  objectId: string;
  /** Monotonic token so repeated focus on the same object still fires. */
  token: number;
}

export type SelectionId = string | null;

// ---------------------------------------------------------------------------
// Presentation (Step 15)
// ---------------------------------------------------------------------------

export type WorkspaceMode = "explore" | "present";
export type PresentationTheme = "urban" | "minimal" | "presentation" | "planning";

export type AnnotationKind = "title" | "label" | "callout" | "metric";

export interface Annotation {
  id: string;
  kind: AnnotationKind;
  text: string;
  /** Secondary line — the value of a metric annotation or a callout detail. */
  detail?: string;
  /** Anchor in world metres. */
  position: Point;
}

export type PresentationMetricId = "environmentalScore" | "greenCoverage" | "population" | "siteArea" | "buildings" | "roadNetwork" | "walkability" | "carbon";

export interface PresentationSettings {
  showTitle: boolean;
  showScenario: boolean;
  showMetrics: boolean;
  showLegend: boolean;
  showNorthArrow: boolean;
  showScale: boolean;
  showAnnotations: boolean;
}

/** A saved / restorable view of the visualization (also the payload of a slide). */
export interface PresentationView {
  id: string;
  projectId: string;
  name: string;
  mode: WorkspaceMode;
  viewMode: ViewMode;
  camera: CameraPose;
  /** Optimization scenario id (`kind:<kind>` for a stable reference) or null for the current plan. */
  scenarioId: string | null;
  visibleLayers: LayerVisibility;
  sceneSettings: SceneSettings;
  basemap: BasemapId;
  selectedMetrics: PresentationMetricId[];
  annotations: Annotation[];
  createdAt: string;
}

export interface PresentationSlide {
  id: string;
  title: string;
  description: string;
  /** View captured for the slide (lives in `Presentation.views`). */
  viewId: string;
  scenarioId: string | null;
  annotations: Annotation[];
  order: number;
}

export interface Presentation {
  id: string;
  projectId: string;
  title: string;
  subtitle: string;
  theme: PresentationTheme;
  views: PresentationView[];
  slides: PresentationSlide[];
  settings: PresentationSettings;
  /** Metrics shown in Present mode (max 4). */
  selectedMetrics: PresentationMetricId[];
  /** Working annotation set (slides snapshot their own copies). */
  annotations: Annotation[];
  updatedAt: string;
}
