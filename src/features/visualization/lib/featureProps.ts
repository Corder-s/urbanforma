import type { KeyboardEvent, SVGAttributes } from "react";

export interface FeatureProps extends SVGAttributes<SVGGElement> {
  "data-object-id"?: string;
}

/**
 * Attributes that make a map feature selectable: `data-object-id` (resolved by
 * useMapGestures on tap), button semantics and Enter/Space activation.
 * With `interactive` false the feature is purely decorative — used when a
 * module (e.g. Analysis) draws the base map underneath its own overlays.
 */
export function featureProps(interactive: boolean, id: string, label: string, selected: boolean, onSelect: (id: string) => void): FeatureProps {
  if (!interactive) return { "aria-hidden": true };
  return {
    "data-object-id": id,
    role: "button",
    tabIndex: 0,
    "aria-label": `${label}${selected ? ", selected" : ""}`,
    "aria-pressed": selected,
    className: "cursor-pointer",
    onKeyDown: (e: KeyboardEvent<SVGGElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(id);
      }
    },
  };
}
