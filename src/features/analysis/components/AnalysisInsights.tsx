import { ArrowRight, CircleCheck, CircleDot, Info, TriangleAlert } from "lucide-react";
import { getCategory } from "../data/analysis.data";
import type { AnalysisFinding, MetricStatus, AnalysisCategoryId } from "../types/analysis.types";

const ICON: Record<MetricStatus, { icon: typeof Info; cls: string }> = {
  good: { icon: CircleCheck, cls: "text-success" },
  moderate: { icon: CircleDot, cls: "text-warning" },
  attention: { icon: TriangleAlert, cls: "text-danger" },
  info: { icon: Info, cls: "text-primary" },
};

interface AnalysisInsightsProps {
  findings: AnalysisFinding[];
  onOpenCategory?: (id: AnalysisCategoryId) => void;
  /** Hide the card chrome when embedded in another panel. */
  bare?: boolean;
}

/** Key Findings — short, factual statements derived from the demo result. */
export function AnalysisInsights({ findings, onOpenCategory, bare = false }: AnalysisInsightsProps) {
  const list = (
    <ol className="grid gap-2" aria-label="Key findings">
      {findings.map((f, i) => {
        const { icon: Icon, cls } = ICON[f.status];
        const cat = getCategory(f.category);
        return (
          <li key={f.id} className="flex items-start gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5">
            <span className="mt-px w-4 shrink-0 text-[11px] font-extrabold tabular-nums text-faint" aria-hidden="true">
              {i + 1}.
            </span>
            <Icon size={16} className={`mt-0.5 shrink-0 ${cls}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] leading-snug text-ink">{f.text}</p>
              {onOpenCategory && (
                <button type="button" onClick={() => onOpenCategory(f.category)} className="mt-1 inline-flex items-center gap-0.5 text-[11.5px] font-bold text-primary hover:text-primary-dark focus-visible:outline-none focus-visible:rounded focus-visible:ring-4 focus-visible:ring-primary/20">
                  Open {cat.label} <ArrowRight size={12} aria-hidden="true" />
                </button>
              )}
            </div>
            <span className="sr-only">{f.status === "good" ? "Positive" : f.status === "attention" ? "Needs attention" : f.status === "moderate" ? "Moderate" : "Note"}</span>
          </li>
        );
      })}
    </ol>
  );
  if (bare) return list;
  return (
    <section className="rounded-2xl border border-line bg-surface-2/60 p-4" aria-labelledby="analysis-findings-title">
      <h3 id="analysis-findings-title" className="text-[13px] font-extrabold text-ink">
        Key Findings
      </h3>
      <p className="mb-3 mt-0.5 text-[11.5px] text-muted">Derived from the current plan geometry (demo).</p>
      {list}
    </section>
  );
}
