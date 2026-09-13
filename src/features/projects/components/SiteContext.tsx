import { Compass, Landmark, MapPin, Mountain, Route, Ruler } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ProjectDetail } from "../project.types";
import { formatCoordinates, formatSiteArea } from "../project.service";
import { SectionHeading } from "../../../components/dashboard/SectionHeading";
import { SiteMapPlaceholder } from "./SiteMapPlaceholder";

interface Row {
  icon: LucideIcon;
  label: string;
  value: string;
}

/** "Location / Site Context" — map-style placeholder + structured site facts. */
export function SiteContext({ project }: { project: ProjectDetail }) {
  const s = project.siteContext;
  const rows: Row[] = [
    { icon: MapPin, label: "Location", value: s.location },
    { icon: Compass, label: "Site coordinates", value: formatCoordinates(s.center) },
    { icon: Ruler, label: "Site area", value: formatSiteArea(s.siteAreaHa) },
    { icon: Mountain, label: "Terrain", value: s.terrain },
    { icon: Landmark, label: "Existing development", value: s.existingDevelopment },
    { icon: Route, label: "Accessibility", value: s.accessibility },
  ];

  return (
    <section aria-labelledby="site-title">
      <SectionHeading id="site-title" title="Location & Site Context" hint="Site boundary, surroundings and access" />
      <div className="rounded-3xl border border-line bg-surface p-4 shadow-soft sm:p-5">
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <SiteMapPlaceholder site={s} variant={project.thumbVariant} className="aspect-[4/3] min-h-[240px] lg:aspect-auto lg:min-h-[340px]" />

          <dl className="flex flex-col divide-y divide-line">
            {rows.map((r) => (
              <div key={r.label} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-primary">
                  <r.icon size={16} />
                </span>
                <div className="min-w-0">
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-faint">{r.label}</dt>
                  <dd className="mt-0.5 text-[14px] font-semibold leading-snug text-ink">{r.value}</dd>
                </div>
              </div>
            ))}
            {s.zoning && (
              <div className="pt-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-faint">Zoning</p>
                <p className="mt-0.5 text-[14px] font-semibold text-ink">{s.zoning}</p>
              </div>
            )}
          </dl>
        </div>
      </div>
    </section>
  );
}
