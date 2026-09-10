import { memo } from "react";
import { featureProps } from "../../lib/featureProps";
import { pathFrom } from "../../lib/spatial";
import type { RoadObject, TransitObject, UtilityObject } from "../../types/visualization.types";

interface RoadLayerProps {
  roads: RoadObject[];
  transit: TransitObject[];
  utilities: UtilityObject[];
  selectedId: string | null;
  scale: number;
  showLabels: boolean;
  onSelect: (id: string) => void;
  /** False renders the features as decoration (no selection, no tab stops). */
  interactive?: boolean;
}

const ROAD_STYLE = {
  Arterial: { casing: "#C6D2E3", surface: "#FFFFFF", centre: "#D9AE5A" },
  Collector: { casing: "#CDD8E7", surface: "#FFFFFF", centre: "#E1E8F2" },
  Local: { casing: "#D4DEEB", surface: "#FBFCFE", centre: "#E6ECF4" },
  Pedestrian: { casing: "#D8E2EE", surface: "#F4F7FB", centre: "#E6ECF4" },
} as const;

/** Site streets, pedestrian paths, transit alignment and utility corridors (2-D). */
export const RoadLayer = memo(function RoadLayer({ roads, transit, utilities, selectedId, scale, showLabels, onSelect, interactive = true }: RoadLayerProps) {
  const hair = 1 / scale;
  return (
    <g data-layer="roads" strokeLinecap="round" strokeLinejoin="round" fill="none">
      {utilities.map((u) => {
        const selected = u.id === selectedId;
        return (
          <g key={u.id} {...featureProps(interactive, u.id, `${u.name}, ${u.properties.network.toLowerCase()}`, selected, onSelect)}>
            <path d={pathFrom(u.geometry.points)} stroke="transparent" strokeWidth={hair * 12} />
            <path d={pathFrom(u.geometry.points)} stroke={selected ? "#1D4ED8" : "#D97706"} strokeWidth={hair * 1.8} strokeDasharray={`${hair * 3} ${hair * 4}`} opacity={0.85} />
          </g>
        );
      })}

      {roads.map((r) => {
        const isPath = r.type === "path";
        const s = ROAD_STYLE[r.properties.roadClass];
        const d = pathFrom(r.geometry.points);
        const selected = r.id === selectedId;
        const w = r.geometry.width;
        return (
          <g key={r.id} {...featureProps(interactive, r.id, `${r.name}, ${isPath ? "pedestrian path" : `${r.properties.roadClass.toLowerCase()} road`}`, selected, onSelect)}>
            {selected && <path d={d} stroke="#2563EB" strokeOpacity={0.3} strokeWidth={w + hair * 10} />}
            {isPath ? (
              <>
                <path d={d} stroke="transparent" strokeWidth={Math.max(w, hair * 12)} />
                <path d={d} stroke="#FFFFFF" strokeWidth={w + hair * 2} />
                <path d={d} stroke="#B9A98A" strokeWidth={w} strokeLinecap="butt" strokeDasharray={`${hair * 7} ${hair * 5}`} />
              </>
            ) : (
              <>
                <path d={d} stroke={s.casing} strokeWidth={w} />
                <path d={d} stroke={s.surface} strokeWidth={Math.max(w - 3, 1)} />
                <path d={d} stroke={s.centre} strokeWidth={hair * 1.2} strokeDasharray={r.properties.roadClass === "Arterial" ? undefined : `${hair * 8} ${hair * 7}`} />
              </>
            )}
          </g>
        );
      })}

      {transit.map((t) => {
        const selected = t.id === selectedId;
        return (
          <g key={t.id} {...featureProps(interactive, t.id, `${t.name}, ${t.properties.mode.toLowerCase()} line`, selected, onSelect)}>
            <path d={pathFrom(t.geometry.points)} stroke="#FFFFFF" strokeWidth={hair * 8} />
            <path d={pathFrom(t.geometry.points)} stroke={selected ? "#1D4ED8" : "#06B6D4"} strokeWidth={hair * 3.5} strokeDasharray={`${hair * 14} ${hair * 6}`} />
            {t.properties.stations.map((s) => (
              <g key={s.name}>
                <circle cx={s.point.x} cy={s.point.y} r={hair * 7} fill="#FFFFFF" stroke="#06B6D4" strokeWidth={hair * 3} />
                {showLabels && (
                  <text x={s.point.x + hair * 11} y={s.point.y + hair * 4} fontSize={hair * 11} fontWeight={700} fill="#0E7490" stroke="none" style={{ fontFamily: "Inter, sans-serif" }}>
                    {s.name}
                  </text>
                )}
              </g>
            ))}
          </g>
        );
      })}
    </g>
  );
});
