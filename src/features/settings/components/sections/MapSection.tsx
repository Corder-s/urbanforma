import { useSettings } from "../../hooks/useSettings";
import { BASEMAP_HINTS, BASEMAP_LABELS, CAMERA_HINTS, CAMERA_LABELS, DEFAULT_CAMERA_OPTIONS } from "../../lib/labels";
import { FormSelect } from "../../../../components/ui/FormSelect";
import { ChoiceGroup, InlineNote, SettingRow, SettingsPanel, Switch } from "../controls";
import type { BasemapId } from "../../../visualization/types/visualization.types";

const BASEMAP_OPTIONS = (Object.keys(BASEMAP_LABELS) as BasemapId[]).map((id) => ({
  value: id,
  label: BASEMAP_LABELS[id],
}));

const CAMERA_OPTIONS = DEFAULT_CAMERA_OPTIONS.map((id) => ({ value: id, label: CAMERA_LABELS[id] }));

/**
 * Map & GIS defaults (§7).
 *
 * These are *defaults*, not a second GIS state: `useVisualizationState` reads
 * them through `getMapDefaults()` when a project has no workspace state of its
 * own, and `MapView` renders its grid, scale bar, north arrow and terrain from
 * the same fields. A project's saved settings always win, so nothing here can
 * silently override work in progress.
 */
export function MapSection() {
  const { settings, patch } = useSettings();
  const map = settings.map;
  const update = (next: Partial<typeof map>) => patch({ map: next });

  return (
    <>
      <SettingsPanel title="Opening view" description="How the map workspace opens for a project with no saved state.">
        <SettingRow label="Default view" hint="2-D plan or the 3-D city, when a project has not chosen yet.">
          <ChoiceGroup
            ariaLabel="Default map view"
            value={map.defaultMode}
            options={[
              { value: "2d" as const, label: "2-D map" },
              { value: "3d" as const, label: "3-D city" },
            ]}
            onChange={(next) => update({ defaultMode: next })}
          />
        </SettingRow>

        <SettingRow label="Basemap" hint={BASEMAP_HINTS[map.defaultBasemap]} htmlFor="settings-map-basemap">
          <div className="w-full sm:w-64">
            <FormSelect
              id="settings-map-basemap"
              aria-label="Basemap"
              value={map.defaultBasemap}
              options={BASEMAP_OPTIONS}
              onChange={(next) => update({ defaultBasemap: next as BasemapId })}
            />
          </div>
        </SettingRow>

        <SettingRow label="Camera preset" hint={CAMERA_HINTS[map.defaultCamera]} htmlFor="settings-map-camera">
          <div className="w-full sm:w-64">
            <FormSelect
              id="settings-map-camera"
              aria-label="Camera preset"
              value={map.defaultCamera}
              options={CAMERA_OPTIONS}
              onChange={(next) => update({ defaultCamera: next as typeof map.defaultCamera })}
            />
          </div>
        </SettingRow>
      </SettingsPanel>

      <div className="mt-4">
        <SettingsPanel title="Overlays" description="Layers drawn on top of the base map.">
          <SettingRow label="Grid" hint="Reference grid over the site — the same toggle the map toolbar carries.">
            <Switch checked={map.showGrid} onChange={(next) => update({ showGrid: next })} label="Grid" />
          </SettingRow>
          <SettingRow label="Scale bar" hint="Distance scale along the bottom edge of the map.">
            <Switch checked={map.showScale} onChange={(next) => update({ showScale: next })} label="Scale bar" />
          </SettingRow>
          <SettingRow label="North arrow" hint="Orientation indicator, useful on exported captures.">
            <Switch checked={map.showNorth} onChange={(next) => update({ showNorth: next })} label="North arrow" />
          </SettingRow>
          <SettingRow label="Terrain" hint="Contours and elevation shading where the dataset carries them.">
            <Switch checked={map.terrain} onChange={(next) => update({ terrain: next })} label="Terrain" />
          </SettingRow>

          <InlineNote>
            Changing a default does not reopen workspaces you already have state for — it decides how the
            next project (or a project with no saved view) starts.
          </InlineNote>
        </SettingsPanel>
      </div>
    </>
  );
}
