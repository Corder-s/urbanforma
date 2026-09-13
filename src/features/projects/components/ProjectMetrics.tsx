import { Building2, Gauge, Leaf, Route, Ruler, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ProjectMetrics as Metrics } from "../project.types";
import { formatNumber, formatSiteArea } from "../project.service";
import { SectionHeading } from "../../../components/dashboard/SectionHeading";

interface MetricCard {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
}

function buildCards(m: Metrics): MetricCard[] {
  return [
    { icon: Ruler, label: "Site Area", value: formatSiteArea(m.siteAreaHa), hint: "Gross site area" },
    { icon: Building2, label: "Buildings", value: formatNumber(m.buildings), hint: "Modelled structures" },
    { icon: Leaf, label: "Green Coverage", value: `${m.greenCoveragePct.toFixed(1)}%`, hint: "Share of site area" },
    { icon: Gauge, label: "Environmental Score", value: `${m.environmentalScore} / 100`, hint: "Composite indicator" },
    { icon: Users, label: "Estimated Population", value: formatNumber(m.estimatedPopulation), hint: "Residents + workers" },
    { icon: Route, label: "Road Network", value: `${m.roadNetworkKm.toFixed(1)} km`, hint: "Total centreline length" },
  ];
}

/** Responsive key-metrics grid (1 → 2 → 3 → 6 columns). Demo values. */
export function ProjectMetrics({ metrics }: { metrics: Metrics }) {
  const cards = buildCards(metrics);
  return (
    <section aria-labelledby="metrics-title">
      <SectionHeading id="metrics-title" title="Key Metrics" hint="Demo values — updated by analysis in later steps" />
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
        {cards.map((c) => (
          <div
            key={c.label}
            className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-soft transition-[border-color,box-shadow] duration-300 hover:border-primary/30 hover:shadow-card"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 text-primary ring-1 ring-primary/15">
              <c.icon size={17} />
            </span>
            <div className="min-w-0">
              <dt className="text-[11px] font-bold uppercase leading-tight tracking-wider text-faint">{c.label}</dt>
              <dd className="mt-1 break-words text-lg font-extrabold leading-tight text-ink sm:text-xl">{c.value}</dd>
              <p className="mt-1 text-[12px] text-muted">{c.hint}</p>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
