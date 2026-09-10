import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { METRICS, formatMetric } from "../data/optimization.data";
import type { ScenarioMetrics, Tradeoff } from "../types/optimization.types";

interface TradeoffPanelProps {
  tradeoffs: Tradeoff[];
  current: ScenarioMetrics;
  metrics: ScenarioMetrics;
  title?: string;
}

/**
 * Trade-offs of a scenario against the current plan. Direction arrows are
 * always paired with "Improved" / "Reduced" text so nothing relies on colour.
 */
export function TradeoffPanel({ tradeoffs, current, metrics, title = "Trade-offs" }: TradeoffPanelProps) {
  const improved = tradeoffs.filter((t) => t.improved === true).length;
  const reduced = tradeoffs.filter((t) => t.improved === false).length;
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-faint">{title}</h4>
        <span className="text-[11px] font-semibold text-muted">
          {improved} improved · {reduced} reduced
        </span>
      </div>
      <ul className="mt-2 grid gap-1.5">
        {tradeoffs.map((t) => {
          const Icon = t.direction === "up" ? ArrowUp : t.direction === "down" ? ArrowDown : Minus;
          const tone = t.improved === true ? "text-success bg-success/10 ring-success/20" : t.improved === false ? "text-warning bg-warning/10 ring-warning/20" : "text-muted bg-surface-2 ring-line";
          const verdict = t.improved === true ? "Improved" : t.improved === false ? "Reduced" : "Unchanged";
          return (
            <li key={t.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 rounded-lg border border-line bg-white px-2.5 py-2">
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-bold text-ink">{t.label}</p>
                <p className="truncate text-[11px] tabular-nums text-muted">
                  {formatMetric(t.metric, current[t.metric])} → {formatMetric(t.metric, metrics[t.metric])}
                  {!METRICS[t.metric].higherIsBetter && <span className="text-faint"> · lower is better</span>}
                </p>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold tabular-nums ring-1 ${tone}`}>
                <Icon size={12} strokeWidth={2.5} aria-hidden="true" />
                {t.deltaText}
                <span className="font-semibold">· {verdict}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
