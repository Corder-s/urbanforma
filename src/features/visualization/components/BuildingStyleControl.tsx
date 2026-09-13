import { useId } from "react";
import { BUILDING_STYLES, LAND_USE_STYLE } from "../data/visualization.data";
import type { VisualizationState } from "../hooks/useVisualizationState";
import { heightRamp } from "../lib/lighting";
import { Segmented } from "./controls";

interface BuildingStyleControlProps {
  state: VisualizationState;
}

/**
 * Building appearance: Simple (neutral massing), Architectural (façade bands
 * and roof detail), Height Emphasis (shaded by height) and Land Use
 * (category colours). A small swatch strip previews the active palette so
 * the choice is never communicated by colour alone.
 */
export function BuildingStyleControl({ state }: BuildingStyleControlProps) {
  const { settings, updateSettings } = state;
  const id = useId();
  const style = settings.buildingStyle;
  return (
    <div>
      <p id={id} className="mb-1 text-[13px] font-semibold text-ink">
        Building Appearance
      </p>
      <Segmented label="Building appearance" labelledBy={id} value={style} onChange={(buildingStyle) => updateSettings({ buildingStyle })} columns={2} size="sm" options={BUILDING_STYLES.map((s) => ({ id: s.id, label: s.label, hint: s.hint }))} />
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted" aria-live="polite">
        <span className="flex items-center gap-0.5" aria-hidden="true">
          {style === "land-use" && (["Residential", "Commercial", "Mixed Use", "Civic"] as const).map((k) => <span key={k} className="h-3 w-3 rounded-sm border" style={{ backgroundColor: LAND_USE_STYLE[k].fill, borderColor: LAND_USE_STYLE[k].stroke }} />)}
          {style === "height" && [2, 6, 12, 20, 30].map((f) => <span key={f} className="h-3 w-3 rounded-sm border border-line-strong" style={{ backgroundColor: heightRamp(f) }} />)}
          {style === "simple" && <span className="h-3 w-6 rounded-sm border border-line-strong bg-[#E9EEF5]" />}
          {style === "architectural" && <span className="grid h-3 w-6 grid-rows-3 gap-px rounded-sm border border-line-strong bg-[#DCE6F2] p-px"><span className="bg-surface/70" /><span className="bg-surface/70" /><span className="bg-surface/70" /></span>}
        </span>
        <span>{BUILDING_STYLES.find((s) => s.id === style)?.hint}</span>
      </div>
    </div>
  );
}
