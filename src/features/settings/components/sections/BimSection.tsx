import { BIM_LAYER_KEYS, getBimLayerPreset } from "../../services/settings.service";
import { useSettings } from "../../hooks/useSettings";
import {
  BIM_LAYER_LABELS,
  BIM_LAYER_PRESET_LABELS,
  BIM_MODE_LABELS,
  BIM_SCENE_MODE_LABELS,
  BIM_SIDE_PANEL_LABELS,
} from "../../lib/labels";
import { ChoiceGroup, InlineNote, SettingRow, SettingsPanel } from "../controls";
import type { BimMode, BimSceneMode } from "../../../bim/types/bim.types";
import type { BimLayerPreset, BimSettings } from "../../types/settings.types";

const MODE_OPTIONS = (Object.keys(BIM_MODE_LABELS) as BimMode[]).map((value) => ({
  value,
  label: BIM_MODE_LABELS[value],
}));

const SCENE_MODE_OPTIONS = (Object.keys(BIM_SCENE_MODE_LABELS) as BimSceneMode[]).map((value) => ({
  value,
  label: BIM_SCENE_MODE_LABELS[value],
}));

const SIDE_PANEL_OPTIONS = (Object.keys(BIM_SIDE_PANEL_LABELS) as BimSettings["defaultSidePanel"][]).map(
  (value) => ({ value, label: BIM_SIDE_PANEL_LABELS[value] })
);

const PRESET_OPTIONS = (Object.keys(BIM_LAYER_PRESET_LABELS) as BimLayerPreset[]).map((value) => ({
  value,
  label: BIM_LAYER_PRESET_LABELS[value],
}));

/**
 * BIM defaults (§9).
 *
 * Four opening conditions — mode, scene mode, side panel and layer preset —
 * which `bim.service.sanitizePrefs` reads through `getBimDefaults()` whenever a
 * project carries no stored preference of its own. The BIM workspace keeps its
 * live state; nothing here duplicates it. The preset preview resolves through
 * the same `getBimLayerPreset()` the workspace uses, so it cannot disagree with
 * what actually opens.
 */
export function BimSection() {
  const { settings, patch } = useSettings();
  const bim = settings.bim;
  const update = (next: Partial<BimSettings>) => patch({ bim: next });
  const preview = getBimLayerPreset(bim.layerPreset);
  const visible = BIM_LAYER_KEYS.filter((key) => preview[key]);

  return (
    <>
      <SettingsPanel title="Opening state" description="How the model workspace opens for a project with no saved preference.">
        <SettingRow label="Landing mode" hint="Overview, model, coordination or issues.">
          <ChoiceGroup
            ariaLabel="BIM landing mode"
            value={bim.defaultMode}
            options={MODE_OPTIONS}
            onChange={(next) => update({ defaultMode: next })}
          />
        </SettingRow>

        <SettingRow label="Scene mode" hint="The model alone, its city context, or both together.">
          <ChoiceGroup
            ariaLabel="BIM scene mode"
            value={bim.defaultSceneMode}
            options={SCENE_MODE_OPTIONS}
            onChange={(next) => update({ defaultSceneMode: next })}
          />
        </SettingRow>

        <SettingRow label="Side panel" hint="Which right-hand panel is open when the model loads.">
          <ChoiceGroup
            ariaLabel="BIM side panel"
            value={bim.defaultSidePanel}
            options={SIDE_PANEL_OPTIONS}
            onChange={(next) => update({ defaultSidePanel: next })}
          />
        </SettingRow>

        <InlineNote>
          A project that already has BIM preferences keeps them — these decide how a fresh workspace starts.
        </InlineNote>
      </SettingsPanel>

      <div className="mt-4">
        <SettingsPanel
          title="Layer preset"
          description="Layer visibility applied when a model opens."
          aside={
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
              {visible.length} of {BIM_LAYER_KEYS.length} layers on
            </span>
          }
        >
          <ChoiceGroup
            ariaLabel="BIM layer preset"
            value={bim.layerPreset}
            options={PRESET_OPTIONS}
            onChange={(next) => update({ layerPreset: next })}
          />

          <ul className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {BIM_LAYER_KEYS.map((key) => (
              <li
                key={key}
                className={[
                  "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold",
                  preview[key] ? "border-primary/25 bg-primary/5 text-ink" : "border-line bg-canvas text-faint",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className={["h-1.5 w-1.5 shrink-0 rounded-full", preview[key] ? "bg-primary" : "bg-line-strong"].join(" ")}
                />
                <span className="min-w-0 truncate">{BIM_LAYER_LABELS[key]}</span>
                <span className="sr-only">{preview[key] ? "visible" : "hidden"}</span>
              </li>
            ))}
          </ul>
        </SettingsPanel>
      </div>
    </>
  );
}
