import { memo, useMemo } from "react";
import type { AreaObject, LinearObject, Point } from "../../types/planning.types";
import { pathFrom, pointInPolygon } from "../../lib/geometry";

interface RoadLayerProps {
  roads: LinearObject[];
  paths: LinearObject[];
  /** Water bodies — streets crossing them get a bridge deck (visual only). */
  water?: AreaObject[];
  selectedId: string | null;
  scale: number;
  onSelect: (id: string) => void;
  interactive: boolean;
}

const ROAD_STYLE = {
  Arterial: { casing: "#C6D2E3", surface: "#FFFFFF", centre: "#D9AE5A" },
  Collector: { casing: "#CDD8E7", surface: "#FFFFFF", centre: "#E1E8F2" },
  Local: { casing: "#D4DEEB", surface: "#FBFCFE", centre: "#E6ECF4" },
  Pedestrian: { casing: "#D8E2EE", surface: "#F4F7FB", centre: "#E6ECF4" },
} as const;

/** Site streets (casing + surface + centreline) and pedestrian paths. */
/** Segments of a two-point street that lie over water (sampled; demo-grade). */
function bridgeSpans(points: Point[], water: AreaObject[]): [Point, Point][] {
  if (points.length < 2 || water.length === 0) return [];
  const spans: [Point, Point][] = [];
  const a = points[0];
  const b = points[points.length - 1];
  const steps = 64;
  let start: Point | null = null;
  for (let i = 0; i <= steps; i++) {
    const p = { x: a.x + ((b.x - a.x) * i) / steps, y: a.y + ((b.y - a.y) * i) / steps };
    const wet = water.some((w) => pointInPolygon(p, w.points));
    if (wet && !start) start = p;
    if ((!wet || i === steps) && start) {
      spans.push([start, p]);
      start = null;
    }
  }
  return spans;
}

export const RoadLayer = memo(function RoadLayer({ roads, paths, water = [], selectedId, scale, onSelect, interactive }: RoadLayerProps) {
  const hair = 1 / scale;
  const bridges = useMemo(
    () => roads.flatMap((r) => bridgeSpans(r.points, water).map((span, i) => ({ id: `${r.id}-bridge-${i}`, span, width: r.width }))),
    [roads, water]
  );
  return (
    <g data-layer="roads" strokeLinecap="round" strokeLinejoin="round" fill="none">
      {roads.map((r) => {
        const s = ROAD_STYLE[r.properties.roadClass];
        const d = pathFrom(r.points);
        const selected = r.id === selectedId;
        return (
          <g
            key={r.id}
            data-object-id={r.id}
            role="button"
            tabIndex={interactive ? 0 : -1}
            aria-label={`${r.name}, ${r.properties.roadClass.toLowerCase()} road${selected ? ", selected" : ""}`}
            aria-pressed={selected}
            className={interactive ? "cursor-pointer" : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(r.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(r.id);
              }
            }}
          >
            {selected && <path d={d} stroke="#2563EB" strokeOpacity={0.35} strokeWidth={r.width + hair * 10} />}
            <path d={d} stroke={s.casing} strokeWidth={r.width} />
            <path d={d} stroke={s.surface} strokeWidth={Math.max(r.width - 3, 1)} />
            <path d={d} stroke={s.centre} strokeWidth={hair * 1.2} strokeDasharray={r.properties.roadClass === "Arterial" ? undefined : `${hair * 8} ${hair * 7}`} />
          </g>
        );
      })}

      {/* bridge decks where streets cross water (decorative) */}
      <g aria-hidden="true" pointerEvents="none">
        {bridges.map((b) => {
          const d = pathFrom(b.span);
          return (
            <g key={b.id}>
              <path d={d} stroke="#94A3B8" strokeWidth={b.width + hair * 3} strokeLinecap="butt" />
              <path d={d} stroke="#F8FAFC" strokeWidth={b.width - hair * 1} strokeLinecap="butt" />
              <path d={d} stroke="#CBD5E1" strokeWidth={hair * 1.2} strokeDasharray={`${hair * 3} ${hair * 3}`} strokeLinecap="butt" />
            </g>
          );
        })}
      </g>

      {paths.map((p) => {
        const d = pathFrom(p.points);
        const selected = p.id === selectedId;
        return (
          <g
            key={p.id}
            data-object-id={p.id}
            role="button"
            tabIndex={interactive ? 0 : -1}
            aria-label={`${p.name}, pedestrian path${selected ? ", selected" : ""}`}
            aria-pressed={selected}
            className={interactive ? "cursor-pointer" : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(p.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(p.id);
              }
            }}
          >
            {selected && <path d={d} stroke="#2563EB" strokeOpacity={0.35} strokeWidth={p.width + hair * 10} />}
            {/* wide invisible hit target */}
            <path d={d} stroke="transparent" strokeWidth={Math.max(p.width, hair * 12)} />
            <path d={d} stroke="#FFFFFF" strokeWidth={p.width + hair * 2} />
            <path d={d} stroke="#B9A98A" strokeWidth={p.width} strokeLinecap="butt" strokeDasharray={`${hair * 7} ${hair * 5}`} />
          </g>
        );
      })}
    </g>
  );
});
