import {
  Building2,
  Bus,
  Car,
  Grid2x2,
  Landmark,
  Layers,
  MapPin,
  Mountain,
  Plug,
  Route,
  Sprout,
  Trees,
  TreePine,
  Waves,
  type LucideIcon,
} from "lucide-react";
import type { Atmosphere, BasemapId, BuildingStyle, CameraPreset, LandUse, LayerGroup, LayerKey, LayerVisibility, TimeOfDay, VisualizationSettings } from "../types/visualization.types";

/**
 * Static UI vocabulary for the visualization workspace: layer catalogue,
 * basemap styles, default settings and the (restrained) land-use palette.
 * Anything a renderer needs to *draw* lives here so the 2-D and 3-D views
 * stay visually consistent.
 */

export interface LayerDef {
  key: LayerKey;
  label: string;
  group: LayerGroup;
  icon: LucideIcon;
  /** Short hint for tooltips. */
  hint: string;
}

export const LAYER_DEFS: LayerDef[] = [
  { key: "boundary", label: "Site Boundary", group: "Base", icon: Grid2x2, hint: "Project site outline" },
  { key: "roads", label: "Roads", group: "Base", icon: Route, hint: "Streets, paths and context roads" },
  { key: "buildings", label: "Buildings", group: "Base", icon: Building2, hint: "Planned buildings" },
  { key: "blocks", label: "Blocks", group: "Base", icon: Layers, hint: "Development blocks and plazas" },
  { key: "water", label: "Water", group: "Base", icon: Waves, hint: "Rivers, lakes and coast" },
  { key: "green", label: "Green Areas", group: "Landscape", icon: Sprout, hint: "Courtyards and planted areas" },
  { key: "trees", label: "Trees", group: "Landscape", icon: TreePine, hint: "Individual trees (3D) and street trees" },
  { key: "parks", label: "Parks", group: "Landscape", icon: Trees, hint: "Neighbourhood and central parks" },
  { key: "transit", label: "Transit", group: "Infrastructure", icon: Bus, hint: "Planned metro alignment and stations" },
  { key: "utilities", label: "Utilities", group: "Infrastructure", icon: Plug, hint: "Utility corridors (indicative)" },
  { key: "parking", label: "Parking", group: "Infrastructure", icon: Car, hint: "Surface parking" },
  { key: "terrain", label: "Terrain", group: "Context", icon: Mountain, hint: "Indicative contours / ground relief" },
  { key: "context-buildings", label: "Surrounding Buildings", group: "Context", icon: Landmark, hint: "Existing neighbourhood massing" },
  { key: "poi", label: "Points of Interest", group: "Context", icon: MapPin, hint: "Stations, schools, culture and commerce" },
];

export const LAYER_GROUPS: LayerGroup[] = ["Base", "Landscape", "Infrastructure", "Context"];

export const DEFAULT_LAYERS: LayerVisibility = {
  boundary: true,
  roads: true,
  buildings: true,
  blocks: true,
  water: true,
  green: true,
  trees: true,
  parks: false,
  transit: false,
  utilities: false,
  parking: false,
  terrain: true,
  "context-buildings": true,
  poi: false,
};

export const DEFAULT_SETTINGS: VisualizationSettings = {
  buildingHeights: true,
  buildingShadows: true,
  terrain: true,
  labels: true,
  trees: true,
  roadNetwork: true,
  ambientLighting: true,
  sunIntensity: 65,
  cameraHeight: 55,
  buildings: true,
  landscape: true,
  water: true,
  timeOfDay: "14:00",
  sunPosition: 50,
  atmosphere: "clear",
  buildingStyle: "land-use",
  heightEmphasis: false,
  northArrow: true,
  scaleBar: true,
  grid: true,
};

// ---------------------------------------------------------------------------
// Time of day / atmosphere / building appearance (visual presets only —
// no solar, weather or lighting calculation behind them)
// ---------------------------------------------------------------------------

export interface TimeOfDayPreset {
  id: TimeOfDay;
  label: string;
  /** Sun azimuth in degrees, clockwise from north (map convention). */
  azimuth: number;
  /** Relative sun elevation 0–1.2 (drives shadow length and light angle). */
  elevation: number;
  /** Three.js light colour. */
  sunColor: number;
  /** Sky / fog tint mixed over the basemap sky (`skyMix` = 0 keeps the basemap). */
  skyTint: number;
  skyMix: number;
  /** Multipliers over the Sun Intensity / Ambient settings. */
  intensity: number;
  ambient: number;
  /** 2-D plan shadow opacity. */
  shadowOpacity: number;
  /** Subtle 2-D colour cast (CSS colour + opacity; 0 = none). */
  toneCss: string;
  toneOpacity: number;
}

export const TIME_OF_DAY: TimeOfDayPreset[] = [
  { id: "morning", label: "Morning", azimuth: 96, elevation: 0.3, sunColor: 0xffe3bf, skyTint: 0xfbe9d7, skyMix: 0.35, intensity: 0.85, ambient: 1.05, shadowOpacity: 0.16, toneCss: "#F6B26B", toneOpacity: 0.07 },
  { id: "10:00", label: "10:00", azimuth: 132, elevation: 0.7, sunColor: 0xfff4e6, skyTint: 0xffffff, skyMix: 0.1, intensity: 1, ambient: 1, shadowOpacity: 0.13, toneCss: "#FFD9A0", toneOpacity: 0.03 },
  { id: "14:00", label: "14:00", azimuth: 214, elevation: 1.15, sunColor: 0xffffff, skyTint: 0xffffff, skyMix: 0, intensity: 1.05, ambient: 1, shadowOpacity: 0.11, toneCss: "#FFFFFF", toneOpacity: 0 },
  { id: "17:00", label: "17:00", azimuth: 262, elevation: 0.45, sunColor: 0xffdcae, skyTint: 0xfde4cf, skyMix: 0.35, intensity: 0.9, ambient: 0.95, shadowOpacity: 0.15, toneCss: "#F59E0B", toneOpacity: 0.06 },
  { id: "evening", label: "Evening", azimuth: 286, elevation: 0.2, sunColor: 0xffc27d, skyTint: 0xe6d6d3, skyMix: 0.6, intensity: 0.7, ambient: 0.8, shadowOpacity: 0.2, toneCss: "#6D5BA8", toneOpacity: 0.08 },
];

export function getTimeOfDay(id: TimeOfDay): TimeOfDayPreset {
  return TIME_OF_DAY.find((t) => t.id === id) ?? TIME_OF_DAY[2];
}

export interface AtmospherePreset {
  id: Atmosphere;
  label: string;
  hint: string;
  /** Fog start / end as a fraction of the scene's far distance. */
  fogNear: number;
  fogFar: number;
  sunScale: number;
  ambientScale: number;
  /** 0–1 mix of the sky towards a neutral grey. */
  skyGrey: number;
  /** 2-D haze veil (CSS colour + opacity). */
  hazeCss: string;
  hazeOpacity: number;
}

export const ATMOSPHERES: AtmospherePreset[] = [
  { id: "clear", label: "Clear", hint: "Crisp light, full contrast", fogNear: 0.55, fogFar: 1, sunScale: 1, ambientScale: 1, skyGrey: 0, hazeCss: "#FFFFFF", hazeOpacity: 0 },
  { id: "soft-cloud", label: "Soft Cloud", hint: "Diffuse light, softer shadows", fogNear: 0.45, fogFar: 0.95, sunScale: 0.78, ambientScale: 1.18, skyGrey: 0.25, hazeCss: "#FFFFFF", hazeOpacity: 0.05 },
  { id: "hazy", label: "Hazy", hint: "Distance fades, reduced contrast", fogNear: 0.18, fogFar: 0.7, sunScale: 0.7, ambientScale: 1.05, skyGrey: 0.45, hazeCss: "#F1F5F9", hazeOpacity: 0.16 },
];

export function getAtmosphere(id: Atmosphere): AtmospherePreset {
  return ATMOSPHERES.find((a) => a.id === id) ?? ATMOSPHERES[0];
}

export const BUILDING_STYLES: { id: BuildingStyle; label: string; hint: string }[] = [
  { id: "simple", label: "Simple", hint: "Neutral massing" },
  { id: "architectural", label: "Architectural", hint: "Floor bands and roof detail" },
  { id: "height", label: "Height Emphasis", hint: "Shaded by building height" },
  { id: "land-use", label: "Land Use", hint: "Category colours" },
];

// ---------------------------------------------------------------------------
// Camera presets (predefined demo positions derived from the site bounds)
// ---------------------------------------------------------------------------

export interface CameraPresetDef {
  id: CameraPreset;
  label: string;
  hint: string;
  /** Keyboard hint shown in tooltips (workspace shortcuts). */
  key?: string;
}

/** Named presentation cameras (both renderers interpret them). */
export const CAMERA_PRESETS: CameraPresetDef[] = [
  { id: "overview", label: "Overview", hint: "Whole site from the south-west" },
  { id: "top", label: "Top View", hint: "Plan view straight down", key: "T" },
  { id: "street", label: "Street View", hint: "Eye level at the main entrance" },
  { id: "birds-eye", label: "Bird's Eye", hint: "High oblique from the north-east" },
  { id: "site-entrance", label: "Site Entrance", hint: "Arriving from the south" },
  { id: "central-district", label: "Central District", hint: "Framed on the centre of the site" },
];

export const VIEWS_STORAGE_KEY = "urbanforma.visualization.views";
export const PRESENTATION_STORAGE_KEY = "urbanforma.visualization.presentation";

// ---------------------------------------------------------------------------
// Basemaps (simulated styles — no tile provider)
// ---------------------------------------------------------------------------

export interface BasemapStyle {
  id: BasemapId;
  label: string;
  description: string;
  /** Map background. */
  ground: string;
  /** Surrounding land (outside the site). */
  contextGround: string;
  grid: string;
  contextBuilding: { fill: string; stroke: string };
  contextRoad: { casing: string; surface: string };
  contour: string;
  water: { fill: string; stroke: string };
  /** Site plate under the plan. */
  site: string;
  /** Three.js hex colours for the 3-D ground / sky. */
  ground3d: number;
  sky3d: number;
  fog3d: number;
  /** Preview swatch (CSS). */
  swatch: string;
}

export const BASEMAPS: BasemapStyle[] = [
  {
    id: "urban",
    label: "Urban",
    description: "Neutral cartographic base with legible blocks and streets.",
    ground: "#EEF3F9",
    contextGround: "#E8EEF6",
    grid: "#DCE6F2",
    contextBuilding: { fill: "#DCE4EF", stroke: "#C7D3E3" },
    contextRoad: { casing: "#CBD6E5", surface: "#FFFFFF" },
    contour: "#C9D7EA",
    water: { fill: "#CFE4F7", stroke: "#A9CCEB" },
    site: "#F8FBFF",
    ground3d: 0xe6edf6,
    sky3d: 0xf5f9ff,
    fog3d: 0xf5f9ff,
    swatch: "linear-gradient(135deg,#EEF3F9 0%,#DCE4EF 100%)",
  },
  {
    id: "light",
    label: "Light",
    description: "Minimal, near-white base that lets the plan stand out.",
    ground: "#FAFBFD",
    contextGround: "#F5F7FA",
    grid: "#EDF1F6",
    contextBuilding: { fill: "#EDF1F6", stroke: "#E0E6EE" },
    contextRoad: { casing: "#E3E8F0", surface: "#FFFFFF" },
    contour: "#E1E8F1",
    water: { fill: "#DDEBF8", stroke: "#BFD6EE" },
    site: "#FFFFFF",
    ground3d: 0xf3f6fa,
    sky3d: 0xfafcff,
    fog3d: 0xfafcff,
    swatch: "linear-gradient(135deg,#FFFFFF 0%,#EDF1F6 100%)",
  },
  {
    id: "satellite",
    label: "Satellite Preview",
    description: "Simulated aerial tones. Not imagery — a placeholder for a licensed provider.",
    ground: "#D9DDCF",
    contextGround: "#CFD5C3",
    grid: "#C8CEBE",
    contextBuilding: { fill: "#B9BDB0", stroke: "#A2A798" },
    contextRoad: { casing: "#A9ADA3", surface: "#D2D5CC" },
    contour: "#B7BFAA",
    water: { fill: "#8FB6CF", stroke: "#7AA3BE" },
    site: "#E3E6D9",
    ground3d: 0xd3d8c8,
    sky3d: 0xe9eef3,
    fog3d: 0xe9eef3,
    swatch: "linear-gradient(135deg,#D9DDCF 0%,#8FB6CF 100%)",
  },
  {
    id: "terrain",
    label: "Terrain",
    description: "Hypsometric tint with emphasised contours.",
    ground: "#F1F2E6",
    contextGround: "#E8EBD9",
    grid: "#DEE2CF",
    contextBuilding: { fill: "#E3E5D6", stroke: "#CDD1BF" },
    contextRoad: { casing: "#CFD3C2", surface: "#FBFBF5" },
    contour: "#B89F7A",
    water: { fill: "#CDE3F2", stroke: "#A6C8E3" },
    site: "#F9FAF1",
    ground3d: 0xebeddf,
    sky3d: 0xf6f8f2,
    fog3d: 0xf6f8f2,
    swatch: "linear-gradient(135deg,#F1F2E6 0%,#B89F7A 100%)",
  },
];

export function getBasemap(id: BasemapId): BasemapStyle {
  return BASEMAPS.find((b) => b.id === id) ?? BASEMAPS[0];
}

// ---------------------------------------------------------------------------
// Land-use palette (shared by 2-D fills and 3-D materials)
// ---------------------------------------------------------------------------

export const LAND_USE_STYLE: Record<LandUse, { fill: string; stroke: string; hex: number; label: string }> = {
  Residential: { fill: "#F9E1A8", stroke: "#D9AE5A", hex: 0xf3d48f, label: "Residential" },
  Commercial: { fill: "#F6BFBF", stroke: "#D98282", hex: 0xefb1b1, label: "Commercial" },
  "Mixed Use": { fill: "#F9CFA3", stroke: "#DB9A57", hex: 0xf2c28e, label: "Mixed Use" },
  Civic: { fill: "#C9DBF9", stroke: "#7FA4E6", hex: 0xb7cff5, label: "Civic" },
  Institutional: { fill: "#DDCDF6", stroke: "#A88AD9", hex: 0xd2bff1, label: "Institutional" },
  Industrial: { fill: "#DAE0EA", stroke: "#A3AFC2", hex: 0xcdd5e1, label: "Industrial" },
};

export const EXISTING_STYLE = { fill: "#E6EBF3", stroke: "#B8C4D6", hex: 0xdfe5ee };

export const POI_COLORS: Record<string, string> = {
  Transit: "#06B6D4",
  Education: "#2563EB",
  Health: "#DC2626",
  Culture: "#7C3AED",
  Commerce: "#D97706",
  Recreation: "#16A34A",
};

export const VIEW_STORAGE_KEY = "urbanforma.visualization.lastProjectId";
export const PREFS_STORAGE_KEY = "urbanforma.visualization.prefs";
