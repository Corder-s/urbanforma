import { memo } from "react";
import type { LayerVisibility, SiteDefinition } from "../../types/planning.types";
import { pathFrom } from "../../lib/geometry";

interface SiteLayerProps {
  site: SiteDefinition;
  layers: LayerVisibility;
  selected: boolean;
  onSelect: () => void;
  scale: number;
}

/**
 * Site boundary plus the muted surrounding context (blocks, streets,
 * contours, transit, utilities). Context is decorative and not selectable;
 * the boundary is the "site" selection target.
 */
export const SiteLayer = memo(function SiteLayer({ site, layers, selected, onSelect, scale }: SiteLayerProps) {
  const { context, boundary } = site;
  const hair = 1 / scale;

  return (
    <g data-layer="site">
      {/* terrain contours */}
      {layers.terrain && (
        <g fill="none" stroke="#C9D7EA" strokeWidth={hair * 1.2} strokeDasharray={`${hair * 6} ${hair * 5}`} opacity={0.9} aria-hidden="true">
          {context.contours.map((line, i) => (
            <path key={i} d={pathFrom(line)} />
          ))}
        </g>
      )}

      {/* surrounding roads */}
      {layers.roads && (
        <g fill="none" strokeLinecap="round" aria-hidden="true">
          {context.roads.map((r, i) => (
            <g key={i}>
              <path d={pathFrom(r.points)} stroke="#D3DDEB" strokeWidth={r.width} />
              <path d={pathFrom(r.points)} stroke="#F7FAFF" strokeWidth={r.width - 4} />
              <path d={pathFrom(r.points)} stroke="#E1E8F2" strokeWidth={hair} strokeDasharray={`${hair * 10} ${hair * 8}`} />
            </g>
          ))}
        </g>
      )}

      {/* surrounding blocks */}
      {layers.buildings && (
        <g fill="#E7EDF5" stroke="#D2DCEA" strokeWidth={hair} aria-hidden="true">
          {context.blocks.map((b, i) => (
            <rect key={i} x={b.x} y={b.y} width={b.width} height={b.height} rx={2} />
          ))}
        </g>
      )}

      {/* street trees along the northern & southern edges */}
      {layers.green && (
        <g fill="#BFDDB9" stroke="#9CC495" strokeWidth={hair} aria-hidden="true">
          {context.streetTrees.map((t, i) => (
            <circle key={i} cx={t.x} cy={t.y} r={3.2} />
          ))}
        </g>
      )}

      {/* utilities corridor */}
      {layers.utilities && (
        <g fill="none" stroke="#D97706" strokeWidth={hair * 1.6} strokeDasharray={`${hair * 3} ${hair * 4}`} opacity={0.8} aria-hidden="true">
          {context.utilities.map((line, i) => (
            <path key={i} d={pathFrom(line)} />
          ))}
        </g>
      )}

      {/* transit */}
      {layers.transit && (
        <g aria-hidden="true">
          <path d={pathFrom(context.transit.line)} fill="none" stroke="#FFFFFF" strokeWidth={hair * 7} strokeLinejoin="round" />
          <path d={pathFrom(context.transit.line)} fill="none" stroke="#06B6D4" strokeWidth={hair * 3.5} strokeDasharray={`${hair * 14} ${hair * 6}`} strokeLinejoin="round" />
          {context.transit.stations.map((s) => (
            <g key={s.name}>
              <circle cx={s.point.x} cy={s.point.y} r={hair * 7} fill="#FFFFFF" stroke="#06B6D4" strokeWidth={hair * 3} />
              <text x={s.point.x + hair * 11} y={s.point.y + hair * 4} fontSize={hair * 11} fontWeight={700} fill="#0E7490" style={{ fontFamily: "Inter, sans-serif" }}>
                {s.name}
              </text>
            </g>
          ))}
        </g>
      )}

      {/* developable block plates (under roads/buildings) */}
      <g fill="#FFFFFF" stroke="#DCE6F2" strokeWidth={hair} aria-hidden="true">
        {context.blockPlates.map((b, i) => (
          <rect key={i} x={b.x} y={b.y} width={b.width} height={b.height} rx={2} />
        ))}
      </g>

      {/* site boundary (selectable) */}
      <path
        d={pathFrom(boundary, true)}
        fill="#FFFFFF"
        fillOpacity={0.35}
        stroke={selected ? "#1D4ED8" : "#2563EB"}
        strokeWidth={selected ? hair * 3 : hair * 2}
        strokeDasharray={selected ? undefined : `${hair * 9} ${hair * 5}`}
        strokeLinejoin="round"
        className="cursor-pointer transition-[stroke-width] duration-150 motion-reduce:transition-none"
        role="button"
        tabIndex={0}
        aria-label={selected ? "Site boundary, selected" : "Site boundary"}
        aria-pressed={selected}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        data-object-id="site"
      />
      {selected && (
        <g fill="#FFFFFF" stroke="#1D4ED8" strokeWidth={hair * 2} aria-hidden="true">
          {boundary.map((p, i) => (
            <rect key={i} x={p.x - hair * 4} y={p.y - hair * 4} width={hair * 8} height={hair * 8} />
          ))}
        </g>
      )}
    </g>
  );
});
