import { memo } from "react";
import { featureProps } from "../../lib/featureProps";
import type { BasemapStyle } from "../../data/visualization.data";
import { pathFrom } from "../../lib/spatial";
import type { BoundaryObject, ContextBuildingObject, RoadObject, TerrainObject } from "../../types/visualization.types";

interface SiteLayerProps {
  boundary: BoundaryObject | null;
  contextBuildings: ContextBuildingObject[];
  contextRoads: RoadObject[];
  contours: TerrainObject[];
  basemap: BasemapStyle;
  scale: number;
  selected: boolean;
  showBoundary: boolean;
  onSelectBoundary: () => void;
  /** False renders the features as decoration (no selection, no tab stops). */
  interactive?: boolean;
}

/**
 * Ground context: contours, surrounding roads and buildings, then the site
 * plate + boundary (the only selectable element here). Context is muted so
 * the planned site reads as the subject of the map.
 */
export const SiteLayer = memo(function SiteLayer({ boundary, contextBuildings, contextRoads, contours, basemap, scale, selected, showBoundary, onSelectBoundary, interactive = true }: SiteLayerProps) {
  const hair = 1 / scale;
  return (
    <g data-layer="site">
      {contours.length > 0 && (
        <g fill="none" stroke={basemap.contour} strokeWidth={hair * (basemap.id === "terrain" ? 1.6 : 1.1)} strokeDasharray={basemap.id === "terrain" ? undefined : `${hair * 6} ${hair * 5}`} opacity={0.9} aria-hidden="true">
          {contours.map((c) => (
            <path key={c.id} d={pathFrom(c.geometry.points)} />
          ))}
        </g>
      )}

      {contextRoads.length > 0 && (
        <g fill="none" strokeLinecap="round" aria-hidden="true">
          {contextRoads.map((r) => (
            <g key={r.id}>
              <path d={pathFrom(r.geometry.points)} stroke={basemap.contextRoad.casing} strokeWidth={r.geometry.width} />
              <path d={pathFrom(r.geometry.points)} stroke={basemap.contextRoad.surface} strokeWidth={Math.max(r.geometry.width - 4, 1)} />
            </g>
          ))}
        </g>
      )}

      {contextBuildings.length > 0 && (
        <g fill={basemap.contextBuilding.fill} stroke={basemap.contextBuilding.stroke} strokeWidth={hair} aria-hidden="true">
          {contextBuildings.map((b) => (
            <rect key={b.id} x={b.geometry.center.x - b.geometry.width / 2} y={b.geometry.center.y - b.geometry.depth / 2} width={b.geometry.width} height={b.geometry.depth} rx={1.5} />
          ))}
        </g>
      )}

      {boundary && (
        <>
          <path d={pathFrom(boundary.geometry.points, true)} fill={basemap.site} fillOpacity={0.9} stroke="none" aria-hidden="true" />
          {showBoundary && (
            <g {...featureProps(interactive, boundary.id, "Site boundary", selected, onSelectBoundary)}>
              {/* generous invisible hit area along the outline */}
              <path d={pathFrom(boundary.geometry.points, true)} fill="none" stroke="transparent" strokeWidth={hair * 14} pointerEvents="stroke" />
              {selected && <path d={pathFrom(boundary.geometry.points, true)} fill="none" stroke="#2563EB" strokeOpacity={0.18} strokeWidth={hair * 10} strokeLinejoin="round" pointerEvents="none" />}
              <path
                d={pathFrom(boundary.geometry.points, true)}
                fill="none"
                stroke={selected ? "#1D4ED8" : "#2563EB"}
                strokeWidth={selected ? hair * 3 : hair * 2}
                strokeDasharray={selected ? undefined : `${hair * 9} ${hair * 5}`}
                strokeLinejoin="round"
                pointerEvents="none"
                className="transition-[stroke-width] duration-150 motion-reduce:transition-none"
              />
            </g>
          )}
        </>
      )}
    </g>
  );
});
