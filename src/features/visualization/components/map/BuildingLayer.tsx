import { memo } from "react";
import { featureProps } from "../../lib/featureProps";
import { EXISTING_STYLE, LAND_USE_STYLE } from "../../data/visualization.data";
import { heightLabelColor, heightRamp, type PlanShadow } from "../../lib/lighting";
import type { BuildingObject, BuildingStyle } from "../../types/visualization.types";

interface BuildingLayerProps {
  buildings: BuildingObject[];
  selectedId: string | null;
  scale: number;
  showLabels: boolean;
  showHeights: boolean;
  showShadows: boolean;
  /** 0–100; a lower sun casts longer plan shadows (legacy single-axis model). */
  sunIntensity: number;
  /** Directional plan shadow from the shared sun model (Step 15). Overrides `sunIntensity` when given. */
  shadow?: PlanShadow;
  /** Building appearance: simple massing, architectural, height ramp or land-use colours. */
  style?: BuildingStyle;
  /** Exaggerate the height cues (longer shadows, stronger roof insets). */
  heightEmphasis?: boolean;
  onSelect: (id: string) => void;
  /** False renders the features as decoration (no selection, no tab stops). */
  interactive?: boolean;
}

const SIMPLE = { fill: "#E9EEF5", stroke: "#B8C4D6" };

/**
 * Buildings in plan. Height is communicated by the drop shadow length and a
 * roof inset for tall volumes; appearance by the building style (land use by
 * default).
 */
export const BuildingLayer = memo(function BuildingLayer({ buildings, selectedId, scale, showLabels, showHeights, showShadows, sunIntensity, shadow, style = "land-use", heightEmphasis = false, onSelect, interactive = true }: BuildingLayerProps) {
  const hair = 1 / scale;
  const labelVisible = showLabels && scale > 0.9;
  const sunK = 1.4 - (sunIntensity / 100) * 0.8; // 1.4 at dawn … 0.6 at noon
  const dir = shadow ? { x: shadow.ux, y: shadow.uy, k: shadow.length, opacity: shadow.opacity } : { x: 0.6, y: 1, k: sunK, opacity: 0.12 };
  const emph = heightEmphasis ? 1.35 : 1;
  return (
    <g data-layer="buildings">
      {buildings.map((b) => {
        const { center, width, depth, rotation } = b.geometry;
        const existing = b.properties.status === "Existing";
        const palette = existing ? EXISTING_STYLE : LAND_USE_STYLE[b.properties.landUse];
        const c = style === "simple" ? SIMPLE : style === "height" ? { fill: heightRamp(existing ? 1 : b.properties.floors), stroke: "#93A8C7" } : palette;
        const selected = b.id === selectedId;
        const x = center.x - width / 2;
        const y = center.y - depth / 2;
        const base = showShadows ? (showHeights ? Math.min(2 + b.properties.floors * 0.28 * emph, 10) : 2) * dir.k : 0;
        const transform = rotation ? `rotate(${rotation} ${center.x} ${center.y})` : undefined;
        const bands = style === "architectural" && showHeights && b.properties.floors >= 4 ? Math.min(4, Math.floor(b.properties.floors / 4)) : 0;
        const labelFill = style === "height" ? heightLabelColor(existing ? 1 : b.properties.floors) : "#0F172A";
        return (
          <g key={b.id} transform={transform} {...featureProps(interactive, b.id, `Building ${b.name}, ${b.properties.landUse.toLowerCase()}, ${b.properties.floors} floors`, selected, onSelect)}>
            {base > 0 && <rect x={x + dir.x * base} y={y + dir.y * base} width={width} height={depth} rx={1.2} fill="#0F172A" opacity={dir.opacity} pointerEvents="none" />}
            <rect
              x={x}
              y={y}
              width={width}
              height={depth}
              rx={1.2}
              fill={c.fill}
              stroke={selected ? "#1D4ED8" : c.stroke}
              strokeWidth={selected ? hair * 2.5 : hair * 1.2}
              className="transition-[stroke-width] duration-150 motion-reduce:transition-none"
            />
            {bands > 0 &&
              Array.from({ length: bands }, (_, i) => {
                const inset = (i + 1) * Math.min(width, depth) * 0.09;
                return <rect key={i} x={x + inset} y={y + inset} width={Math.max(1, width - inset * 2)} height={Math.max(1, depth - inset * 2)} rx={1} fill="none" stroke={c.stroke} strokeWidth={hair * 0.8} opacity={0.55} pointerEvents="none" />;
              })}
            {style !== "architectural" && showHeights && b.properties.floors >= (heightEmphasis ? 6 : 10) && (
              <rect x={x + width * 0.2} y={y + depth * 0.22} width={width * 0.6} height={depth * 0.56} rx={1} fill="none" stroke={style === "height" ? "#FFFFFF" : c.stroke} strokeWidth={hair} opacity={0.7} pointerEvents="none" />
            )}
            {selected && <rect x={x - hair * 4} y={y - hair * 4} width={width + hair * 8} height={depth + hair * 8} rx={2} fill="none" stroke="#2563EB" strokeWidth={hair * 1.5} strokeDasharray={`${hair * 4} ${hair * 3}`} pointerEvents="none" />}
            {labelVisible && width * scale > 34 && (
              <text x={center.x} y={center.y + hair * 3.5} textAnchor="middle" fontSize={hair * 9.5} fontWeight={700} fill={labelFill} pointerEvents="none" style={{ fontFamily: "Inter, sans-serif" }}>
                {b.name}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
});
