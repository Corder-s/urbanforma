import { memo } from "react";
import { featureProps } from "../../lib/featureProps";
import { pathFrom } from "../../lib/spatial";
import type { AreaObject } from "../../types/visualization.types";

interface BlockLayerProps {
  blocks: AreaObject[];
  selectedId: string | null;
  scale: number;
  onSelect: (id: string) => void;
  /** False renders the features as decoration (no selection, no tab stops). */
  interactive?: boolean;
}

/** Development block plates — drawn beneath water and landscape, like paper under the plan. */
export const BlockLayer = memo(function BlockLayer({ blocks, selectedId, scale, onSelect, interactive = true }: BlockLayerProps) {
  const hair = 1 / scale;
  return (
    <g data-layer="blocks">
      {blocks.map((b) => {
        const selected = b.id === selectedId;
        const plaza = /plaza/i.test(b.properties.category);
        const d = pathFrom(b.geometry.points, true);
        return (
          <g key={b.id} {...featureProps(interactive, b.id, `${b.name}, ${b.properties.category.toLowerCase()}`, selected, onSelect)}>
            <path d={d} fill={plaza ? "#F6EFE0" : "#FFFFFF"} stroke={selected ? "#1D4ED8" : plaza ? "#E2D3B4" : "#DCE6F2"} strokeWidth={selected ? hair * 2.5 : hair} strokeLinejoin="round" />
            {plaza && <path d={d} fill="url(#uf-viz-paving)" stroke="none" pointerEvents="none" />}
          </g>
        );
      })}
    </g>
  );
});
