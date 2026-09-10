import { memo } from "react";
import type { AreaObject } from "../../types/planning.types";
import { pathFrom } from "../../lib/geometry";

interface WaterLayerProps {
  water: AreaObject[];
  selectedId: string | null;
  scale: number;
  onSelect: (id: string) => void;
  interactive: boolean;
}

/** Rivers, lakes, coast and ponds — drawn beneath everything else. */
export const WaterLayer = memo(function WaterLayer({ water, selectedId, scale, onSelect, interactive }: WaterLayerProps) {
  const hair = 1 / scale;
  return (
    <g data-layer="water">
      {water.map((w) => {
        const d = pathFrom(w.points, true);
        const selected = w.id === selectedId;
        return (
          <g
            key={w.id}
            data-object-id={w.id}
            role="button"
            tabIndex={interactive ? 0 : -1}
            aria-label={`${w.name}, ${w.properties.category.toLowerCase()}${selected ? ", selected" : ""}`}
            aria-pressed={selected}
            className={interactive ? "cursor-pointer" : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(w.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(w.id);
              }
            }}
          >
            <path d={d} fill="#CFE4F7" stroke={selected ? "#1D4ED8" : "#A9CCEB"} strokeWidth={selected ? hair * 2.5 : hair * 1.4} strokeLinejoin="round" />
            <path d={d} fill="url(#uf-water-ripple)" stroke="none" pointerEvents="none" />
            {selected && (
              <path d={d} fill="none" stroke="#2563EB" strokeWidth={hair * 1.5} strokeDasharray={`${hair * 5} ${hair * 4}`} pointerEvents="none" className="animate-fade-in motion-reduce:animate-none" />
            )}
          </g>
        );
      })}
    </g>
  );
});
