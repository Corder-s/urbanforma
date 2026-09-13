import { FormSelect } from "../../../../components/ui/FormSelect";
import { useSettings } from "../../hooks/useSettings";
import {
  ATMOSPHERE_LABELS,
  BUILDING_STYLE_LABELS,
  RENDER_QUALITY_HINTS,
  RENDER_QUALITY_LABELS,
  TIME_OF_DAY_LABELS,
} from "../../lib/labels";
import { ChoiceGroup, InlineNote, SettingRow, SettingsPanel, Switch } from "../controls";
import type { Atmosphere, BuildingStyle, TimeOfDay } from "../../../visualization/types/visualization.types";
import type { RenderQuality } from "../../types/settings.types";

const toOptions = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));

const BUILDING_STYLE_OPTIONS = toOptions<BuildingStyle>(BUILDING_STYLE_LABELS);
const ATMOSPHERE_OPTIONS = toOptions<Atmosphere>(ATMOSPHERE_LABELS);
const TIME_OF_DAY_OPTIONS = toOptions<TimeOfDay>(TIME_OF_DAY_LABELS);

const QUALITY_OPTIONS = (Object.keys(RENDER_QUALITY_LABELS) as RenderQuality[]).map((value) => ({
  value,
  label: RENDER_QUALITY_LABELS[value],
}));

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
  const update = (next: Partial<typeof viz>) => patch({ visualization: next });

  return (
    <>
      <SettingsPanel title="Scene" description="How the 3-D city and its map view start.">
        <SettingRow label="Building appearance" hint="Massing style used for extruded buildings." htmlFor="settings-viz-style">
          <div className="w-full sm:w-64">
            <FormSelect
              id="settings-viz-style"
              aria-label="Building appearance"
              value={viz.buildingStyle}
              options={BUILDING_STYLE_OPTIONS}
              onChange={(next) => update({ buildingStyle: next as BuildingStyle })}
            />
          </div>
        </SettingRow>

        <SettingRow label="Atmosphere" hint="Sky and haze treatment behind the site." htmlFor="settings-viz-atmosphere">
          <div className="w-full sm:w-64">
            <FormSelect
              id="settings-viz-atmosphere"
              aria-label="Atmosphere"
              value={viz.atmosphere}
              options={ATMOSPHERE_OPTIONS}
              onChange={(next) => update({ atmosphere: next as Atmosphere })}
            />
          </div>
        </SettingRow>

        <SettingRow label="Time of day" hint="Sun position used for shadows and façade lighting." htmlFor="settings-viz-time">
          <div className="w-full sm:w-64">
            <FormSelect
              id="settings-viz-time"
              aria-label="Time of day"
              value={viz.timeOfDay}
              options={TIME_OF_DAY_OPTIONS}
              onChange={(next) => update({ timeOfDay: next as TimeOfDay })}
            />
          </div>
        </SettingRow>

        <SettingRow label="Render quality" hint={RENDER_QUALITY_HINTS[viz.quality]}>
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
          <SettingRow label="Building shadows" hint="Cast shadows from the current sun position. Costs frame time.">
            <Switch checked={viz.buildingShadows} onChange={(next) => update({ buildingShadows: next })} label="Building shadows" />
          </SettingRow>
          <SettingRow label="Trees & vegetation" hint="Street trees and planting from the dataset.">
            <Switch checked={viz.trees} onChange={(next) => update({ trees: next })} label="Trees and vegetation" />
          </SettingRow>
          <SettingRow label="Labels" hint="Street, block and landmark labels on the map.">
            <Switch checked={viz.labels} onChange={(next) => update({ labels: next })} label="Labels" />
          </SettingRow>
          <SettingRow label="Road network" hint="Casings and surfaces for streets around the site.">
            <Switch checked={viz.roadNetwork} onChange={(next) => update({ roadNetwork: next })} label="Road network" />
          </SettingRow>

          <InlineNote>
            Quality caps the 3-D renderer's device-pixel ratio: Performance for integrated GPUs, High for
            the sharpest capture. The 2-D map is vector-drawn and unaffected.
          </InlineNote>
        </SettingsPanel>
      </div>
    </>
  );
}
