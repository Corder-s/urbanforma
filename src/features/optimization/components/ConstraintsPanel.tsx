import { CONSTRAINTS, formatConstraintValue } from "../data/optimization.data";
import type { ConstraintCheck, ConstraintId, PlanningConstraint } from "../types/optimization.types";
import { VerdictIcon } from "./ConstraintStatus";

interface ConstraintsPanelProps {
  constraints: PlanningConstraint[];
  /** Checks of the current plan against these constraints (context for the planner). */
  currentChecks: ConstraintCheck[];
  onChange: (id: ConstraintId, patch: { value?: number; enabled?: boolean }) => void;
  disabled?: boolean;
  idPrefix: string;
}

/**
 * Editable planning constraints (limit + enabled). Each row shows how the
 * current plan measures against it so the planner sees which limits already
 * bind before generating scenarios.
 */
export function ConstraintsPanel({ constraints, currentChecks, onChange, disabled = false, idPrefix }: ConstraintsPanelProps) {
  const enabled = constraints.filter((c) => c.enabled).length;
  return (
    <section aria-labelledby={`${idPrefix}-constraints-title`}>
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <h3 id={`${idPrefix}-constraints-title`} className="text-[11px] font-bold uppercase tracking-widest text-faint">
          Planning Constraints
        </h3>
        <span className="text-[11px] font-semibold text-muted">
          {enabled} of {constraints.length} enforced
        </span>
      </div>
      <p className="px-4 pt-1 text-[12px] leading-relaxed text-muted">Limits every scenario is checked against. Scenarios that exceed a limit stay visible and are flagged.</p>
      <ul className="grid gap-2 px-4 py-3">
        {CONSTRAINTS.map((def) => {
          const c = constraints.find((x) => x.id === def.id) ?? { id: def.id, value: def.min, enabled: false };
          const check = currentChecks.find((x) => x.constraintId === def.id);
          const inputId = `${idPrefix}-constraint-${def.id}`;
          const toggleId = `${inputId}-enabled`;
          const decimals = def.step < 1 ? 2 : 0;
          return (
            <li key={def.id} className={`rounded-xl border p-3 ${c.enabled ? "border-line bg-white" : "border-dashed border-line bg-surface-2/60"}`}>
              <div className="flex items-start justify-between gap-2">
                <label htmlFor={inputId} className="min-w-0 text-[12.5px] font-bold text-ink">
                  {def.label}
                </label>
                <label htmlFor={toggleId} className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-muted">
                  <input id={toggleId} type="checkbox" checked={c.enabled} disabled={disabled} onChange={(e) => onChange(def.id, { enabled: e.target.checked })} className="h-3.5 w-3.5 rounded border-line-strong accent-primary" />
                  {c.enabled ? "On" : "Off"}
                </label>
              </div>
              <div className="mt-2 grid grid-cols-[minmax(0,1fr)_92px] items-center gap-2">
                <input
                  id={inputId}
                  type="range"
                  min={def.min}
                  max={def.max}
                  step={def.step}
                  value={c.value}
                  disabled={disabled || !c.enabled}
                  onChange={(e) => onChange(def.id, { value: Number(e.target.value) })}
                  aria-valuetext={formatConstraintValue(def.id, c.value)}
                  className="h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    aria-label={`${def.label} value`}
                    min={def.min}
                    max={def.max}
                    step={def.step}
                    value={Number(c.value.toFixed(decimals))}
                    disabled={disabled || !c.enabled}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (!Number.isFinite(v)) return;
                      onChange(def.id, { value: Math.max(def.min, Math.min(def.max, v)) });
                    }}
                    className="h-8 w-full min-w-0 rounded-lg border border-line bg-white px-2 text-right text-[12.5px] font-bold tabular-nums text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 disabled:opacity-40"
                  />
                  <span className="w-9 shrink-0 text-[10.5px] font-bold text-muted">{def.unit === "people" ? "ppl" : def.unit}</span>
                </div>
              </div>
              {check && (
                <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-muted">
                  <VerdictIcon verdict={check.verdict} size={13} />
                  <span>
                    <span className="font-bold text-ink">Current plan:</span> {check.verdict === "off" ? "not checked." : check.message}
                  </span>
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
