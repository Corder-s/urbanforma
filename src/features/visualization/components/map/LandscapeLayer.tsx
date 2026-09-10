import { memo } from "react";
import { featureProps } from "../../lib/featureProps";
import { pathFrom } from "../../lib/spatial";
import type { AreaObject, TreeObject } from "../../types/visualization.types";

interface LandscapeLayerProps {
  parking: AreaObject[];
  green: AreaObject[];
  trees: TreeObject[];
  selectedId: string | null;
  scale: number;
  onSelect: (id: string) => void;
  /** False renders the features as decoration (no selection, no tab stops). */
  interactive?: boolean;
}

const AREA_STYLE: Record<string, { fill: string; stroke: string; pattern?: string }> = {
  parking: { fill: "#EEF1F6", stroke: "#CBD5E1", pattern: "url(#uf-viz-bays)" },
  green: { fill: "#D5EBD0", stroke: "#A9D3A0" },
  park: { fill: "#CDE8C5", stroke: "#9CCB92" },
  planting: { fill: "#BFDDB9", stroke: "#9CC495" },
};

function areaStyle(o: AreaObject) {
  if (o.type === "parking") return AREA_STYLE.parking;
  if (/planting/i.test(o.properties.category)) return AREA_STYLE.planting;
  if (o.layer === "parks") return AREA_STYLE.park;
  return AREA_STYLE.green;
}

/** Parking, green areas and trees (2-D). Blocks live in BlockLayer (under water). */
export const LandscapeLayer = memo(function LandscapeLayer({ parking, green, trees, selectedId, scale, onSelect, interactive = true }: LandscapeLayerProps) {
  const hair = 1 / scale;
  const areas = [...parking, ...green];
  return (
    <g data-layer="landscape">
      {areas.map((a) => {
        const s = areaStyle(a);
        const d = pathFrom(a.geometry.points, true);
        const selected = a.id === selectedId;
        return (
          <g key={a.id} {...featureProps(interactive, a.id, `${a.name}, ${a.properties.category.toLowerCase()}`, selected, onSelect)}>
            <path d={d} fill={s.fill} stroke={selected ? "#1D4ED8" : s.stroke} strokeWidth={selected ? hair * 2.5 : hair} strokeLinejoin="round" />
            {s.pattern && <path d={d} fill={s.pattern} stroke="none" pointerEvents="none" />}
          </g>
        );
      })}
      {trees.length > 0 && scale > 0.35 && (
        <g fill="#8FC487" stroke="#6FAA67" strokeWidth={hair} aria-hidden="true" pointerEvents="none">
          {trees.map((t) => (
            <circle key={t.id} cx={t.geometry.point.x} cy={t.geometry.point.y} r={t.properties.canopyM * 0.8} opacity={0.9} />
          ))}
        </g>
      )}
    </g>
  );
});
