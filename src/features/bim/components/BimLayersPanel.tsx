import { Layers, RotateCcw, X } from "lucide-react";
import { IconButton } from "../../../components/ui/IconButton";
import { LAYERS, SCENE_MODES } from "../data/bim.data";
import type { BimLayerKey, BimLayerVisibility, BimSceneMode } from "../types/bim.types";

interface BimLayersPanelProps {
  layers: BimLayerVisibility;
  counts: Record<BimLayerKey, number>;
  onToggle: (key: BimLayerKey, value?: boolean) => void;
  onReset: () => void;
  sceneMode: BimSceneMode;
  onSceneMode: (mode: BimSceneMode) => void;
  shownCount: number;
  totalCount: number;
  idPrefix: string;
  onClose?: () => void;
}

/**
 * BIM layer switches (by discipline) and the scene-mode choice.
 *
 * These layers narrow the *model*; they complement — never replace — the GIS
 * layer switches of the visualization state, which stay the single source of
 * truth for element visibility.
 */
export function BimLayersPanel({ layers, counts, onToggle, onReset, sceneMode, onSceneMode, shownCount, totalCount, idPrefix, onClose }: BimLayersPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex shrink-0 items-center gap-1.5 border-b border-line px-2.5 py-2">
        <Layers size={15} className="shrink-0 text-primary" aria-hidden="true" />
        <h2 className="min-w-0 flex-1 truncate text-[12.5px] font-extrabold uppercase tracking-wide text-ink">Layers & scene</h2>
        <IconButton icon={RotateCcw} label="Reset BIM layers" size="xs" onClick={onReset} className="shrink-0" />
        {onClose && <IconButton icon={X} label="Close layers" size="xs" onClick={onClose} className="shrink-0" />}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <fieldset className="border-b border-line px-3 py-2.5">
          <legend className="text-[10.5px] font-extrabold uppercase tracking-widest text-faint">Scene content</legend>
          <div className="mt-2 grid gap-1.5">
            {SCENE_MODES.map((m) => {
              const on = sceneMode === m.id;
              return (
                <label
                  key={m.id}
                  className={[
                    "flex cursor-pointer items-start gap-2.5 rounded-xl border px-2.5 py-2 transition-colors focus-within:ring-4 focus-within:ring-primary/20",
                    on ? "border-primary/40 bg-primary/5" : "border-line bg-surface hover:border-line-strong",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name={`${idPrefix}-scene`}
                    value={m.id}
                    checked={on}
                    onChange={() => onSceneMode(m.id)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0">
                    <span className={`block text-[12.5px] font-bold ${on ? "text-primary" : "text-ink"}`}>{m.label}</span>
                    <span className="block text-[11px] leading-snug text-muted">{m.hint}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="px-3 py-2.5">
          <h3 id={`${idPrefix}-layers`} className="text-[10.5px] font-extrabold uppercase tracking-widest text-faint">
            Model layers
          </h3>
          <ul aria-labelledby={`${idPrefix}-layers`} className="mt-2 grid gap-0.5">
            {LAYERS.map((l) => {
              const on = layers[l.key];
              const Icon = l.icon;
              const isMaster = l.key === "model";
              return (
                <li key={l.key}>
                  <label
                    className={[
                      "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors focus-within:ring-4 focus-within:ring-inset focus-within:ring-primary/20",
                      on ? "hover:bg-surface-2" : "opacity-70 hover:bg-surface-2",
                    ].join(" ")}
                    title={l.hint}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => onToggle(l.key, e.target.checked)}
                      aria-label={`${l.label} — ${l.hint}`}
                      className="h-4 w-4 shrink-0 accent-primary"
                    />
                    <Icon size={14} className={`shrink-0 ${on ? "text-primary" : "text-faint"}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[12.5px] font-semibold ${on ? "text-ink" : "text-muted"}`}>{l.label}</span>
                      {!isMaster && <span className="block truncate text-[10.5px] text-muted">{l.hint}</span>}
                    </span>
                    <span className="shrink-0 rounded-full bg-surface-2 px-1.5 py-px text-[10.5px] font-bold text-muted tabular-nums">
                      {counts[l.key].toLocaleString("en-US")}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            The <span className="font-bold text-ink">BIM model</span> switch hides the whole model; the GIS layer switches in
            Visualization still apply to the same objects.
          </p>
        </div>
      </div>

      <div className="shrink-0 border-t border-line px-3 py-2 text-[11.5px] text-muted" role="status" aria-live="polite">
        <span className="font-bold text-ink tabular-nums">{shownCount.toLocaleString("en-US")}</span> of{" "}
        <span className="tabular-nums">{totalCount.toLocaleString("en-US")}</span> elements in the current layers
      </div>
    </div>
  );
}
