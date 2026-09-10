import { AlertTriangle, Building2, CheckCircle2, Info, Leaf, Route, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { InsightCategory, InsightLevel, ProjectInsight } from "../project.types";
import { SectionHeading } from "../../../components/dashboard/SectionHeading";

const CATEGORY_ICON: Record<InsightCategory, LucideIcon> = {
  Environmental: Leaf,
  Mobility: Route,
  Development: Building2,
  Planning: Workflow,
};

/** Level is communicated by icon + text label, never colour alone. */
const LEVEL: Record<InsightLevel, { label: string; icon: LucideIcon; pill: string; accent: string }> = {
  positive: { label: "On track", icon: CheckCircle2, pill: "bg-success/10 text-success ring-success/20", accent: "border-l-success" },
  info: { label: "Note", icon: Info, pill: "bg-primary/10 text-primary ring-primary/20", accent: "border-l-primary" },
  attention: { label: "Needs attention", icon: AlertTriangle, pill: "bg-warning/10 text-warning ring-warning/20", accent: "border-l-warning" },
};

/** 3–4 illustrative insight cards with category icon and importance level. */
export function ProjectInsights({ insights }: { insights: ProjectInsight[] }) {
  if (insights.length === 0) return null;
  return (
    <section aria-labelledby="insights-title">
      <SectionHeading id="insights-title" title="Project Insights" hint="Illustrative insights from demo data" />
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {insights.map((ins) => {
          const CatIcon = CATEGORY_ICON[ins.category];
          const lvl = LEVEL[ins.level];
          return (
            <li
              key={ins.id}
              className={`flex flex-col gap-3 rounded-2xl border border-line border-l-4 bg-white p-4 shadow-soft ${lvl.accent}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-muted">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-surface-2 text-primary">
                    <CatIcon size={15} />
                  </span>
                  {ins.category}
                </span>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${lvl.pill}`}>
                  <lvl.icon size={12} aria-hidden="true" />
                  {lvl.label}
                </span>
              </div>
              <p className="text-[14px] font-medium leading-relaxed text-ink">{ins.text}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
