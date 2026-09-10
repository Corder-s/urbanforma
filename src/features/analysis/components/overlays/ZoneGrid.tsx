import { memo } from "react";
import type { ZoneCell } from "../../types/analysis.types";

interface ZoneGridProps {
  zones: ZoneCell[];
  color: (value: number) => string;
  /** Max fill opacity for the strongest cell. */
  opacity?: number;
  selectedId: string | null;
  focusId?: string | null;
  scale: number;
  /** Accessible name for a zone ("Zone A1, heat 72 out of 100"). */
  label: (z: ZoneCell) => string;
  onSelect: (id: string) => void;
  /** Draw a hatch on cells above this value (used for high-heat zones). */
  hatchAbove?: number;
  hatchId?: string;
}

/**
 * Coarse analysis grid over the site. Cells are keyboard-selectable
 * (role=button, Enter/Space) and carry `data-object-id` so the shared map
 * gesture model selects them on tap. Colour is never the only signal: the
 * cell's value is in its accessible name and the inspector spells it out.
 */
export const ZoneGrid = memo(function ZoneGrid({ zones, color, opacity = 0.62, selectedId, focusId, scale, label, onSelect, hatchAbove, hatchId }: ZoneGridProps) {
  const hair = 1 / scale;
  return (
    <g data-layer="analysis-zones">
      {zones.map((z) => {
        const selected = z.id === selectedId;
        const focus = z.id === focusId && !selected;
        const inset = hair * 1.5;
        return (
          <g
            key={z.id}
            data-object-id={z.id}
            data-focus={focus ? "true" : undefined}
            role="button"
            tabIndex={0}
            aria-label={`${label(z)}${selected ? ", selected" : focus ? ", suggested zone" : ""}`}
            aria-pressed={selected}
            className="cursor-pointer"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(z.id);
              }
            }}
          >
            <rect x={z.bounds.x + inset} y={z.bounds.y + inset} width={Math.max(0, z.bounds.width - inset * 2)} height={Math.max(0, z.bounds.height - inset * 2)} rx={hair * 4} fill={color(z.value)} fillOpacity={opacity * (0.55 + 0.45 * z.coverage)} stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={hair} />
            {hatchAbove !== undefined && hatchId && z.value >= hatchAbove && (
              <rect x={z.bounds.x + inset} y={z.bounds.y + inset} width={Math.max(0, z.bounds.width - inset * 2)} height={Math.max(0, z.bounds.height - inset * 2)} rx={hair * 4} fill={`url(#${hatchId})`} pointerEvents="none" />
            )}
            {focus && (
              <rect x={z.bounds.x + hair * 3} y={z.bounds.y + hair * 3} width={z.bounds.width - hair * 6} height={z.bounds.height - hair * 6} rx={hair * 5} fill="none" stroke="#0F172A" strokeOpacity={0.5} strokeWidth={hair * 1.2} strokeDasharray={`${hair * 5} ${hair * 4}`} pointerEvents="none" />
            )}
            {selected && (
              <>
                <rect x={z.bounds.x + hair * 2} y={z.bounds.y + hair * 2} width={z.bounds.width - hair * 4} height={z.bounds.height - hair * 4} rx={hair * 5} fill="none" stroke="#FFFFFF" strokeWidth={hair * 4} pointerEvents="none" />
                <rect x={z.bounds.x + hair * 2} y={z.bounds.y + hair * 2} width={z.bounds.width - hair * 4} height={z.bounds.height - hair * 4} rx={hair * 5} fill="none" stroke="#1D4ED8" strokeWidth={hair * 2} pointerEvents="none" />
              </>
            )}
          </g>
        );
      })}
    </g>
  );
});
