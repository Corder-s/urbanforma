import type {
  Atmosphere,
  BasemapId,
  BuildingStyle,
  CameraPreset,
  TimeOfDay,
} from "../../visualization/types/visualization.types";
import type { BimLayerKey, BimMode, BimSceneMode } from "../../bim/types/bim.types";
import type { BimSettings } from "../types/settings.types";

/**
 * Presentation labels for ids that belong to other modules.
 *
 * The Settings route deliberately does **not** import the visualization or BIM
 * data modules (they carry scene definitions and demo models, which have no
 * business landing in this chunk). Only the shared *types* are imported, and
 * they erase at build time. Each map is an exhaustive `Record`, so adding a new
 * basemap, style or BIM mode fails the build here instead of rendering
 * "undefined" in a dropdown.
 */

export const BASEMAP_LABELS: Record<BasemapId, string> = {
  urban: "Urban",
  light: "Light",
  satellite: "Satellite",
  terrain: "Terrain",
};

export const BASEMAP_HINTS: Record<BasemapId, string> = {
  urban: "Neutral cartographic base with legible blocks and streets.",
  light: "Minimal pale base — lets site data carry the colour.",
  satellite: "Simulated imagery with vegetation and roof tones.",
  terrain: "Contours and elevation shading for slope context.",
};

/** Camera presets offered as a *default*. The workspace itself offers more. */
export const DEFAULT_CAMERA_OPTIONS: CameraPreset[] = ["overview", "top", "perspective"];

export const CAMERA_LABELS: Record<CameraPreset, string> = {
  reset: "Reset",
  top: "Top view",
  perspective: "Perspective",
  fit: "Fit to site",
  overview: "Overview",
  street: "Street view",
  "birds-eye": "Bird's eye",
  "site-entrance": "Site entrance",
  "central-district": "Central district",
};

export const CAMERA_HINTS: Record<CameraPreset, string> = {
  reset: "The renderer's opening pose.",
  top: "Plan view, straight down.",
  perspective: "Oblique 3-D view of the whole site.",
  fit: "Framed to the site bounds.",
  overview: "Whole site from the south-west.",
  street: "Eye level at the main entrance.",
  "birds-eye": "High oblique from the north-east.",
  "site-entrance": "Arriving from the south.",
  "central-district": "Framed on the centre of the site.",
};

export const BUILDING_STYLE_LABELS: Record<BuildingStyle, string> = {
  simple: "Simple massing",
  architectural: "Architectural",
  height: "Height emphasis",
  "land-use": "Land use",
};

export const ATMOSPHERE_LABELS: Record<Atmosphere, string> = {
  clear: "Clear",
  "soft-cloud": "Soft cloud",
  hazy: "Hazy",
};

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  morning: "Morning",
  "10:00": "10:00",
  "14:00": "14:00",
  "17:00": "17:00",
  evening: "Evening",
};

export const RENDER_QUALITY_LABELS: Record<"performance" | "balanced" | "high", string> = {
  performance: "Performance",
  balanced: "Balanced",
  high: "High",
};

export const RENDER_QUALITY_HINTS: Record<"performance" | "balanced" | "high", string> = {
  performance: "Renders at 1× device pixels — smoothest on integrated GPUs.",
  balanced: "Renders at 1.5× device pixels.",
  high: "Renders at up to 2× device pixels — sharpest, most GPU load.",
};

export const BIM_MODE_LABELS: Record<BimMode, string> = {
  overview: "Overview",
  model: "Model",
  coordination: "Coordination",
  issues: "Issues",
};

export const BIM_SCENE_MODE_LABELS: Record<BimSceneMode, string> = {
  bim: "Model only",
  city: "City context",
  combined: "Model + city",
};

export const BIM_SIDE_PANEL_LABELS: Record<BimSettings["defaultSidePanel"], string> = {
  properties: "Properties",
  filters: "Filters",
  layers: "Layers",
};

export const BIM_LAYER_PRESET_LABELS: Record<BimSettings["layerPreset"], string> = {
  everything: "Everything on",
  model: "Model only",
  architecture: "Architecture",
  structure: "Structure & services",
  "context-off": "Site context off",
};

export const BIM_LAYER_LABELS: Record<BimLayerKey, string> = {
  model: "Model",
  buildings: "Buildings",
  architecture: "Architecture",
  structure: "Structure",
  mep: "MEP services",
  infrastructure: "Infrastructure",
  landscape: "Landscape",
  context: "City context",
};

export const NOTIFICATION_LABELS: Record<
  | "projectUpdates"
  | "analysisCompleted"
  | "optimizationCompleted"
  | "reportGenerated"
  | "bimProcessing"
  | "system",
  { label: string; hint: string }
> = {
  projectUpdates: {
    label: "Project updates",
    hint: "A project you follow is edited, re-scoped or archived.",
  },
  analysisCompleted: {
    label: "Analysis completed",
    hint: "A sunlight, wind, noise or walkability study finishes.",
  },
  optimizationCompleted: {
    label: "Optimization completed",
    hint: "Scenario optimization produces a new ranked shortlist.",
  },
  reportGenerated: {
    label: "Report generated",
    hint: "A planning report is rebuilt or exported.",
  },
  bimProcessing: {
    label: "BIM processing",
    hint: "Model uploads, element scans and coordination checks.",
  },
  system: {
    label: "System",
    hint: "Data catalogues, releases and maintenance notices.",
  },
};

/** IANA zones offered as shortcuts; the browser's own zone is always included. */
export const TIMEZONE_OPTIONS: string[] = [
  "Asia/Calcutta",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/Berlin",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Paris",
  "Africa/Johannesburg",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "UTC",
];
