import { FolderKanban, Ruler, PenTool, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PortfolioSummary } from "../../features/projects/project.types";
import { Reveal } from "../landing/Reveal";
import { SectionHeading } from "./SectionHeading";

interface Metric {
  icon: LucideIcon;
  label: string;
  value: string | number;
}

/** Four lightweight portfolio-level metrics. */
export function PortfolioOverview({ portfolio }: { portfolio: PortfolioSummary }) {
  const metrics: Metric[] = [
    { icon: FolderKanban, label: "Active Projects", value: portfolio.activeProjects },
    { icon: Ruler, label: "Total Site Area", value: portfolio.totalSiteArea },
    { icon: PenTool, label: "Projects in Planning", value: portfolio.projectsInPlanning },
    { icon: CheckCircle2, label: "Completed Projects", value: portfolio.completedProjects },
  ];

  return (
    <section aria-labelledby="portfolio-title">
      <SectionHeading id="portfolio-title" title="Your Planning Portfolio" hint="Across all your sites" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((m, i) => (
          <Reveal key={m.label} delay={i * 70} className="h-full">
            <div className="flex h-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-soft">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-primary">
                <m.icon size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-xl font-extrabold leading-tight text-ink">{m.value}</p>
                <p className="truncate text-[12.5px] text-muted">{m.label}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
