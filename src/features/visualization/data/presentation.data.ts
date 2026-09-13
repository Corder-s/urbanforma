import { Building2, Footprints, Leaf, Map as MapIcon, Route, Sparkles, Trees, Users, type LucideIcon } from "lucide-react";
import type { AnnotationKind, PresentationMetricId, PresentationSettings, PresentationTheme } from "../types/visualization.types";

/**
 * Static vocabulary for Present mode: the metric catalogue, presentation
 * themes (styling of the overlay chrome only — never an app theme), default
 * presentation settings and the annotation kinds. Demo storyboard / saved
 * view seeds live in `presentation.seeds.ts` because they need the dataset.
 */

export interface PresentationMetricDef {
  id: PresentationMetricId;
  label: string;
  /** Short label for the compact strip. */
  short: string;
  hint: string;
  icon: LucideIcon;
}

export const PRESENTATION_METRICS: PresentationMetricDef[] = [
  { id: "environmentalScore", label: "Environmental Score", short: "Env. Score", hint: "Overall planning score from the analysis (0–100)", icon: Sparkles },
  { id: "greenCoverage", label: "Green Coverage", short: "Green", hint: "Share of the site that is green or planted", icon: Leaf },
  { id: "population", label: "Population Capacity", short: "Population", hint: "Demo residential capacity of the plan", icon: Users },
  { id: "siteArea", label: "Site Area", short: "Site Area", hint: "Area inside the site boundary", icon: MapIcon },
  { id: "buildings", label: "Buildings", short: "Buildings", hint: "Planned buildings in the scenario", icon: Building2 },
  { id: "roadNetwork", label: "Road Network", short: "Roads", hint: "Total length of streets and paths", icon: Route },
  { id: "walkability", label: "Walkability", short: "Walkability", hint: "Analysis walkability score (scenarios: estimated)", icon: Footprints },
  { id: "carbon", label: "Carbon Performance", short: "Carbon", hint: "Carbon performance score (0–100)", icon: Trees },
];

export const MAX_SELECTED_METRICS = 4;
export const DEFAULT_SELECTED_METRICS: PresentationMetricId[] = ["environmentalScore", "greenCoverage", "population", "siteArea"];

export const DEFAULT_PRESENTATION_SETTINGS: PresentationSettings = {
  showTitle: true,
  showScenario: true,
  showMetrics: true,
  showLegend: true,
  showNorthArrow: true,
  showScale: true,
  showAnnotations: true,
};

export const PRESENTATION_SETTING_LABELS: { key: keyof PresentationSettings; label: string; hint: string }[] = [
  { key: "showTitle", label: "Show Project Title", hint: "Title block with the project name and subtitle" },
  { key: "showScenario", label: "Show Scenario", hint: "Scenario name badge (e.g. Green Priority · Preferred)" },
  { key: "showMetrics", label: "Show Metrics", hint: "Selected key metrics strip" },
  { key: "showLegend", label: "Show Legend", hint: "Feature legend (land use when that style is active)" },
  { key: "showNorthArrow", label: "Show North Arrow", hint: "Minimal north indicator" },
  { key: "showScale", label: "Show Scale", hint: "Scale bar in the plan view" },
  { key: "showAnnotations", label: "Show Annotations", hint: "Titles, labels, callouts and metric tags" },
];

// ---------------------------------------------------------------------------
// Themes — presentation styling of the overlay chrome (inside the viewport only)
// ---------------------------------------------------------------------------

export interface ThemeDef {
  id: PresentationTheme;
  label: string;
  hint: string;
  /** Tailwind classes for overlay cards / text; every value stays inside the UrbanForma palette. */
  card: string;
  title: string;
  subtitle: string;
  /** Small caption text (metric labels). */
  caption: string;
  value: string;
  divider: string;
  /** Viewport backdrop (only the presentation theme darkens, and only inside the viewport). */
  backdrop: string;
  /** Swatch for the picker. */
  swatch: string;
}

export const THEMES: ThemeDef[] = [
  {
    id: "urban",
    label: "Urban",
    hint: "White cards, blue accents",
    card: "rounded-2xl border border-line bg-surface/95 shadow-float",
    title: "text-ink",
    subtitle: "text-muted",
    caption: "text-faint",
    value: "text-ink",
    divider: "border-line",
    backdrop: "",
    swatch: "linear-gradient(135deg,#FFFFFF 0%,#EEF4FF 100%)",
  },
  {
    id: "minimal",
    label: "Minimal",
    hint: "No cards, hairlines only",
    card: "rounded-none border-l-2 border-primary bg-surface/70 backdrop-blur-[2px]",
    title: "text-ink",
    subtitle: "text-muted",
    caption: "text-faint",
    value: "text-ink",
    divider: "border-line",
    backdrop: "",
    swatch: "linear-gradient(135deg,#FFFFFF 0%,#F5F9FF 100%)",
  },
  {
    id: "presentation",
    label: "Presentation",
    hint: "Dark viewport backdrop for projectors",
    card: "rounded-2xl border border-on-brand/10 bg-ink/85 shadow-float",
    title: "text-on-brand",
    subtitle: "text-on-brand/70",
    caption: "text-on-brand/55",
    value: "text-on-brand",
    divider: "border-on-brand/15",
    backdrop: "bg-ink",
    swatch: "linear-gradient(135deg,#0F172A 0%,#1E3A8A 100%)",
  },
  {
    id: "planning",
    label: "Planning",
    hint: "Drawing-sheet title block",
    card: "rounded-lg border border-line-strong bg-canvas/95 shadow-soft",
    title: "text-ink uppercase tracking-wide",
    subtitle: "text-muted",
    caption: "text-faint uppercase tracking-wider",
    value: "text-primary-dark",
    divider: "border-line-strong",
    backdrop: "",
    swatch: "linear-gradient(135deg,#F5F9FF 0%,#DCE6F2 100%)",
  },
];

export function getTheme(id: PresentationTheme): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

// ---------------------------------------------------------------------------
// Annotations
// ---------------------------------------------------------------------------

export const ANNOTATION_KINDS: { id: AnnotationKind; label: string; hint: string }[] = [
  { id: "title", label: "Title", hint: "Large heading anchored to a place" },
  { id: "label", label: "Label", hint: "Short name for an area or street" },
  { id: "callout", label: "Callout", hint: "Note with a leader line" },
  { id: "metric", label: "Metric", hint: "Value tag, e.g. Green Coverage 31.4%" },
];

export const MAX_ANNOTATIONS = 24;
export const MAX_SLIDES = 24;
export const MAX_SAVED_VIEWS = 30;

/** Legend rows for the feature legend (land-use rows are added when that building style is active). */
export const LEGEND_FEATURES: { id: string; label: string; fill: string; stroke: string }[] = [
  { id: "buildings", label: "Buildings", fill: "#E2E8F0", stroke: "#B8C4D6" },
  { id: "roads", label: "Roads", fill: "#FFFFFF", stroke: "#CBD6E5" },
  { id: "green", label: "Green Areas", fill: "#D5EBD0", stroke: "#A9D3A0" },
  { id: "water", label: "Water", fill: "#CFE4F7", stroke: "#A9CCEB" },
  { id: "public", label: "Public Space", fill: "#F3EEE2", stroke: "#DCCFB4" },
];
