import { X } from "lucide-react";
import { CATEGORIES, CATEGORY_GROUPS } from "../data/analysis.data";
import type { AnalysisState } from "../hooks/useAnalysisState";
import type { AnalysisCategoryId } from "../types/analysis.types";
import { formatMetricValue } from "./AnalysisMetricCard";

interface AnalysisNavigationProps {
  state: AnalysisState;
  onClose?: () => void;
  idPrefix?: string;
}

/** Headline value shown beside each category in the navigation. */
function headline(state: AnalysisState, id: AnalysisCategoryId): string | null {
  const first = state.metrics.find((m) => m.category === id);
  if (!first) return null;
  const { value, suffix } = formatMetricValue(first.value, first.unit, first.text);
  return `${value}${suffix === "/100" ? "" : suffix}`;
}

/**
 * Left category navigation: Overview · Environment · Urban Form · Mobility.
 * Docked at lg+, a drawer below. Each item shows its headline value so the
 * navigation doubles as a compact summary.
 */
export function AnalysisNavigation({ state, onClose, idPrefix = "nav" }: AnalysisNavigationProps) {
  const { activeCategory, setCategory } = state;
  const choose = (id: AnalysisCategoryId) => {
    setCategory(id);
    onClose?.();
  };
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-4">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-faint">Analysis</h2>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close analysis navigation" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
            <X size={16} />
          </button>
        )}
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-2" aria-label="Analysis categories">
        {CATEGORY_GROUPS.map((group) => {
          const items = CATEGORIES.filter((c) => c.group === group);
          const headingId = `${idPrefix}-${group.replace(/\s+/g, "-").toLowerCase()}`;
          return (
            <div key={group} className="mb-2">
              {group !== "Overview" && (
                <h3 id={headingId} className="px-2 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-widest text-faint">
                  {group}
                </h3>
              )}
              <ul aria-labelledby={group !== "Overview" ? headingId : undefined} className="grid gap-0.5">
                {items.map((c) => {
                  const Icon = c.icon;
                  const active = c.id === activeCategory;
                  const value = headline(state, c.id);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => choose(c.id)}
                        aria-current={active ? "page" : undefined}
                        className={[
                          "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                          active ? "bg-primary/10 text-primary" : "text-ink hover:bg-surface-2",
                        ].join(" ")}
                      >
                        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${active ? "bg-primary text-on-brand" : "bg-surface-2 text-muted"}`} aria-hidden="true">
                          <Icon size={15} />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{c.label}</span>
                        {value && <span className={`shrink-0 text-[11.5px] font-bold tabular-nums ${active ? "text-primary" : "text-muted"}`}>{value}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="shrink-0 border-t border-line px-4 py-2.5">
        <p className="text-[11px] leading-snug text-faint">Demo analysis — indicative values derived from the plan geometry, not measurements.</p>
      </div>
    </div>
  );
}
