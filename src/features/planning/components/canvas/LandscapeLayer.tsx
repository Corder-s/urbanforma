import { memo, useMemo } from "react";
import type { AreaObject } from "../../types/planning.types";
import { boundsOf, pathFrom, pointInPolygon } from "../../lib/geometry";

interface LandscapeLayerProps {
  areas: AreaObject[]; // green, tree-zone, parking, public-space, parcel
  selectedId: string | null;
  scale: number;
  showGreen: boolean;
  onSelect: (id: string) => void;
  interactive: boolean;
}

const STYLE: Record<AreaObject["type"], { fill: string; stroke: string; dash?: boolean }> = {
  green: { fill: "#D5EBD0", stroke: "#A9CFA1" },
  "tree-zone": { fill: "#B9DDB2", stroke: "#8DBF84" },
  water: { fill: "#CFE4F7", stroke: "#9EC5E8" },
  parking: { fill: "#E9EDF3", stroke: "#C2CCDA" },
  "public-space": { fill: "#F3EEE3", stroke: "#D8CDB3" },
  parcel: { fill: "none", stroke: "#2563EB", dash: true },
};

/** Deterministic tree dots inside a polygon (cheap, no per-tree elements when zoomed out). */
function treeDots(poly: { x: number; y: number }[], spacing: number, seed: number) {
  const b = boundsOf(poly);
  const dots: { x: number; y: number; r: number }[] = [];
  let k = seed;
  for (let y = b.y + spacing / 2; y < b.y + b.height; y += spacing) {
    for (let x = b.x + spacing / 2; x < b.x + b.width; x += spacing) {
      k = (k * 9301 + 49297) % 233280;
      const jx = ((k / 233280) - 0.5) * spacing * 0.6;
      k = (k * 9301 + 49297) % 233280;
      const jy = ((k / 233280) - 0.5) * spacing * 0.6;
      const p = { x: x + jx, y: y + jy };
      if (pointInPolygon(p, poly)) dots.push({ ...p, r: 1.6 + (k % 10) / 12 });
    }
  }
  return dots;
}

/** Parks, tree zones, parking lots, plazas and parcel outlines. */
export const LandscapeLayer = memo(function LandscapeLayer({ areas, selectedId, scale, showGreen, onSelect, interactive }: LandscapeLayerProps) {
  const hair = 1 / scale;
  const detailed = scale > 0.7;

  const trees = useMemo(
    () => (detailed ? areas.filter((a) => a.type === "tree-zone").map((a, i) => ({ id: a.id, dots: treeDots(a.points, 7, i + 3) })) : []),
    [areas, detailed]
  );

  return (
    <g data-layer="landscape">
      {areas.map((a) => {
        if (!showGreen && (a.type === "green" || a.type === "tree-zone")) return null;
        const s = STYLE[a.type];
        const selected = a.id === selectedId;
        const d = pathFrom(a.points, true);
        return (
          <g
            key={a.id}
            data-object-id={a.id}
            role="button"
            tabIndex={interactive ? 0 : -1}
            aria-label={`${a.name}, ${a.properties.category.toLowerCase()}${selected ? ", selected" : ""}`}
            aria-pressed={selected}
            className={interactive ? "cursor-pointer" : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(a.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(a.id);
              }
            }}
          >
            <path
              d={d}
              fill={s.fill}
              fillOpacity={a.type === "parcel" ? 0.04 : 1}
              stroke={selected ? "#1D4ED8" : s.stroke}
              strokeWidth={selected ? hair * 2.5 : hair * 1.2}
              strokeDasharray={s.dash ? `${hair * 6} ${hair * 4}` : undefined}
              strokeLinejoin="round"
            />
            {/* parking bays */}
            {a.type === "parking" && detailed && (
              <path
                d={pathFrom(a.points, true)}
                fill="url(#uf-parking-bays)"
                stroke="none"
                opacity={0.9}
                pointerEvents="none"
              />
            )}
            {/* plaza paving */}
            {a.type === "public-space" && detailed && (
              <path d={d} fill="url(#uf-paving)" stroke="none" pointerEvents="none" />
            )}
            {a.type === "tree-zone" && (
              <g fill="#6FAE66" stroke="#4F8F48" strokeWidth={hair * 0.6} pointerEvents="none" aria-hidden="true">
                {trees.find((t) => t.id === a.id)?.dots.map((t, i) => (
                  <circle key={i} cx={t.x} cy={t.y} r={t.r} />
                ))}
              </g>
            )}
            {selected && (
              <path
                d={d}
                fill="none"
                stroke="#2563EB"
                strokeWidth={hair * 1.5}
                strokeDasharray={`${hair * 5} ${hair * 4}`}
                pointerEvents="none"
                className="animate-fade-in motion-reduce:animate-none"
              />
            )}
          </g>
        );
      })}
    </g>
  );
});
