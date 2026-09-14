import { memo } from "react";
import { RAMPS } from "../../data/analysis.data";
import { rampColor } from "../../lib/engineColor";
import type { OverlayProps } from "./overlay.props";
import { ZoneGrid } from "./ZoneGrid";

/** Solar exposure: warm intensity ramp per zone (brighter = more exposure). */
export const SolarOverlay = memo(function SolarOverlay({ overlay, selectedId, focusId, scale, onSelect }: OverlayProps) {
  return (
    <ZoneGrid
      zones={overlay.zones}
      color={(v) => rampColor(RAMPS.solar, v)}
      opacity={0.6}
      selectedId={selectedId}
      focusId={focusId}
      scale={scale}
      label={(z) => `${z.id.replace("zone-", "Zone ")}, solar exposure ${Math.round(45 + z.value * 55)} out of 100`}
      onSelect={onSelect}
    />
  );
});
