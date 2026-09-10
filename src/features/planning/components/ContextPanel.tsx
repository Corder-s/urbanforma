import { Layers, X } from "lucide-react";
import { Checkbox } from "../../../components/ui/Checkbox";
import { LAYER_DEFS } from "../data/tools.data";
import type { PlanningState } from "../hooks/usePlanningState";

interface ContextPanelProps {
  state: PlanningState;
  onClose?: () => void;
}

/** Context layer toggles + studio display settings (visualisation only). */
export function ContextPanel({ state, onClose }: ContextPanelProps) {
  const { layers, toggleLayer, settings, setSettings } = state;
  const visible = LAYER_DEFS.filter((l) => layers[l.key]).length;

  return (
    <section aria-labelledby="context-title" className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-4">
        <h2 id="context-title" className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-faint">
          <Layers size={14} aria-hidden="true" /> Context layers
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-muted">
            {visible}/{LAYER_DEFS.length}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close context layers"
              className="grid h-8 w-8 place-items-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
            >
              <X size={17} />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ul className="p-2" aria-label="Layer visibility">
          {LAYER_DEFS.map((l) => (
            <li key={l.key} className="rounded-xl px-2 py-2 transition-colors hover:bg-surface-2">
              <Checkbox id={`layer-${l.key}`} label={l.label} checked={layers[l.key]} onChange={(v) => toggleLayer(l.key, v)} />
              <p className="ml-[30px] mt-0.5 text-[11.5px] leading-snug text-faint">{l.note}</p>
            </li>
          ))}
        </ul>

        <div className="border-t border-line p-2">
          <h3 className="px-2 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-widest text-faint">Display</h3>
          <ul>
            <li className="rounded-xl px-2 py-2 hover:bg-surface-2">
              <Checkbox id="setting-grid" label="Show grid" checked={settings.showGrid} onChange={(v) => setSettings((s) => ({ ...s, showGrid: v }))} />
            </li>
            <li className="rounded-xl px-2 py-2 hover:bg-surface-2">
              <Checkbox id="setting-snap" label="Snap to 5 m grid" checked={settings.snapToGrid} onChange={(v) => setSettings((s) => ({ ...s, snapToGrid: v }))} />
            </li>
            <li className="rounded-xl px-2 py-2 hover:bg-surface-2">
              <Checkbox id="setting-labels" label="Show labels" checked={settings.showLabels} onChange={(v) => setSettings((s) => ({ ...s, showLabels: v }))} />
            </li>
          </ul>
        </div>

        <p className="px-4 py-3 text-[11.5px] leading-snug text-faint">Visualisation toggles only — no GIS datasets are loaded.</p>
      </div>
    </section>
  );
}
