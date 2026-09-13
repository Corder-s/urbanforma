import { CAMERA_PRESETS } from "../data/visualization.data";
import type { VisualizationState } from "../hooks/useVisualizationState";

interface CameraPresetsProps {
  state: VisualizationState;
  /** Two-column grid for narrow panels; a single wrapping row for the phone drawer. */
  layout?: "grid" | "row";
  size?: "sm" | "md";
}

/**
 * Named camera presets (Overview, Top View, Street View, Bird's Eye, Site
 * Entrance, Central District) — predefined demo positions derived from the
 * site bounds. The 3-D view flies to them, the 2-D map approximates them.
 */
export function CameraPresets({ state, layout = "grid", size = "md" }: CameraPresetsProps) {
  const current = state.lastPreset;
  return (
    <div role="group" aria-label="Camera presets" className={layout === "grid" ? "grid grid-cols-2 gap-1.5" : "flex flex-wrap gap-1.5"}>
      {CAMERA_PRESETS.map((p) => {
        const active = current === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => state.requestCamera(p.id)}
            aria-pressed={active}
            title={p.hint}
            className={[
              "inline-flex min-w-0 items-center justify-center rounded-lg border font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
              size === "sm" ? "h-8 px-2.5 text-[11.5px]" : "h-9 px-2.5 text-[12.5px]",
              active ? "border-primary bg-primary/10 text-primary" : "border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-2",
            ].join(" ")}
          >
            <span className="truncate">{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}
