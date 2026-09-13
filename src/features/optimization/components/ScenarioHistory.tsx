import { History, RotateCcw } from "lucide-react";
import { relativeDay } from "../hooks/useOptimizationState";
import type { ScenarioGeneration } from "../types/optimization.types";

interface ScenarioHistoryProps {
  history: ScenarioGeneration[];
  currentGenerationId: string | null;
  onLoad: (generationId: string) => void;
  onReset: () => void;
  disabled?: boolean;
  idPrefix: string;
}

/** Recent generations ("Generated today"). Clicking one restores that scenario set; Reset returns to the baseline. */
export function ScenarioHistory({ history, currentGenerationId, onLoad, onReset, disabled = false, idPrefix }: ScenarioHistoryProps) {
  return (
    <section aria-labelledby={`${idPrefix}-history-title`} className="border-t border-line">
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <h3 id={`${idPrefix}-history-title`} className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-faint">
          <History size={12} aria-hidden="true" /> Recent Scenarios
        </h3>
        <span className="text-[11px] font-semibold text-muted">{history.length} runs</span>
      </div>
      {history.length === 0 ? (
        <p className="px-4 pb-3 pt-1 text-[12px] text-muted">No generations yet for this project.</p>
      ) : (
        <ul className="grid gap-1 px-2 py-2">
          {history.map((g) => {
            const active = g.id === currentGenerationId;
            const names = g.scenarios.map((s) => s.name.split(" ")[0]).join(" · ");
            return (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => onLoad(g.id)}
                  disabled={disabled}
                  aria-current={active ? "true" : undefined}
                  className={["grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl px-2 py-1.5 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-50", active ? "bg-primary/10" : "hover:bg-surface-2"].join(" ")}
                >
                  <span className="min-w-0">
                    <span className={`block truncate text-[12px] font-bold ${active ? "text-primary" : "text-ink"}`}>Generated {relativeDay(g.generatedAt)}</span>
                    <span className="block truncate text-[11px] text-muted">
                      {g.scenarios.length} scenarios · {names}
                    </span>
                  </span>
                  <span className="text-[10.5px] font-bold tabular-nums text-faint">{new Date(g.generatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="px-4 pb-4">
        <button type="button" onClick={onReset} disabled={disabled} className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-surface text-[12px] font-bold text-muted hover:border-danger/40 hover:text-danger focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-50">
          <RotateCcw size={13} aria-hidden="true" /> Reset Optimization
        </button>
        <p className="mt-1.5 text-[10.5px] leading-snug text-faint">Returns goals, priorities and constraints to the baseline. Project data and versions are kept.</p>
      </div>
    </section>
  );
}
