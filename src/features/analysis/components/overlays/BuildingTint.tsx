import { memo } from "react";
import type { BuildingObject } from "../../../visualization/types/visualization.types";
import type { ObjectValues } from "../../types/analysis.types";

interface BuildingTintProps {
  buildings: BuildingObject[];
  values: ObjectValues;
  color: (value: number, b: BuildingObject) => string;
  selectedId: string | null;
  scale: number;
  label: (b: BuildingObject, value: number) => string;
  onSelect: (id: string) => void;
  /** Mark the strongest buildings with a dot (carbon contributors). */
  markAbove?: number;
  markColor?: string;
}

/**
 * Re-colours building footprints by an analysis value. Drawn on top of the
 * (muted) base buildings so the footprint geometry stays the single source.
 */
export const BuildingTint = memo(function BuildingTint({ buildings, values, color, selectedId, scale, label, onSelect, markAbove, markColor = "#334155" }: BuildingTintProps) {
  const hair = 1 / scale;
  return (
    <g data-layer="analysis-buildings">
      {buildings.map((b) => {
        const v = values[b.id];
        if (v === undefined) return null;
        const { center, width, depth, rotation } = b.geometry;
        const x = center.x - width / 2;
        const y = center.y - depth / 2;
        const selected = b.id === selectedId;
        const transform = rotation ? `rotate(${rotation} ${center.x} ${center.y})` : undefined;
        return (
          <g
            key={b.id}
            data-object-id={b.id}
            transform={transform}
            role="button"
            tabIndex={0}
            aria-label={`${label(b, v)}${selected ? ", selected" : ""}`}
            aria-pressed={selected}
            className="cursor-pointer"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(b.id);
              }
            }}
          >
            <rect x={x} y={y} width={width} height={depth} rx={1.2} fill={color(v, b)} stroke={selected ? "#1D4ED8" : "#0F172A"} strokeOpacity={selected ? 1 : 0.28} strokeWidth={selected ? hair * 2.5 : hair} />
            {markAbove !== undefined && v >= markAbove && <circle cx={center.x} cy={center.y} r={Math.min(width, depth) * 0.16 + hair * 2} fill={markColor} stroke="#FFFFFF" strokeWidth={hair} pointerEvents="none" />}
            {selected && <rect x={x - hair * 4} y={y - hair * 4} width={width + hair * 8} height={depth + hair * 8} rx={2} fill="none" stroke="#2563EB" strokeWidth={hair * 1.5} strokeDasharray={`${hair * 4} ${hair * 3}`} pointerEvents="none" />}
          </g>
        );
      })}
    </g>
  );
});
