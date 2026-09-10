import { RotateCcw } from "lucide-react";
import { OBJECTIVES, weightsTotal } from "../data/optimization.data";
import type { ObjectiveId, ObjectiveWeight } from "../types/optimization.types";

interface ObjectiveWeightsProps {
  weights: ObjectiveWeight[];
  onChange: (id: ObjectiveId, weight: number) => void;
  onReset: () => void;
  disabled?: boolean;
  idPrefix: string;
}

const BAR_COLORS: Record<ObjectiveId, string> = {
  environment: "bg-success",
  mobility: "bg-primary",
  green: "bg-accent",
  density: "bg-ink/70",
  carbon: "bg-warning",
};

/**
 * Weighted objectives. Moving one weight rebalances the others proportionally
 * so the total is always exactly 100% — there is no invalid state to warn
 * about, and the stacked bar shows the resulting mix at a glance.
 */
export function ObjectiveWeights({ weights, onChange, onReset, disabled = false, idPrefix }: ObjectiveWeightsProps) {
  const total = weightsTotal(weights);
  return (
    <section aria-labelledby={`${idPrefix}-weights-title`} className="border-b border-line">
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <h3 id={`${idPrefix}-weights-title`} className="text-[11px] font-bold uppercase tracking-widest text-faint">
          Optimization Priorities
        </h3>
        <button type="button" onClick={onReset} disabled={disabled} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-muted hover:bg-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-50">
          <RotateCcw size={12} aria-hidden="true" /> Reset
        </button>
      </div>
      <p className="px-4 pt-1 text-[12px] leading-relaxed text-muted">Weights decide how the overall scenario score is composed. Adjusting one rebalances the others.</p>

      {/* stacked mix */}
      <div className="px-4 pt-3">
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`Objective mix: ${weights.map((w) => `${OBJECTIVES.find((o) => o.id === w.id)?.label} ${w.weight}%`).join(", ")}`}>
          {weights.map((w) => (
            <span key={w.id} className={`${BAR_COLORS[w.id]} h-full transition-[width] duration-200 motion-reduce:transition-none`} style={{ width: `${w.weight}%` }} />
          ))}
        </div>
      </div>

      <ul className="grid gap-2.5 px-4 py-3">
        {OBJECTIVES.map((o) => {
          const w = weights.find((x) => x.id === o.id)?.weight ?? 0;
          const id = `${idPrefix}-weight-${o.id}`;
          return (
            <li key={o.id} className="grid grid-cols-[minmax(0,1fr)_44px] items-center gap-x-3 gap-y-1">
              <label htmlFor={id} className="flex min-w-0 items-center gap-2 text-[12.5px] font-bold text-ink">
                <span className={`h-2 w-2 shrink-0 rounded-full ${BAR_COLORS[o.id]}`} aria-hidden="true" />
                <span className="truncate">{o.label}</span>
              </label>
              <output htmlFor={id} className="text-right text-[12.5px] font-extrabold tabular-nums text-ink">
                {w}%
              </output>
              <input
                id={id}
                type="range"
                min={0}
                max={100}
                step={5}
                value={w}
                disabled={disabled}
                onChange={(e) => onChange(o.id, Number(e.target.value))}
                aria-valuetext={`${w} percent`}
                aria-describedby={`${idPrefix}-weights-total`}
                className="col-span-2 h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
              />
            </li>
          );
        })}
      </ul>
      <div id={`${idPrefix}-weights-total`} className="mx-4 mb-4 flex items-center justify-between rounded-lg bg-surface-2 px-3 py-1.5 text-[12px]">
        <span className="font-semibold text-muted">Total</span>
        <span className={`font-extrabold tabular-nums ${total === 100 ? "text-success" : "text-danger"}`}>{`${total}% ${total === 100 ? "· balanced" : "· must equal 100%"}`}</span>
      </div>
    </section>
  );
}
