import { ArrowRight, Lightbulb } from "lucide-react";
import { getCategory } from "../data/analysis.data";
import type { AnalysisCategoryId, PlanningConsideration } from "../types/analysis.types";

interface AnalysisRecommendationsProps {
  considerations: PlanningConsideration[];
  onOpenCategory?: (id: AnalysisCategoryId) => void;
  bare?: boolean;
  /** Limit the number of rows (e.g. inspector). */
  limit?: number;
}

/**
 * Planning Considerations — static, demo suggestions a planner might weigh.
 * Deliberately NOT presented as optimisation output or AI recommendations.
 */
export function AnalysisRecommendations({ considerations, onOpenCategory, bare = false, limit }: AnalysisRecommendationsProps) {
  const rows = limit ? considerations.slice(0, limit) : considerations;
  const list = (
    <ol className="grid gap-2" aria-label="Planning considerations">
      {rows.map((c, i) => {
        const cat = getCategory(c.category);
        const Icon = cat.icon;
        return (
          <li key={c.id} className="flex items-start gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
              <Icon size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold leading-snug text-ink">
                <span className="sr-only">{i + 1}. </span>
                {c.title}
              </p>
              <p className="mt-0.5 text-[12px] leading-snug text-muted">{c.detail}</p>
              {onOpenCategory && (
                <button type="button" onClick={() => onOpenCategory(c.category)} className="mt-1 inline-flex items-center gap-0.5 text-[11.5px] font-bold text-primary hover:text-primary-dark focus-visible:outline-none focus-visible:rounded focus-visible:ring-4 focus-visible:ring-primary/20">
                  View on map <ArrowRight size={12} aria-hidden="true" />
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
  if (bare) return list;
  return (
    <section className="rounded-2xl border border-line bg-surface-2/60 p-4" aria-labelledby="analysis-considerations-title">
      <div className="flex items-center gap-2">
        <Lightbulb size={15} className="text-warning" aria-hidden="true" />
        <h3 id="analysis-considerations-title" className="text-[13px] font-extrabold text-ink">
          Planning Considerations
        </h3>
      </div>
      <p className="mb-3 mt-0.5 text-[11.5px] text-muted">Static demo suggestions for the planning team to weigh — not optimisation results.</p>
      {list}
    </section>
  );
}
