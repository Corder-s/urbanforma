import { memo } from "react";
import { LAND_USE_STYLE } from "../../../visualization/data/visualization.data";
import type { BuildingObject } from "../../../visualization/types/visualization.types";
import { RAMPS } from "../../data/analysis.data";
import { rampColor } from "../../lib/engineColor";
import { BuildingTint } from "./BuildingTint";
import type { OverlayProps } from "./overlay.props";
import { ZoneGrid } from "./ZoneGrid";

/**
 * Urban form overlays — density (FAR per zone + floors per building), building
 * height (per building) and land use (per building, categorical). Intensity
 * is kept restrained: one blue/cyan ramp, no saturated heat-map look.
 */
export const DensityOverlay = memo(function DensityOverlay({ overlay, data, selectedId, focusId, scale, onSelect }: OverlayProps) {
  const buildings = data.objects.filter((o): o is BuildingObject => o.type === "building");
  if (overlay.type === "landuse") {
    return (
      <BuildingTint
        buildings={buildings}
        values={overlay.buildings}
        color={(_v, b) => LAND_USE_STYLE[b.properties.landUse].stroke}
        selectedId={selectedId}
        scale={scale}
        label={(b) => `${b.name}, ${b.properties.landUse}, ${b.properties.floors} floors`}
        onSelect={onSelect}
      />
    );
  }
  if (overlay.type === "height") {
    return (
      <BuildingTint
        buildings={buildings}
        values={overlay.buildings}
        color={(v) => rampColor(RAMPS.height, v)}
        selectedId={selectedId}
        scale={scale}
        label={(b) => `${b.name}, ${Math.round(b.properties.height)} metres, ${b.properties.floors} floors`}
        onSelect={onSelect}
      />
    );
  }
  return (
    <g>
      <ZoneGrid
        zones={overlay.zones}
        color={(v) => rampColor(RAMPS.density, v)}
        opacity={0.5}
        selectedId={selectedId}
        focusId={focusId}
        scale={scale}
        label={(z) => `${z.id.replace("zone-", "Zone ")}, floor area ratio ${(z.value * overlay.max).toFixed(2)}`}
        onSelect={onSelect}
      />
      <BuildingTint
        buildings={buildings}
        values={overlay.buildings}
        color={(v) => rampColor(RAMPS.density, 0.25 + v * 0.75)}
        selectedId={selectedId}
        scale={scale}
        label={(b) => `${b.name}, ${b.properties.density} density, ${b.properties.floors} floors`}
        onSelect={onSelect}
      />
    </g>
  );
});
