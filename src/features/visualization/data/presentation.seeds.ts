import { DEFAULT_LAYERS, DEFAULT_SETTINGS } from "./visualization.data";
import { DEFAULT_PRESENTATION_SETTINGS, DEFAULT_SELECTED_METRICS } from "./presentation.data";
import type { Annotation, Presentation, PresentationSlide, PresentationView, SpatialDataset } from "../types/visualization.types";

/**
 * Demo storyboard + saved views for a project that has none yet. Everything is
 * expressed relative to the site bounds so the seeds work for every demo
 * project; a user's own edits replace them in localStorage.
 */

function iso(offsetMinutes: number): string {
  return new Date(Date.now() - offsetMinutes * 60_000).toISOString();
}

export function seedAnnotations(data: SpatialDataset): Annotation[] {
  const s = data.siteBounds;
  const at = (fx: number, fy: number) => ({ x: Math.round(s.x + s.width * fx), y: Math.round(s.y + s.height * fy) });
  return [
    { id: "ann-corridor", kind: "label", text: "New Green Corridor", position: at(0.24, 0.3) },
    { id: "ann-core", kind: "callout", text: "Mixed-use Core", detail: "Retail ground floors with housing above", position: at(0.5, 0.52) },
    { id: "ann-spine", kind: "label", text: "Pedestrian Spine", position: at(0.7, 0.74) },
    { id: "ann-green", kind: "metric", text: "Green Coverage", detail: `${data.summary.greenCoveragePct.toFixed(1)}%`, position: at(0.18, 0.78) },
  ];
}

function view(data: SpatialDataset, id: string, name: string, patch: Partial<PresentationView>, minutesAgo: number): PresentationView {
  return {
    id,
    projectId: data.projectId,
    name,
    mode: "explore",
    viewMode: "2d",
    camera: { kind: "preset", preset: "overview" },
    scenarioId: null,
    visibleLayers: { ...DEFAULT_LAYERS },
    sceneSettings: { ...DEFAULT_SETTINGS },
    basemap: "urban",
    selectedMetrics: [...DEFAULT_SELECTED_METRICS],
    annotations: [],
    createdAt: iso(minutesAgo),
    ...patch,
  };
}

export function seedSavedViews(data: SpatialDataset): PresentationView[] {
  return [
    view(data, "view-master-overview", "Master Plan Overview", { viewMode: "3d", camera: { kind: "preset", preset: "overview" } }, 3 * 24 * 60),
    view(data, "view-green-scenario", "Green Scenario", { viewMode: "3d", scenarioId: "green", camera: { kind: "preset", preset: "birds-eye" }, sceneSettings: { ...DEFAULT_SETTINGS, buildingStyle: "simple" }, annotations: seedAnnotations(data).slice(0, 1) }, 2 * 24 * 60),
    view(data, "view-central-district", "Central District", { viewMode: "3d", camera: { kind: "preset", preset: "central-district" }, sceneSettings: { ...DEFAULT_SETTINGS, buildingStyle: "architectural" } }, 26 * 60),
    view(data, "view-evening", "Evening Presentation", { mode: "present", viewMode: "3d", camera: { kind: "preset", preset: "street" }, sceneSettings: { ...DEFAULT_SETTINGS, timeOfDay: "evening", atmosphere: "soft-cloud", buildingStyle: "simple" } }, 5 * 60),
    view(data, "view-environmental", "Environmental View", { viewMode: "2d", scenarioId: "green", camera: { kind: "preset", preset: "top" }, sceneSettings: { ...DEFAULT_SETTINGS, buildingStyle: "height", labels: false }, visibleLayers: { ...DEFAULT_LAYERS, parks: true, "context-buildings": false } }, 40),
  ];
}

export function seedPresentation(data: SpatialDataset): Presentation {
  const ann = seedAnnotations(data);
  const slideViews: PresentationView[] = [
    view(data, "sv-overview", "Project Overview", { mode: "present", viewMode: "3d", camera: { kind: "preset", preset: "overview" } }, 60),
    view(data, "sv-context", "Existing Context", { mode: "present", viewMode: "2d", camera: { kind: "preset", preset: "top" }, sceneSettings: { ...DEFAULT_SETTINGS, buildingStyle: "simple", labels: false }, visibleLayers: { ...DEFAULT_LAYERS, poi: true } }, 59),
    view(data, "sv-current", "Current Plan", { mode: "present", viewMode: "3d", camera: { kind: "preset", preset: "birds-eye" } }, 58),
    view(data, "sv-green", "Green Priority Scenario", { mode: "present", viewMode: "3d", scenarioId: "green", camera: { kind: "preset", preset: "birds-eye" }, sceneSettings: { ...DEFAULT_SETTINGS, buildingStyle: "simple" } }, 57),
    view(data, "sv-environment", "Environmental Impact", { mode: "present", viewMode: "2d", scenarioId: "green", camera: { kind: "preset", preset: "top" }, sceneSettings: { ...DEFAULT_SETTINGS, buildingStyle: "height" }, visibleLayers: { ...DEFAULT_LAYERS, parks: true } }, 56),
    view(data, "sv-preferred", "Preferred Direction", { mode: "present", viewMode: "3d", scenarioId: "green", camera: { kind: "preset", preset: "central-district" }, sceneSettings: { ...DEFAULT_SETTINGS, timeOfDay: "17:00", buildingStyle: "architectural" } }, 55),
  ];
  const slides: PresentationSlide[] = [
    { id: "slide-1", title: "Project Overview", description: `${data.projectName} — site, scale and planning ambition.`, viewId: "sv-overview", scenarioId: null, annotations: [], order: 0 },
    { id: "slide-2", title: "Existing Context", description: "Surrounding neighbourhood, streets and points of interest.", viewId: "sv-context", scenarioId: null, annotations: [], order: 1 },
    { id: "slide-3", title: "Current Plan", description: "The plan as designed today: blocks, buildings and open space.", viewId: "sv-current", scenarioId: null, annotations: [ann[1], ann[2]], order: 2 },
    { id: "slide-4", title: "Green Priority Scenario", description: "Generated planning scenario prioritising green infrastructure.", viewId: "sv-green", scenarioId: "green", annotations: [ann[0]], order: 3 },
    { id: "slide-5", title: "Environmental Impact", description: "Green coverage, heat risk and environmental score compared with the current plan.", viewId: "sv-environment", scenarioId: "green", annotations: [ann[3]], order: 4 },
    { id: "slide-6", title: "Preferred Direction", description: "Recommended direction for the next design iteration.", viewId: "sv-preferred", scenarioId: "green", annotations: [ann[1]], order: 5 },
  ];
  return {
    id: `pres-${data.projectId}`,
    projectId: data.projectId,
    title: data.projectName,
    subtitle: "Preferred Urban Design Scenario",
    theme: "urban",
    views: slideViews,
    slides,
    settings: { ...DEFAULT_PRESENTATION_SETTINGS },
    selectedMetrics: [...DEFAULT_SELECTED_METRICS],
    annotations: ann,
    updatedAt: iso(55),
  };
}
