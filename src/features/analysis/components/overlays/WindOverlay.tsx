import { memo } from "react";
import { RAMPS } from "../../data/analysis.data";
import type { OverlayProps } from "./overlay.props";
import { ZoneGrid } from "./ZoneGrid";

/**
 * Wind: a soft comfort tint per zone plus a directional arrow field. Arrows
 * lengthen with relative speed; the prevailing bearing is stated in the
 * legend and the inspector, so the picture is never the only message.
 */
export const WindOverlay = memo(function WindOverlay({ overlay, selectedId, focusId, scale, onSelect }: OverlayProps) {
  const hair = 1 / scale;
  const classColor = (v: number) => (v >= 2 / 3 ? RAMPS.wind[3] : v >= 1 / 3 ? RAMPS.wind[2] : RAMPS.wind[1]);
  const cell = overlay.zones[0]?.bounds;
  const base = cell ? Math.min(cell.width, cell.height) : 80;
  return (
    <g>
      <ZoneGrid
        zones={overlay.zones}
        color={classColor}
        opacity={0.28}
        selectedId={selectedId}
        focusId={focusId}
        scale={scale}
        label={(z) => `${z.id.replace("zone-", "Zone ")}, wind ${z.value >= 2 / 3 ? "higher than comfortable" : z.value >= 1 / 3 ? "comfortable" : "lower"}`}
        onSelect={onSelect}
      />
      {overlay.vectors && (
        <g aria-hidden="true" pointerEvents="none" strokeLinecap="round" strokeLinejoin="round">
          {overlay.vectors.map((v, i) => {
            const len = base * (0.28 + v.speed * 0.42);
            const rad = ((v.bearing - 90) * Math.PI) / 180; // bearing 0 = north (−y on the map)
            const dx = Math.cos(rad) * len;
            const dy = Math.sin(rad) * len;
            const x1 = v.origin.x - dx / 2;
            const y1 = v.origin.y - dy / 2;
            const x2 = v.origin.x + dx / 2;
            const y2 = v.origin.y + dy / 2;
            const head = Math.max(hair * 5, len * 0.22);
            const a1 = rad + Math.PI * 0.82;
            const a2 = rad - Math.PI * 0.82;
            const color = v.speed >= 2 / 3 ? "#075985" : v.speed >= 1 / 3 ? "#0369A1" : "#38BDF8";
            const w = hair * (1.4 + v.speed * 1.6);
            return (
              <g key={i} stroke={color} fill="none" opacity={0.9}>
                <path d={`M${x1} ${y1} L${x2} ${y2}`} stroke="#FFFFFF" strokeWidth={w + hair * 2} opacity={0.7} />
                <path d={`M${x1} ${y1} L${x2} ${y2}`} strokeWidth={w} />
                <path d={`M${x2 + Math.cos(a1) * head} ${y2 + Math.sin(a1) * head} L${x2} ${y2} L${x2 + Math.cos(a2) * head} ${y2 + Math.sin(a2) * head}`} strokeWidth={w} />
              </g>
            );
          })}
        </g>
      )}
    </g>
  );
});
