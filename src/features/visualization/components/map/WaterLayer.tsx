import { memo } from "react";
import { featureProps } from "../../lib/featureProps";
import type { BasemapStyle } from "../../data/visualization.data";
import { pathFrom } from "../../lib/spatial";
import type { AreaObject } from "../../types/visualization.types";

interface WaterLayerProps {
  water: AreaObject[];
  basemap: BasemapStyle;
  selectedId: string | null;
  scale: number;
  onSelect: (id: string) => void;
  /** False renders the features as decoration (no selection, no tab stops). */
  interactive?: boolean;
}

export const WaterLayer = memo(function WaterLayer({ water, basemap, selectedId, scale, onSelect, interactive = true }: WaterLayerProps) {
  const hair = 1 / scale;
  return (
    <g data-layer="water">
      {water.map((w) => {
        const d = pathFrom(w.geometry.points, true);
        const selected = w.id === selectedId;
        return (
          <g key={w.id} {...featureProps(interactive, w.id, `${w.name}, water`, selected, onSelect)}>
            <path d={d} fill={basemap.water.fill} stroke={selected ? "#1D4ED8" : basemap.water.stroke} strokeWidth={selected ? hair * 2.5 : hair * 1.4} strokeLinejoin="round" />
            <path d={d} fill="url(#uf-viz-ripple)" stroke="none" pointerEvents="none" />
          </g>
        );
      })}
    </g>
  );
});
