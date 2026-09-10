import { memo } from "react";
import { pathFrom } from "../../../visualization/lib/spatial";
import type { AreaObject, TreeObject } from "../../../visualization/types/visualization.types";
import { RAMPS } from "../../data/analysis.data";
import { rampColor } from "../../lib/analysis.engine";
import type { OverlayProps } from "./overlay.props";
import { ZoneGrid } from "./ZoneGrid";

/**
 * Green coverage / open space: a light zone tint (share of green per zone or
 * walk time to open space) plus emphasised outlines around the actual parks,
 * green areas and tree canopies so the map explains *where* the coverage is.
 */
export const GreenOverlay = memo(function GreenOverlay({ overlay, data, selectedId, focusId, scale, onSelect }: OverlayProps) {
  const hair = 1 / scale;
  const highlight = new Set(overlay.highlight ?? []);
  const areas = data.objects.filter((o): o is AreaObject => (o.type === "green" || o.type === "block") && highlight.has(o.id));
  const trees = overlay.type === "green" ? data.objects.filter((o): o is TreeObject => o.type === "tree" && highlight.has(o.id)) : [];
  const isOpenSpace = overlay.type === "openspace";
  const color = isOpenSpace ? (v: number) => (v >= 2 / 3 ? RAMPS.openspace[2] : v >= 1 / 3 ? RAMPS.openspace[1] : RAMPS.openspace[0]) : (v: number) => rampColor(RAMPS.green, v);
  const label = isOpenSpace
    ? (z: { id: string; value: number }) => `${z.id.replace("zone-", "Zone ")}, open space ${z.value >= 2 / 3 ? "over 10 minutes" : z.value >= 1 / 3 ? "5 to 10 minutes" : "within 5 minutes"} walk`
    : (z: { id: string; value: number }) => `${z.id.replace("zone-", "Zone ")}, green share ${Math.round((z.value * overlay.max))}%`;
  return (
    <g>
      <ZoneGrid zones={overlay.zones} color={color} opacity={isOpenSpace ? 0.42 : 0.5} selectedId={selectedId} focusId={focusId} scale={scale} label={label} onSelect={onSelect} />
      <g aria-hidden="true" pointerEvents="none">
        {areas.map((a) => (
          <path key={a.id} d={pathFrom(a.geometry.points, true)} fill="#22C55E" fillOpacity={0.22} stroke="#15803D" strokeWidth={hair * 1.8} strokeLinejoin="round" />
        ))}
        {trees.map((t) => (
          <circle key={t.id} cx={t.geometry.point.x} cy={t.geometry.point.y} r={t.properties.canopyM} fill="#16A34A" fillOpacity={0.35} stroke="#15803D" strokeWidth={hair * 0.9} />
        ))}
      </g>
    </g>
  );
});
