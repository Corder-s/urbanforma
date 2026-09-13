import { LEGEND_FEATURES, type ThemeDef } from "../data/presentation.data";
import { LAND_USE_STYLE } from "../data/visualization.data";
import { heightRamp } from "../lib/lighting";
import type { BuildingStyle } from "../types/visualization.types";

interface VisualizationLegendProps {
  buildingStyle: BuildingStyle;
  theme?: ThemeDef;
  /** Explore-mode card (white) instead of the themed presentation card. */
  plain?: boolean;
}

/**
 * Feature legend: Buildings, Roads, Green Areas, Water, Public Space; with the
 * land-use style the building row expands into Residential / Commercial /
 * Mixed Use / Civic; with the height style into a small height ramp. Labels
 * always accompany the swatches.
 */
export function VisualizationLegend({ buildingStyle, theme, plain = false }: VisualizationLegendProps) {
  const card = plain || !theme ? "rounded-xl border border-line bg-surface/95 shadow-soft" : theme.card;
  const caption = plain || !theme ? "text-faint" : theme.caption;
  const text = plain || !theme ? "text-ink" : theme.value;
  const rows = LEGEND_FEATURES.filter((f) => !(f.id === "buildings" && buildingStyle !== "simple" && buildingStyle !== "architectural"));
  return (
    <dl className={`${card} grid gap-1 px-3 py-2`} aria-label="Legend">
      <dt className={`text-[10px] font-bold uppercase tracking-widest ${caption}`}>Legend</dt>
      {buildingStyle === "land-use" &&
        (["Residential", "Commercial", "Mixed Use", "Civic"] as const).map((k) => (
          <dd key={k} className={`flex items-center gap-2 text-[11.5px] font-semibold ${text}`}>
            <span className="h-3 w-3 shrink-0 rounded-sm border" style={{ backgroundColor: LAND_USE_STYLE[k].fill, borderColor: LAND_USE_STYLE[k].stroke }} aria-hidden="true" />
            {k}
          </dd>
        ))}
      {buildingStyle === "height" && (
        <dd className={`flex items-center gap-2 text-[11.5px] font-semibold ${text}`}>
          <span className="flex shrink-0 gap-px" aria-hidden="true">
            {[2, 8, 14, 22, 30].map((f) => (
              <span key={f} className="h-3 w-2.5 first:rounded-l-sm last:rounded-r-sm" style={{ backgroundColor: heightRamp(f) }} />
            ))}
          </span>
          Building height (low → high)
        </dd>
      )}
      {rows.map((f) => (
        <dd key={f.id} className={`flex items-center gap-2 text-[11.5px] font-semibold ${text}`}>
          <span className="h-3 w-3 shrink-0 rounded-sm border" style={{ backgroundColor: f.fill, borderColor: f.stroke }} aria-hidden="true" />
          {f.label}
        </dd>
      ))}
    </dl>
  );
}
