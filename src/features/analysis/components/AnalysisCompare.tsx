import { useEffect, useRef } from "react";
import { ArrowDownRight, ArrowUpRight, Minus, X } from "lucide-react";
import type { ComparisonRow } from "../types/analysis.types";

interface AnalysisCompareProps {
  rows: ComparisonRow[];
  projectName: string;
  onClose: () => void;
  /** Compact variant (no card chrome) for drawers. */
  bare?: boolean;
}

function fmt(v: number, unit: ComparisonRow["unit"]): string {
  if (unit === "percent") return `${Number.isInteger(v) ? v : v.toFixed(1)}%`;
  return String(Math.round(v));
}

/**
 * Current vs Baseline. Both bars share one scale per row; the delta is shown
 * as a number plus an up/down/neutral icon and wording ("improved" /
 * "declined"), so direction is never colour-only.
 */
export function AnalysisCompare({ rows, projectName, onClose, bare = false }: AnalysisCompareProps) {
  const dialogRef = useRef<HTMLElement>(null);

  // Move focus into the dialog on open and hand it back to the trigger on close.
  useEffect(() => {
    if (bare) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => previous?.focus?.();
  }, [bare]);

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="analysis-compare-title" className="text-[15px] font-extrabold text-ink">
            Compare · Current vs Baseline
          </h3>
          <p className="mt-0.5 text-[12px] text-muted">{projectName}: current plan against the concept baseline (demo values).</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close comparison" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
          <X size={16} />
        </button>
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] font-bold text-muted" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-primary" /> Current
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-line-strong" /> Baseline
        </span>
      </div>
      <table className="mt-2 w-full border-separate border-spacing-0 text-left">
        <caption className="sr-only">Current plan compared with the baseline</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Indicator</th>
            <th scope="col">Current</th>
            <th scope="col">Baseline</th>
            <th scope="col">Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const max = Math.max(r.current, r.baseline, r.unit === "percent" ? 30 : 100);
            const delta = r.current - r.baseline;
            const improved = delta === 0 ? null : r.higherIsBetter ? delta > 0 : delta < 0;
            const Icon = delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
            const tone = improved === null ? "text-muted" : improved ? "text-success" : "text-danger";
            const word = improved === null ? "unchanged" : improved ? "improved" : "declined";
            return (
              <tr key={r.id} className="align-top">
                <th scope="row" className="w-[38%] border-b border-line py-2.5 pr-3 text-[12.5px] font-semibold text-ink">
                  {r.label}
                  {!r.higherIsBetter && <span className="block text-[10.5px] font-semibold text-faint">lower is better</span>}
                </th>
                <td colSpan={2} className="border-b border-line py-2.5 pr-3">
                  <div className="grid gap-1">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(r.current / max) * 100}%` }} />
                      </div>
                      <span className="w-12 text-right text-[12.5px] font-extrabold tabular-nums text-ink">{fmt(r.current, r.unit)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                        <div className="h-full rounded-full bg-line-strong" style={{ width: `${(r.baseline / max) * 100}%` }} />
                      </div>
                      <span className="w-12 text-right text-[12px] font-semibold tabular-nums text-muted">{fmt(r.baseline, r.unit)}</span>
                    </div>
                  </div>
                  <span className="sr-only">
                    Current {fmt(r.current, r.unit)}, baseline {fmt(r.baseline, r.unit)}
                  </span>
                </td>
                <td className={`w-20 border-b border-line py-2.5 text-right text-[12.5px] font-extrabold tabular-nums ${tone}`}>
                  <span className="inline-flex items-center gap-0.5">
                    <Icon size={14} aria-hidden="true" />
                    {delta > 0 ? "+" : ""}
                    {r.unit === "percent" ? delta.toFixed(1) : Math.round(delta)}
                    {r.unit === "percent" ? " pp" : ""}
                  </span>
                  <span className="sr-only"> {word}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-[11px] text-faint">Baseline = concept-stage plan. Values are demo estimates for a prototype, not measurements.</p>
    </>
  );
  if (bare) return <div className="p-4">{body}</div>;
  return (
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="false" aria-labelledby="analysis-compare-title" className="w-full max-w-xl rounded-2xl border border-line bg-surface p-4 shadow-float outline-none animate-pop motion-reduce:animate-none sm:p-5 focus-visible:ring-4 focus-visible:ring-primary/20">
      {body}
    </section>
  );
}
