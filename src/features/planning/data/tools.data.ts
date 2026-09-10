import {
  Building2,
  Car,
  Footprints,
  Hexagon,
  Home,
  Landmark,
  LandPlot,
  Layers3,
  MousePointer2,
  Route,
  Ruler,
  Store,
  Tag,
  TreePine,
  Trees,
  Waves,
  type LucideIcon,
} from "lucide-react";
import type { ContextLayerKey, LandUse, ObjectStatus, ToolGroup, ToolId, ToolKind } from "../types/planning.types";

export interface ToolDefinition {
  id: ToolId;
  label: string;
  group: ToolGroup;
  icon: LucideIcon;
  kind: ToolKind;
  /** Single-letter keyboard shortcut (shown in the panel). */
  key?: string;
  hint: string;
}

export const TOOL_GROUPS: ToolGroup[] = ["Site", "Layout", "Landscape", "Urban Elements", "Annotation"];

export const TOOLS: ToolDefinition[] = [
  { id: "select", label: "Select", group: "Site", icon: MousePointer2, kind: "select", key: "V", hint: "Select, move and inspect elements. Drag empty space to pan." },
  { id: "boundary", label: "Boundary", group: "Site", icon: Hexagon, kind: "site", key: "S", hint: "Shows the site boundary. Editing arrives with the GIS module." },
  { id: "parcel", label: "Parcel", group: "Site", icon: LandPlot, kind: "place", hint: "Click inside the site to place a demo parcel outline." },

  { id: "building", label: "Building", group: "Layout", icon: Building2, kind: "place", key: "B", hint: "Click to place a demo building. Edit its properties in the inspector." },
  { id: "road", label: "Road", group: "Layout", icon: Route, kind: "line", key: "R", hint: "Click to add road points, double-click or press Enter to finish." },
  { id: "path", label: "Path", group: "Layout", icon: Footprints, kind: "line", key: "P", hint: "Click to add path points, double-click or press Enter to finish." },
  { id: "parking", label: "Parking", group: "Layout", icon: Car, kind: "place", hint: "Click to place a surface parking area." },
  { id: "public-space", label: "Public Space", group: "Layout", icon: Layers3, kind: "place", hint: "Click to place a plaza or square." },

  { id: "green", label: "Green Area", group: "Landscape", icon: Trees, kind: "place", key: "G", hint: "Click to place a park or green area." },
  { id: "tree-zone", label: "Tree Zone", group: "Landscape", icon: TreePine, kind: "place", key: "T", hint: "Click to place a tree-planting zone." },
  { id: "water", label: "Water", group: "Landscape", icon: Waves, kind: "place", key: "W", hint: "Click to place a pond or water feature." },

  { id: "residential", label: "Residential", group: "Urban Elements", icon: Home, kind: "place", hint: "Place a residential building." },
  { id: "commercial", label: "Commercial", group: "Urban Elements", icon: Store, kind: "place", hint: "Place a commercial building." },
  { id: "mixed-use", label: "Mixed Use", group: "Urban Elements", icon: Building2, kind: "place", hint: "Place a mixed-use building." },
  { id: "civic", label: "Civic", group: "Urban Elements", icon: Landmark, kind: "place", hint: "Place a civic building." },

  { id: "label", label: "Label", group: "Annotation", icon: Tag, kind: "place", key: "L", hint: "Click to add a text label; edit the text in the inspector." },
  { id: "measure", label: "Measure", group: "Annotation", icon: Ruler, kind: "line", key: "M", hint: "Click two points to measure a distance." },
];

export const TOOL_BY_ID: Record<ToolId, ToolDefinition> = Object.fromEntries(TOOLS.map((t) => [t.id, t])) as Record<ToolId, ToolDefinition>;

export interface LayerDefinition {
  key: ContextLayerKey;
  label: string;
  note: string;
}

export const LAYER_DEFS: LayerDefinition[] = [
  { key: "roads", label: "Roads", note: "Site streets and surrounding road network" },
  { key: "buildings", label: "Buildings", note: "Proposed and existing buildings, context blocks" },
  { key: "green", label: "Green Areas", note: "Parks, courtyards, tree zones and street trees" },
  { key: "water", label: "Water", note: "Rivers, lakes and waterfront" },
  { key: "terrain", label: "Terrain", note: "Demo contour lines" },
  { key: "transit", label: "Transit", note: "Indicative metro line and stations" },
  { key: "utilities", label: "Utilities", note: "Indicative trunk services corridor" },
];

/** Soft, print-friendly land-use palette (fill / stroke). */
export const LAND_USE_COLORS: Record<LandUse, { fill: string; stroke: string }> = {
  Residential: { fill: "#F9E1A8", stroke: "#D9AE5A" },
  Commercial: { fill: "#F6BFBF", stroke: "#D98282" },
  "Mixed Use": { fill: "#F9CFA3", stroke: "#DB9A57" },
  Civic: { fill: "#C9DBF9", stroke: "#7FA4E6" },
  Institutional: { fill: "#DDCDF6", stroke: "#A88AD9" },
  Industrial: { fill: "#DAE0EA", stroke: "#A3AFC2" },
};

/** Existing (as-built) buildings are shown neutral so proposals stand out. */
export const EXISTING_BUILDING = { fill: "#E6EBF3", stroke: "#B8C4D6" };

export const LAND_USES: LandUse[] = ["Residential", "Commercial", "Mixed Use", "Civic", "Institutional", "Industrial"];
export const OBJECT_STATUSES: ObjectStatus[] = ["Proposed", "Under Review", "Approved", "Existing"];

export const STATUS_TONE: Record<ObjectStatus, "blue" | "amber" | "green" | "neutral"> = {
  Proposed: "blue",
  "Under Review": "amber",
  Approved: "green",
  Existing: "neutral",
};
