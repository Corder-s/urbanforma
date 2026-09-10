import { memo } from "react";
import { POI_COLORS } from "../../data/visualization.data";
import { featureProps } from "../../lib/featureProps";
import type { PoiObject } from "../../types/visualization.types";

interface PoiLayerProps {
  pois: PoiObject[];
  selectedId: string | null;
  scale: number;
  showLabels: boolean;
  onSelect: (id: string) => void;
  /** False renders the pins as decoration (no selection, no tab stops). */
  interactive?: boolean;
}

/** Points of interest as fixed-size pins (screen-space sized via 1/scale). */
export const PoiLayer = memo(function PoiLayer({ pois, selectedId, scale, showLabels, onSelect, interactive = true }: PoiLayerProps) {
  const hair = 1 / scale;
  return (
    <g data-layer="poi">
      {pois.map((p) => {
        const { x, y } = p.geometry.point;
        const color = POI_COLORS[p.properties.category] ?? "#2563EB";
        const selected = p.id === selectedId;
        const r = hair * 7;
        return (
          <g key={p.id} {...featureProps(interactive, p.id, `${p.name}, ${p.properties.category.toLowerCase()} point of interest`, selected, onSelect)}>
            {selected && <circle cx={x} cy={y} r={r * 2.2} fill={color} opacity={0.18} />}
            <circle cx={x} cy={y - r * 1.6} r={r} fill="#FFFFFF" stroke={selected ? "#1D4ED8" : color} strokeWidth={hair * 2.4} />
            <circle cx={x} cy={y - r * 1.6} r={r * 0.42} fill={color} />
            <path d={`M${x - r * 0.55} ${y - r * 0.9} L${x} ${y} L${x + r * 0.55} ${y - r * 0.9} Z`} fill={selected ? "#1D4ED8" : color} />
            {showLabels && (
              <text x={x} y={y + hair * 12} textAnchor="middle" fontSize={hair * 10} fontWeight={700} fill="#0F172A" pointerEvents="none" style={{ fontFamily: "Inter, sans-serif" }}>
                {p.name}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
});
