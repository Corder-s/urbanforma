import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { COMPARE_METRICS, METRICS, formatMetric, scoreStatus } from "../data/optimization.data";
import type { ScoredScenario } from "../services/optimization.service";
import type { CurrentPlan, ScenarioMetricId } from "../types/optimization.types";
import { ConstraintSummaryPill } from "./ConstraintStatus";
import { ScenarioStatusBadge } from "./ScenarioCard";

interface ScenarioComparisonProps {
  current: CurrentPlan;
  scenarios: ScoredScenario[];
  activeId: string | null;
  onView: (id: string) => void;
  /** Toggle chips for choosing which scenarios are compared. */
  all: ScoredScenario[];
  compareIds: string[];
  onToggleCompare: (id: string) => void;
}

const SCORE_TONE = { good: "text-success", moderate: "text-warning", attention: "text-danger" } as const;

function DeltaCell({ metric, value, current }: { metric: ScenarioMetricId; value: number; current: number }) {
  const def = METRICS[metric];
  const raw = value - current;
  const flat = Math.abs(raw) < (def.unit === "FAR" ? 0.005 : def.unit === "percent" ? 0.05 : 0.5);
  const improved = flat ? null : def.higherIsBetter ? raw > 0 : raw < 0;
  const Icon = flat ? Minus : raw > 0 ? ArrowUp : ArrowDown;
  const tone = improved === null ? "text-faint" : improved ? "text-success" : "text-warning";
  const deltaText = flat ? "±0" : `${raw > 0 ? "+" : "−"}${def.unit === "people" ? Math.abs(Math.round(raw)).toLocaleString("en-US") : def.unit === "FAR" ? Math.abs(raw).toFixed(2) : def.unit === "percent" ? Math.abs(raw).toFixed(1) : Math.abs(Math.round(raw))}`;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10.5px] font-bold tabular-nums ${tone}`}>
      <Icon size={11} strokeWidth={2.5} aria-hidden="true" />
      {deltaText}
      <span className="sr-only">{improved === null ? " unchanged" : improved ? " improved" : " reduced"}</span>
    </span>
  );
}

/**
 * Compare mode table: Metric | Current | scenario columns (2–4). The table
 * scrolls horizontally inside its own container only — the page never does.
 */
export function ScenarioComparison({ current, scenarios, activeId, onView, all, compareIds, onToggleCompare }: ScenarioComparisonProps) {
  return (
    <section aria-labelledby="scenario-comparison-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id="scenario-comparison-title" className="text-[15px] font-extrabold text-ink">
            Current vs Scenarios
          </h3>
          <p className="text-[12px] text-muted">Pick two to four scenarios. Arrows show the change against the current plan; “lower is better” metrics are marked.</p>
        </div>
        <ul className="flex flex-wrap gap-1.5" aria-label="Scenarios in comparison">
          {all.map((s) => {
            const on = compareIds.includes(s.id);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onToggleCompare(s.id)}
                  aria-pressed={on}
                  disabled={!on && compareIds.length >= 4}
                  className={["inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-40", on ? "border-primary bg-primary/10 text-primary" : "border-line bg-white text-muted hover:text-ink"].join(" ")}
                >
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-white text-[9px] font-extrabold text-primary ring-1 ring-primary/20" aria-hidden="true">
                    {s.letter}
                  </span>
                  {s.name}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {scenarios.length < 2 ? (
        <p className="rounded-xl border border-dashed border-line bg-surface-2/60 px-4 py-6 text-center text-[12.5px] text-muted" role="status">
          Add at least two scenarios to the comparison.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[640px] border-collapse text-left text-[12.5px]">
            <caption className="sr-only">Metric comparison between the current plan and the selected scenarios</caption>
            <thead>
              <tr className="border-b border-line bg-surface-2/70">
                <th scope="col" className="sticky left-0 z-[1] bg-surface-2/95 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-faint backdrop-blur">
                  Metric
                </th>
                <th scope="col" className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-faint">
                  Current
                </th>
                {scenarios.map((s) => (
                  <th key={s.id} scope="col" className={`px-3 py-2 align-top ${s.id === activeId ? "bg-primary/5" : ""}`}>
                    <button type="button" onClick={() => onView(s.id)} className="group flex flex-col items-start gap-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20" aria-label={`View scenario ${s.name}`}>
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-ink group-hover:text-primary">
                        <span className="grid h-4.5 min-h-[18px] w-[18px] place-items-center rounded-full bg-primary/10 text-[9.5px] text-primary" aria-hidden="true">
                          {s.letter}
                        </span>
                        {s.name}
                      </span>
                      <ScenarioStatusBadge status={s.status} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line">
                <th scope="row" className="sticky left-0 z-[1] bg-white px-3 py-2.5 font-bold text-ink">
                  Overall Score
                </th>
                <td className={`px-3 py-2.5 text-[15px] font-extrabold tabular-nums ${SCORE_TONE[scoreStatus(current.score)]}`}>{current.score}</td>
                {scenarios.map((s) => (
                  <td key={s.id} className={`px-3 py-2.5 ${s.id === activeId ? "bg-primary/5" : ""}`}>
                    <span className={`text-[15px] font-extrabold tabular-nums ${SCORE_TONE[scoreStatus(s.score)]}`}>{s.score}</span>
                    <span className="ml-1.5">
                      <DeltaCell metric="environment" value={s.score} current={current.score} />
                    </span>
                  </td>
                ))}
              </tr>
              {COMPARE_METRICS.map((id) => (
                <tr key={id} className="border-b border-line last:border-b-0 odd:bg-surface-2/30">
                  <th scope="row" className="sticky left-0 z-[1] bg-white px-3 py-2 font-semibold text-ink odd:bg-surface-2/30">
                    {METRICS[id].label}
                    {!METRICS[id].higherIsBetter && <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-faint">lower is better</span>}
                  </th>
                  <td className="px-3 py-2 font-bold tabular-nums text-ink">{formatMetric(id, current.metrics[id])}</td>
                  {scenarios.map((s) => (
                    <td key={s.id} className={`px-3 py-2 tabular-nums ${s.id === activeId ? "bg-primary/5" : ""}`}>
                      <span className="font-bold text-ink">{formatMetric(id, s.metrics[id])}</span>
                      <span className="ml-1.5">
                        <DeltaCell metric={id} value={s.metrics[id]} current={current.metrics[id]} />
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-line bg-surface-2/50">
                <th scope="row" className="sticky left-0 z-[1] bg-surface-2/95 px-3 py-2 font-semibold text-ink">
                  Constraints
                </th>
                <td className="px-3 py-2 text-[11px] text-muted">Reference</td>
                {scenarios.map((s) => (
                  <td key={s.id} className={`px-3 py-2 ${s.id === activeId ? "bg-primary/5" : ""}`}>
                    <ConstraintSummaryPill checks={s.checks} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
