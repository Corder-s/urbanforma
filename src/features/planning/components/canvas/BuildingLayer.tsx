import { memo } from "react";
import type { BuildingObject } from "../../types/planning.types";
import { EXISTING_BUILDING, LAND_USE_COLORS } from "../../data/tools.data";

interface BuildingLayerProps {
  buildings: BuildingObject[];
  selectedId: string | null;
  scale: number;
  showLabels: boolean;
  onSelect: (id: string) => void;
  interactive: boolean;
}

/**
 * Building footprints coloured by land use, with a soft drop shadow that
 * grows with height so massing reads at a glance. Existing buildings are
 * neutral so proposals stand out. Every building is a focusable button.
 */
export const BuildingLayer = memo(function BuildingLayer({ buildings, selectedId, scale, showLabels, onSelect, interactive }: BuildingLayerProps) {
  const hair = 1 / scale;
  const labelVisible = showLabels && scale > 0.9;
  return (
    <g data-layer="buildings">
      {buildings.map((b) => {
        const existing = b.properties.status === "Existing";
        const c = existing ? EXISTING_BUILDING : LAND_USE_COLORS[b.properties.landUse];
        const selected = b.id === selectedId;
        const x = b.x - b.width / 2;
        const y = b.y - b.height / 2;
        const shadow = Math.min(2 + b.properties.floors * 0.25, 7);
        const transform = b.rotation ? `rotate(${b.rotation} ${b.x} ${b.y})` : undefined;
        return (
          <g
            key={b.id}
            data-object-id={b.id}
            transform={transform}
            role="button"
            tabIndex={interactive ? 0 : -1}
            aria-label={`Building ${b.name}, ${b.properties.landUse.toLowerCase()}, ${b.properties.floors} floors${selected ? ", selected" : ""}`}
            aria-pressed={selected}
            className={interactive ? "cursor-pointer" : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(b.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(b.id);
              }
            }}
          >
            {/* massing shadow */}
            <rect x={x + shadow * 0.6} y={y + shadow} width={b.width} height={b.height} rx={1.2} fill="#0F172A" opacity={0.12} />
            <rect
              x={x}
              y={y}
              width={b.width}
              height={b.height}
              rx={1.2}
              fill={c.fill}
              stroke={selected ? "#1D4ED8" : c.stroke}
              strokeWidth={selected ? hair * 2.5 : hair * 1.2}
              className="transition-[stroke-width] duration-150 motion-reduce:transition-none"
            />
            {/* roof detail for taller buildings */}
            {b.properties.floors >= 10 && (
              <rect x={x + b.width * 0.2} y={y + b.height * 0.22} width={b.width * 0.6} height={b.height * 0.56} rx={1} fill="none" stroke={c.stroke} strokeWidth={hair} opacity={0.7} />
            )}
            {selected && (
              <rect
                x={x - hair * 4}
                y={y - hair * 4}
                width={b.width + hair * 8}
                height={b.height + hair * 8}
                rx={2}
                fill="none"
                stroke="#2563EB"
                strokeWidth={hair * 1.5}
                strokeDasharray={`${hair * 5} ${hair * 4}`}
                className="animate-fade-in motion-reduce:animate-none"
                pointerEvents="none"
              />
            )}
            {labelVisible && b.width * scale > 34 && (
              <text
                x={b.x}
                y={b.y + hair * 3.5}
                textAnchor="middle"
                fontSize={Math.max(hair * 9.5, 3)}
                fontWeight={700}
                fill="#334155"
                pointerEvents="none"
                style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.02em" }}
              >
                {b.name}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
});
