import { X } from "lucide-react";
import { LAYER_DEFS, LAYER_GROUPS } from "../data/visualization.data";
import type { VisualizationState } from "../hooks/useVisualizationState";
import type { LayerKey } from "../types/visualization.types";

interface LayerPanelProps {
  state: VisualizationState;
  onClose?: () => void;
  /** Distinguishes docked vs drawer copies so ids stay unique. */
  idPrefix?: string;
}

/** Grouped layer toggles (Base / Landscape / Infrastructure / Context). */
export function LayerPanel({ state, onClose, idPrefix = "layer" }: LayerPanelProps) {
  const { layers, toggleLayer, setGroup, objects, settings } = state;

  const countFor = (key: LayerKey) => objects.filter((o) => o.layer === key).length;
  const settingOff = (key: LayerKey) =>
    (key === "trees" && !(settings.trees && settings.landscape)) ||
    ((key === "green" || key === "parks") && !settings.landscape) ||
    (key === "buildings" && !settings.buildings) ||
    (key === "water" && !settings.water) ||
    (key === "roads" && !settings.roadNetwork) ||
    (key === "terrain" && !settings.terrain);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-4">
        <h2 id={`${idPrefix}-title`} className="text-[11px] font-bold uppercase tracking-widest text-faint">
          Layers
        </h2>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close layers" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
            <X size={16} />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3" aria-labelledby={`${idPrefix}-title`}>
        {LAYER_GROUPS.map((group) => {
          const defs = LAYER_DEFS.filter((d) => d.group === group);
          const keys = defs.map((d) => d.key);
          const allOn = keys.every((k) => layers[k]);
          return (
            <section key={group} className="mb-3 last:mb-0" aria-label={`${group} layers`}>
              <div className="flex items-center justify-between px-1 pb-1">
                <h3 className="text-[10.5px] font-bold uppercase tracking-widest text-faint">{group}</h3>
                <button
                  type="button"
                  onClick={() => setGroup(keys, !allOn)}
                  className="rounded-md px-1 text-[11px] font-bold text-primary hover:text-primary-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                  aria-label={allOn ? `Hide all ${group.toLowerCase()} layers` : `Show all ${group.toLowerCase()} layers`}
                >
                  {allOn ? "Hide all" : "Show all"}
                </button>
              </div>
              <ul className="grid gap-0.5">
                {defs.map((d) => {
                  const Icon = d.icon;
                  const checked = layers[d.key];
                  const id = `${idPrefix}-${d.key}`;
                  const muted = checked && settingOff(d.key);
                  const n = countFor(d.key);
                  return (
                    <li key={d.key}>
                      <label
                        htmlFor={id}
                        title={muted ? `${d.hint} — hidden by settings` : d.hint}
                        className={[
                          "flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-lg px-2 transition-colors hover:bg-surface-2",
                          checked ? "text-ink" : "text-muted",
                        ].join(" ")}
                      >
                        <span className="relative inline-flex">
                          <input id={id} type="checkbox" checked={checked} onChange={(e) => toggleLayer(d.key, e.target.checked)} className="peer sr-only" aria-describedby={muted ? `${id}-note` : undefined} />
                          <span
                            className={[
                              "grid h-[18px] w-[18px] place-items-center rounded-[6px] border transition-colors",
                              checked ? "border-primary bg-primary text-white" : "border-line-strong bg-white text-transparent",
                              "peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20",
                            ].join(" ")}
                            aria-hidden="true"
                          >
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 6.5 4.8 9 10 3.5" />
                            </svg>
                          </span>
                        </span>
                        <Icon size={15} className={checked && !muted ? "text-primary" : "text-faint"} aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{d.label}</span>
                        {muted ? (
                          <span id={`${id}-note`} className="text-[10.5px] font-bold uppercase tracking-wider text-warning">
                            Off in settings
                          </span>
                        ) : (
                          n > 0 && <span className="tabular-nums text-[11px] font-semibold text-faint">{n}</span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        <p className="mt-2 px-1 text-[11px] leading-snug text-faint">Demo layers derived from the project plan. Counts are object totals, not GIS features.</p>
      </div>
    </div>
  );
}
