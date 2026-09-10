import { memo } from "react";
import { POI_COLORS } from "../../../visualization/data/visualization.data";
import { pathFrom } from "../../../visualization/lib/spatial";
import type { PoiObject, RoadObject, TransitObject } from "../../../visualization/types/visualization.types";
import { RAMPS, ROAD_CLASS_COLOR } from "../../data/analysis.data";
import type { OverlayProps } from "./overlay.props";
import { ZoneGrid } from "./ZoneGrid";

const CLASS4 = (ramp: string[]) => (v: number) => ramp[Math.min(3, Math.floor(v * 4))];
const ACCESS_LABEL = ["limited", "fair", "good", "excellent"];

/**
 * Mobility overlays — accessibility zones (reach of major roads + transit),
 * road hierarchy (classified line weights) and walkability zones (with the
 * everyday destinations that drive them).
 */
export const MobilityOverlay = memo(function MobilityOverlay({ overlay, data, selectedId, focusId, scale, onSelect }: OverlayProps) {
  const hair = 1 / scale;
  const transit = data.objects.filter((o): o is TransitObject => o.type === "transit");
  const pois = data.objects.filter((o): o is PoiObject => o.type === "poi");

  if (overlay.type === "roads") {
    const roads = data.objects.filter((o): o is RoadObject => o.type === "road" || o.type === "path");
    const order: Record<string, number> = { Pedestrian: 0, Local: 1, Collector: 2, Arterial: 3 };
    const sorted = [...roads].sort((a, b) => order[a.properties.roadClass] - order[b.properties.roadClass]);
    return (
      <g data-layer="analysis-roads" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {sorted.map((r) => {
          const cls = r.properties.roadClass;
          const w = cls === "Arterial" ? r.geometry.width * 0.9 : cls === "Collector" ? r.geometry.width * 0.8 : cls === "Local" ? Math.max(3, r.geometry.width * 0.7) : Math.max(2, r.geometry.width * 0.9);
          const selected = r.id === selectedId;
          return (
            <g
              key={r.id}
              data-object-id={r.id}
              role="button"
              tabIndex={0}
              aria-label={`${r.name}, ${cls} road, ${Math.round(r.properties.lengthM)} metres${selected ? ", selected" : ""}`}
              aria-pressed={selected}
              className="cursor-pointer"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(r.id);
                }
              }}
            >
              <path d={pathFrom(r.geometry.points)} stroke="#FFFFFF" strokeWidth={w + hair * 3} opacity={0.9} />
              <path d={pathFrom(r.geometry.points)} stroke={ROAD_CLASS_COLOR[cls]} strokeWidth={w} strokeDasharray={cls === "Pedestrian" ? `${hair * 6} ${hair * 5}` : undefined} />
              {selected && <path d={pathFrom(r.geometry.points)} stroke="#0F172A" strokeWidth={w + hair * 2} strokeOpacity={0.5} fill="none" />}
            </g>
          );
        })}
        {/* intersections: shared vertices between two or more roads */}
        <g aria-hidden="true" pointerEvents="none">
          {intersections(roads).map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={hair * 3.2} fill="#0F172A" stroke="#FFFFFF" strokeWidth={hair * 1.2} />
          ))}
        </g>
      </g>
    );
  }

  const ramp = overlay.type === "walkability" ? RAMPS.walkability : RAMPS.accessibility;
  const noun = overlay.type === "walkability" ? "walkability" : "accessibility";
  return (
    <g>
      <ZoneGrid zones={overlay.zones} color={CLASS4(ramp)} opacity={0.5} selectedId={selectedId} focusId={focusId} scale={scale} label={(z) => `${z.id.replace("zone-", "Zone ")}, ${noun} ${ACCESS_LABEL[Math.min(3, Math.floor(z.value * 4))]}`} onSelect={onSelect} />
      <g aria-hidden="true" pointerEvents="none">
        {overlay.type === "accessibility" &&
          transit.map((t) => (
            <g key={t.id}>
              <path d={pathFrom(t.geometry.points)} fill="none" stroke="#1D4ED8" strokeWidth={hair * 2.2} strokeDasharray={`${hair * 10} ${hair * 6}`} />
              {t.properties.stations.map((s, i) => (
                <g key={i}>
                  <circle cx={s.point.x} cy={s.point.y} r={hair * 7} fill="#FFFFFF" stroke="#1D4ED8" strokeWidth={hair * 2} />
                  <circle cx={s.point.x} cy={s.point.y} r={hair * 3} fill="#1D4ED8" />
                </g>
              ))}
            </g>
          ))}
        {overlay.type === "walkability" &&
          pois.map((p) => (
            <g key={p.id}>
              <circle cx={p.geometry.point.x} cy={p.geometry.point.y} r={hair * 6} fill="#FFFFFF" stroke={POI_COLORS[p.properties.category] ?? "#1D4ED8"} strokeWidth={hair * 2} />
              <circle cx={p.geometry.point.x} cy={p.geometry.point.y} r={hair * 2.5} fill={POI_COLORS[p.properties.category] ?? "#1D4ED8"} />
            </g>
          ))}
      </g>
    </g>
  );
});

/** Demo intersection detection: shared vertices (within 3 m) between different roads. */
function intersections(roads: RoadObject[]): { x: number; y: number }[] {
  const seen = new Map<string, { x: number; y: number; roads: Set<string> }>();
  for (const r of roads) {
    for (const p of r.geometry.points) {
      const key = `${Math.round(p.x / 3)}:${Math.round(p.y / 3)}`;
      const e = seen.get(key);
      if (e) e.roads.add(r.id);
      else seen.set(key, { x: p.x, y: p.y, roads: new Set([r.id]) });
    }
  }
  return [...seen.values()].filter((e) => e.roads.size >= 2).map(({ x, y }) => ({ x, y }));
}
