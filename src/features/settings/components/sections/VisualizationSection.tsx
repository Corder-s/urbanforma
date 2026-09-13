import { useSettings } from "../../hooks/useSettings";
import {
  ATMOSPHERE_IDS,
  ATMOSPHERE_LABELS,
  BUILDING_STYLE_IDS,
  BUILDING_STYLE_LABELS,
  RENDER_QUALITY_HINTS,
  RENDER_QUALITY_IDS,
  RENDER_QUALITY_LABELS,
  TIME_OF_DAY_IDS,
  TIME_OF_DAY_LABELS,
} from "../../lib/labels";
import { ChoiceGroup, InlineNote, SettingRow, SettingsPanel, SettingSelect, Switch } from "../controls";
import type { VisualizationPreferences } from "../../types/settings.types";

/** Typed option lists — ids come from explicit arrays, labels from exhaustive Records. */
const toOptions = <T extends string>(ids: readonly T[], labels: Record<T, string>) =>
  ids.map((value) => ({ value, label: labels[value] }));

const BUILDING_STYLE_OPTIONS = toOptions(BUILDING_STYLE_IDS, BUILDING_STYLE_LABELS);
const ATMOSPHERE_OPTIONS = toOptions(ATMOSPHERE_IDS, ATMOSPHERE_LABELS);
const TIME_OF_DAY_OPTIONS = toOptions(TIME_OF_DAY_IDS, TIME_OF_DAY_LABELS);
const QUALITY_OPTIONS = toOptions(RENDER_QUALITY_IDS, RENDER_QUALITY_LABELS);

/**
 * Visualization defaults (§8).
 *
 * Read through `getVisualizationDefaults()` by `useVisualizationState`, and the
 * quality choice caps the renderer's pixel ratio inside `CityScene`
 * (`getRenderQualityCap`). Same rule as the map: project-level state wins, so
 * these are opening conditions rather than overrides.
 */
export function VisualizationSection() {
  const { settings, patch } = useSettings();
  const viz = settings.visualization;
  const update = (next: Partial<VisualizationPreferences>) => patch({ visualization: next });

  return (
    <>
      <SettingsPanel title="Scene" description="How the 3-D city and its map view start.">
        <SettingRow label="Building appearance" hint="Massing style used for extruded buildings." htmlFor="settings-viz-style">
          <div className="w-full sm:w-64">
            <SettingSelect
              id="settings-viz-style"
              ariaLabel="Building appearance"
              value={viz.buildingStyle}
              options={BUILDING_STYLE_OPTIONS}
              onChange={(next) => update({ buildingStyle: next })}
            />
          </div>
        </SettingRow>

        <SettingRow label="Atmosphere" hint="Sky and haze treatment behind the site." htmlFor="settings-viz-atmosphere">
          <div className="w-full sm:w-64">
            <SettingSelect
              id="settings-viz-atmosphere"
              ariaLabel="Atmosphere"
              value={viz.atmosphere}
              options={ATMOSPHERE_OPTIONS}
              onChange={(next) => update({ atmosphere: next })}
            />
          </div>
        </SettingRow>

        <SettingRow label="Time of day" hint="Sun position used for shadows and façade lighting." htmlFor="settings-viz-time">
          <div className="w-full sm:w-64">
            <SettingSelect
              id="settings-viz-time"
              ariaLabel="Time of day"
              value={viz.timeOfDay}
              options={TIME_OF_DAY_OPTIONS}
              onChange={(next) => update({ timeOfDay: next })}
            />
          </div>
        </SettingRow>

        <SettingRow label="Visual quality" hint={RENDER_QUALITY_HINTS[viz.quality]}>
          <ChoiceGroup
            ariaLabel="Render quality"
            value={viz.quality}
            options={QUALITY_OPTIONS}
            onChange={(next) => update({ quality: next })}
          />
        </SettingRow>
      </SettingsPanel>

      <div className="mt-4">
        <SettingsPanel title="Content" description="What is drawn around the buildings.">
          <SettingRow label="Height emphasis" hint="Tint buildings by height so massing reads at a glance.">
            <Switch checked={viz.heightEmphasis} onChange={(next) => update({ heightEmphasis: next })} label="Height emphasis" />
          </SettingRow>
          <SettingRow label="Shadows" hint="Cast shadows from the current sun position. Costs frame time.">
            <Switch checked={viz.buildingShadows} onChange={(next) => update({ buildingShadows: next })} label="Shadows" />
          </SettingRow>
          <SettingRow label="Vegetation" hint="Street trees and planting from the dataset.">
            <Switch checked={viz.trees} onChange={(next) => update({ trees: next })} label="Vegetation" />
          </SettingRow>
          <SettingRow label="Labels" hint="Street, block and landmark labels on the map.">
            <Switch checked={viz.labels} onChange={(next) => update({ labels: next })} label="Labels" />
          </SettingRow>
          <SettingRow label="Road network" hint="Casings and surfaces for streets around the site.">
            <Switch checked={viz.roadNetwork} onChange={(next) => update({ roadNetwork: next })} label="Road network" />
          </SettingRow>

          <InlineNote>
            The default 2-D / 3-D view and opening camera live in{" "}
            <span className="font-bold text-ink">Map &amp; GIS</span> — one place for how a project is
            framed. Quality caps the 3-D renderer's device-pixel ratio: Performance for integrated GPUs,
            High for the sharpest capture. The 2-D map is vector-drawn and unaffected.
          </InlineNote>
        </SettingsPanel>
      </div>
    </>
  );
}
