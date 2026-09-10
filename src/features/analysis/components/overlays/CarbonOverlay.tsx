import { memo } from "react";
import type { BuildingObject } from "../../../visualization/types/visualization.types";
import { RAMPS } from "../../data/analysis.data";
import { rampColor } from "../../lib/analysis.engine";
import { BuildingTint } from "./BuildingTint";
import type { OverlayProps } from "./overlay.props";
import { ZoneGrid } from "./ZoneGrid";

/**
 * Carbon intensity (estimated): a neutral slate ramp per zone and per
 * building; the largest building contributors are marked with a dot so the
 * ranking survives without colour.
 */
export const CarbonOverlay = memo(function CarbonOverlay({ overlay, data, selectedId, focusId, scale, onSelect }: OverlayProps) {
  const buildings = data.objects.filter((o): o is BuildingObject => o.type === "building");
  return (
    <g>
      <ZoneGrid
        zones={overlay.zones}
        color={(v) => rampColor(RAMPS.carbon, v)}
        opacity={0.4}
        selectedId={selectedId}
        focusId={focusId}
        scale={scale}
        label={(z) => `${z.id.replace("zone-", "Zone ")}, estimated carbon intensity ${z.value >= 2 / 3 ? "higher" : z.value >= 1 / 3 ? "moderate" : "lower"}`}
        onSelect={onSelect}
      />
      <BuildingTint
        buildings={buildings}
        values={overlay.buildings}
        color={(v) => rampColor(RAMPS.carbon, 0.15 + v * 0.85)}
        selectedId={selectedId}
        scale={scale}
        label={(b, v) => `${b.name}, ${b.properties.landUse}, estimated carbon contribution ${v >= 0.66 ? "high" : v >= 0.33 ? "medium" : "low"}`}
        onSelect={onSelect}
        markAbove={0.72}
        markColor="#334155"
      />
    </g>
  );
});
