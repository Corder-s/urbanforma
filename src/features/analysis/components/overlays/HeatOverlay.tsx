import { memo, useId } from "react";
import { RAMPS } from "../../data/analysis.data";
import { rampColor } from "../../lib/engineColor";
import type { OverlayProps } from "./overlay.props";
import { ZoneGrid } from "./ZoneGrid";

/** Heat zones: cool→hot ramp; the high-heat class also gets a hatch (not colour alone). */
export const HeatOverlay = memo(function HeatOverlay({ overlay, selectedId, focusId, scale, onSelect }: OverlayProps) {
  const hatchId = `${useId()}-heat-hatch`;
  const hair = 1 / scale;
  return (
    <g>
      <defs>
        <pattern id={hatchId} width={hair * 8} height={hair * 8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d={`M0 0 V${hair * 8}`} stroke="#DC2626" strokeOpacity={0.45} strokeWidth={hair * 1.4} />
        </pattern>
      </defs>
      <ZoneGrid
        zones={overlay.zones}
        color={(v) => rampColor(RAMPS.heat, v)}
        opacity={0.6}
        selectedId={selectedId}
        focusId={focusId}
        scale={scale}
        label={(z) => `${z.id.replace("zone-", "Zone ")}, heat ${z.value >= 2 / 3 ? "high" : z.value >= 1 / 3 ? "moderate" : "low"}, index ${Math.round(35 + z.value * 60)} out of 100`}
        onSelect={onSelect}
        hatchAbove={2 / 3}
        hatchId={hatchId}
      />
    </g>
  );
});
