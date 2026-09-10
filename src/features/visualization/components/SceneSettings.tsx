import { useId } from "react";
import type { VisualizationState } from "../hooks/useVisualizationState";
import type { VisualizationSettings as Settings } from "../types/visualization.types";
import { SectionTitle, Slider, Switch } from "./controls";

interface SceneSettingsProps {
  state: VisualizationState;
  idPrefix?: string;
}

const VISIBILITY: { key: keyof Settings; label: string; hint: string }[] = [
  { key: "buildings", label: "Building Visibility", hint: "Planned buildings" },
  { key: "roadNetwork", label: "Road Visibility", hint: "Streets, paths and context roads" },
  { key: "landscape", label: "Landscape Visibility", hint: "Green areas, parks and trees" },
  { key: "water", label: "Water Visibility", hint: "Rivers, lakes and coast" },
  { key: "trees", label: "Trees", hint: "Individual and street trees" },
  { key: "labels", label: "Labels", hint: "Names for buildings, stations and points of interest" },
  { key: "terrain", label: "Terrain", hint: "Indicative ground contours" },
];

const THREE_D: { key: keyof Settings; label: string; hint: string }[] = [
  { key: "buildingShadows", label: "Shadows", hint: "Cast shadows in 3D, drop shadows in plan" },
  { key: "ambientLighting", label: "Ambient Lighting", hint: "Soft sky light in the 3D view" },
  { key: "heightEmphasis", label: "Building Height Emphasis", hint: "Exaggerate heights so differences read from afar" },
];

/**
 * Compact scene settings: visibility switches shared by both renderers and
 * the 3-D lighting group (shadows, ambient light, sun position, height
 * emphasis). Every switch changes the demo visualization immediately.
 */
export function SceneSettings({ state, idPrefix = "scene" }: SceneSettingsProps) {
  const { settings, updateSettings, viewMode } = state;
  const uid = useId();
  const id = (k: string) => `${idPrefix}-${k}-${uid}`;
  return (
    <div>
      <SectionTitle>Visibility</SectionTitle>
      <div className="divide-y divide-line">
        {VISIBILITY.map((t) => (
          <Switch key={t.key} id={id(t.key)} label={t.label} hint={t.hint} checked={settings[t.key] as boolean} onChange={(v) => updateSettings({ [t.key]: v } as Partial<Settings>)} />
        ))}
      </div>
      <div className="mt-3 border-t border-line pt-2">
        <SectionTitle right={viewMode !== "3d" ? <span className="normal-case tracking-normal text-faint">lighting applies in 3D</span> : undefined}>Lighting</SectionTitle>
        <div className="divide-y divide-line">
          {THREE_D.map((t) => (
            <Switch key={t.key} id={id(t.key)} label={t.label} hint={t.hint} checked={settings[t.key] as boolean} onChange={(v) => updateSettings({ [t.key]: v } as Partial<Settings>)} />
          ))}
        </div>
        <Slider id={id("sun")} label="Sun Intensity" value={settings.sunIntensity} onChange={(v) => updateSettings({ sunIntensity: v })} format={(v) => `${v}%`} />
        <Slider id={id("sunpos")} label="Sun Position" value={settings.sunPosition} onChange={(v) => updateSettings({ sunPosition: v })} format={(v) => (v < 34 ? "East" : v < 67 ? "Centre" : "West")} hint="Fine adjustment around the time-of-day preset" />
        <Slider id={id("camera")} label="Camera Height" value={settings.cameraHeight} onChange={(v) => updateSettings({ cameraHeight: v })} format={(v) => (v < 34 ? "Low" : v < 67 ? "Medium" : "High")} />
      </div>
    </div>
  );
}
