import { Cloud, Footprints, Leaf, Sun, Thermometer, Wind } from "lucide-react";
import { STATUS_META, statusForScore } from "../data/analysis.data";
import type { AnalysisState } from "../hooks/useAnalysisState";
import type { AnalysisCategoryId, AnalysisMetric } from "../types/analysis.types";
import { BreakdownBars, Histogram, ScoreRing, StackedBar, TrendChart } from "./AnalysisCharts";
import { AnalysisInsights } from "./AnalysisInsights";
import { AnalysisMetricCard } from "./AnalysisMetricCard";
import { AnalysisRecommendations } from "./AnalysisRecommendations";

interface AnalysisOverviewProps {
  state: AnalysisState;
}

/** Summary cards on the overview — metric id, icon, card title and category to open. */
const SUMMARY: { metricId: string; icon: typeof Sun; title: string; category: AnalysisCategoryId }[] = [
  { metricId: "solar-avg", icon: Sun, title: "Solar Exposure", category: "solar" },
  { metricId: "heat-risk", icon: Thermometer, title: "Heat Risk", category: "heat" },
  { metricId: "wind-comfort", icon: Wind, title: "Wind Comfort", category: "wind" },
  { metricId: "green-coverage", icon: Leaf, title: "Green Coverage", category: "green" },
  { metricId: "carbon-performance", icon: Cloud, title: "Carbon Impact", category: "carbon" },
  { metricId: "walkability", icon: Footprints, title: "Walkability", category: "walkability" },
];

/**
 * Performance Overview — the default centre view. Score + breakdown, six
 * summary cards, the four charts, key findings and planning considerations.
 * Everything here is a lens on the same AnalysisResult the map uses.
 */
export function AnalysisOverview({ state }: AnalysisOverviewProps) {
  const { result, setCategory, selectMetric, selectedMetric } = state;
  if (!result) return null;
  const overall = result.metrics.find((m) => m.id === "overall");
  const status = statusForScore(result.overallScore);
  const openMetric = (m: AnalysisMetric, category: AnalysisCategoryId) => {
    setCategory(category);
    selectMetric(m.id);
  };
  const generated = new Date(result.generatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-canvas">
      <div className="mx-auto grid w-full max-w-6xl gap-4 p-4 sm:p-5">
        {/* --- score + breakdown ------------------------------------------------------------- */}
        <section className="grid gap-4 rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-5 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-8" aria-labelledby="analysis-score-title">
          <div className="flex items-center gap-5 sm:gap-6">
            <ScoreRing score={result.overallScore} />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-faint">Urban Performance Score</p>
              <h2 id="analysis-score-title" className="mt-1 text-xl font-extrabold tracking-tight text-ink">
                {result.projectName}
              </h2>
              <p className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-ink">
                <span className={`h-2 w-2 rounded-full ${STATUS_META[status].dot}`} aria-hidden="true" />
                {STATUS_META[status].label}
                <span className="font-semibold text-muted">· demo composite</span>
              </p>
              <p className="mt-2 max-w-md text-[12.5px] leading-snug text-muted">{overall?.interpretation}</p>
              <p className="mt-2 text-[11px] text-faint">Generated {generated} · Demo engine {result.engine.version}</p>
            </div>
          </div>
          <div className="lg:border-l lg:border-line lg:pl-8">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[12.5px] font-extrabold text-ink">Performance breakdown</h3>
              <span className="text-[11px] font-semibold text-faint">Score / 100</span>
            </div>
            <BreakdownBars items={result.breakdown} onSelect={(b) => setCategory(b.category)} />
          </div>
        </section>

        {/* --- summary cards ----------------------------------------------------------------- */}
        <section aria-labelledby="analysis-summary-title">
          <h3 id="analysis-summary-title" className="sr-only">
            Summary metrics
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {SUMMARY.map((s) => {
              const m = result.metrics.find((x) => x.id === s.metricId);
              if (!m) return null;
              return <AnalysisMetricCard key={s.metricId} metric={m} icon={s.icon} title={s.title} selected={selectedMetric?.id === m.id} onSelect={(metric) => openMetric(metric, s.category)} />;
            })}
          </div>
        </section>

        {/* --- charts ------------------------------------------------------------------------ */}
        <section className="grid gap-4 lg:grid-cols-2" aria-label="Analysis charts">
          <div className="rounded-2xl border border-line bg-white p-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-[13px] font-extrabold text-ink">Environmental trend</h3>
              <span className="text-[11px] font-semibold text-faint">Plan revisions</span>
            </div>
            <TrendChart points={result.trend} />
          </div>
          <div className="rounded-2xl border border-line bg-white p-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-[13px] font-extrabold text-ink">Land-use distribution</h3>
              <button type="button" onClick={() => setCategory("landuse")} className="text-[11.5px] font-bold text-primary hover:text-primary-dark focus-visible:outline-none focus-visible:rounded focus-visible:ring-4 focus-visible:ring-primary/20">
                View on map
              </button>
            </div>
            <StackedBar items={result.landUse.map((l) => ({ label: l.landUse, share: l.share, color: l.color }))} label="Land-use distribution" />
            <div className="mt-5 border-t border-line pt-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-[13px] font-extrabold text-ink">Density distribution</h3>
                <button type="button" onClick={() => setCategory("density")} className="text-[11.5px] font-bold text-primary hover:text-primary-dark focus-visible:outline-none focus-visible:rounded focus-visible:ring-4 focus-visible:ring-primary/20">
                  View on map
                </button>
              </div>
              <Histogram items={result.densityDistribution} label="Density distribution" />
            </div>
          </div>
        </section>

        {/* --- findings + considerations ------------------------------------------------------- */}
        <section className="grid gap-4 lg:grid-cols-2" aria-label="Findings and considerations">
          <AnalysisInsights findings={result.findings} onOpenCategory={setCategory} />
          <AnalysisRecommendations considerations={result.considerations} onOpenCategory={setCategory} />
        </section>

        <p className="pb-2 text-center text-[11px] text-faint">All indicators are demo estimates derived from the plan geometry for a visualization prototype — not measurements or simulations.</p>
      </div>
    </div>
  );
}
