import { useId } from "react";
import { Check } from "lucide-react";
import { MAX_SELECTED_METRICS, PRESENTATION_METRICS, type ThemeDef } from "../data/presentation.data";
import type { ScenarioOption } from "../lib/scenarios";
import type { PresentationMetricId } from "../types/visualization.types";

/** Metric strip shown inside the Present viewport. */
export function MetricStrip({ option, ids, theme, compact = false }: { option: ScenarioOption; ids: PresentationMetricId[]; theme: ThemeDef; compact?: boolean }) {
  if (ids.length === 0) return null;
  const defs = ids.map((id) => PRESENTATION_METRICS.find((m) => m.id === id)).filter((m): m is (typeof PRESENTATION_METRICS)[number] => !!m);
  return (
    <dl className={`${theme.card} grid gap-x-4 gap-y-1 px-3 py-2 ${compact ? "grid-cols-2" : "grid-flow-col auto-cols-max"}`} aria-label="Key metrics">
      {defs.map((m) => {
        const v = option.metrics[m.id];
        return (
          <div key={m.id} className="min-w-0">
            <dt className={`truncate text-[10px] font-bold uppercase tracking-wider ${theme.caption}`}>{m.label}</dt>
            <dd className={`text-[15px] font-extrabold leading-tight tabular-nums ${theme.value}`}>
              {v.display}
              {v.estimated && (
                <span className={`ml-1 align-top text-[9px] font-bold ${theme.caption}`} title="Estimated for this scenario (demo)">
                  est.
                </span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

interface PresentationMetricsProps {
  selected: PresentationMetricId[];
  onToggle: (id: PresentationMetricId) => void;
  /** Values of the scenario in view, for the preview column. */
  option: ScenarioOption | null;
}

/** Metric picker (max 4) for the presentation. */
export function PresentationMetrics({ selected, onToggle, option }: PresentationMetricsProps) {
  const id = useId();
  const full = selected.length >= MAX_SELECTED_METRICS;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p id={id} className="text-[13px] font-semibold text-ink">
          Presentation metrics
        </p>
        <span className="text-[11px] font-bold tabular-nums text-muted" aria-live="polite">
          {selected.length} / {MAX_SELECTED_METRICS}
        </span>
      </div>
      <ul className="grid gap-1" aria-labelledby={id}>
        {PRESENTATION_METRICS.map((m) => {
          const on = selected.includes(m.id);
          const disabled = !on && full;
          const Icon = m.icon;
          return (
            <li key={m.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={disabled}
                onClick={() => onToggle(m.id)}
                title={disabled ? `Up to ${MAX_SELECTED_METRICS} metrics` : m.hint}
                className={[
                  "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
                  on ? "border-primary bg-primary/5" : "border-line bg-white hover:border-line-strong",
                ].join(" ")}
              >
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${on ? "border-primary bg-primary text-white" : "border-line-strong bg-white text-transparent"}`} aria-hidden="true">
                  <Check size={12} strokeWidth={3} />
                </span>
                <Icon size={14} className="shrink-0 text-muted" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink">{m.label}</span>
                {option && <span className="shrink-0 text-[12px] font-bold tabular-nums text-muted">{option.metrics[m.id].display}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
