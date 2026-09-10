import { Building2, Crosshair, MousePointerClick, X } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { LAND_USE_STYLE, POI_COLORS } from "../data/visualization.data";
import type { VisualizationState } from "../hooks/useVisualizationState";
import { formatArea, formatMetres, TYPE_LABEL } from "../lib/spatial";
import type { SpatialObject } from "../types/visualization.types";

interface InspectorPanelProps {
  state: VisualizationState;
  onClose?: () => void;
  idPrefix?: string;
  /** Inside the tabbed side panel: the tab is the heading, so only the actions row renders. */
  embedded?: boolean;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line px-4 py-3 last:border-b-0" aria-label={title}>
      <h3 className="text-[10.5px] font-bold uppercase tracking-widest text-faint">{title}</h3>
      <dl className="mt-1.5 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5">{children}</dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-[12.5px] text-muted">{label}</dt>
      <dd className="text-right text-[12.5px] font-bold tabular-nums text-ink">{value}</dd>
    </>
  );
}

const STATUS_TONE: Record<string, "neutral" | "blue" | "teal" | "amber" | "green"> = {
  Existing: "neutral",
  Proposed: "blue",
  Approved: "green",
  "Under Review": "amber",
};

function num(n: number): string {
  return n.toLocaleString("en-US");
}

/** Right-hand inspector for the selected spatial object. */
export function InspectorPanel({ state, onClose, idPrefix = "inspector", embedded = false }: InspectorPanelProps) {
  const { selectedObject: o, data, focusObject, select } = state;

  return (
    <aside className="flex h-full min-h-0 flex-col" aria-labelledby={embedded ? undefined : `${idPrefix}-title`} aria-label={embedded ? "Inspector" : undefined}>
      <div className={`flex shrink-0 items-center justify-between border-b border-line px-4 ${embedded ? (o ? "h-10" : "hidden") : "h-11"}`}>
        <h2 id={`${idPrefix}-title`} className={`text-[11px] font-bold uppercase tracking-widest text-faint ${embedded ? "sr-only" : ""}`}>
          Inspector
        </h2>
        <div className="flex items-center gap-0.5">
          {o && (
            <>
              <button type="button" onClick={() => focusObject(o.id)} aria-label="Center on selection" title="Center on selection" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
                <Crosshair size={15} />
              </button>
              <button type="button" onClick={() => select(null)} className="rounded-md px-1.5 text-[12px] font-bold text-primary hover:text-primary-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
                Clear
              </button>
            </>
          )}
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Close inspector" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!o ? (
          <div className="grid h-full min-h-[200px] place-items-center p-6 text-center">
            <div>
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-surface-2 text-muted">
                <MousePointerClick size={20} aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-bold text-ink">Select an element to inspect it.</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted">Click a building, road, area or the site boundary in the map or 3D city.</p>
            </div>
          </div>
        ) : (
          <ObjectDetails o={o} siteSummary={data?.summary ?? null} />
        )}
      </div>
    </aside>
  );
}

function ObjectDetails({ o, siteSummary }: { o: SpatialObject; siteSummary: NonNullable<VisualizationState["data"]>["summary"] | null }) {
  const header = (
    <div className="border-b border-line px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Building2 size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-extrabold text-ink">{o.type === "building" ? `Building ${o.name}` : o.name}</p>
          <p className="text-[12px] font-semibold text-muted">
            {TYPE_LABEL[o.type]} · <span className="font-mono text-[11px]">{o.id}</span>
          </p>
        </div>
      </div>
    </div>
  );

  switch (o.type) {
    case "building": {
      const p = o.properties;
      const lu = LAND_USE_STYLE[p.landUse];
      return (
        <>
          {header}
          <Section title="Overview">
            <Row label="Name" value={o.name} />
            <Row
              label="Land use"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm ring-1 ring-black/10" style={{ background: lu.fill }} aria-hidden="true" />
                  {p.landUse}
                </span>
              }
            />
            <Row label="Population capacity" value={num(p.populationCapacity)} />
          </Section>
          <Section title="Dimensions">
            <Row label="Height" value={`${p.height} m`} />
            <Row label="Floors" value={p.floors} />
            <Row label="Footprint" value={`${num(p.footprint)} m²`} />
            <Row label="Gross floor area" value={`${num(p.footprint * p.floors)} m²`} />
          </Section>
          <Section title="Planning">
            <Row label="Density" value={`${p.density} density`} />
            <Row
              label="Status"
              value={
                <Badge tone={STATUS_TONE[p.status] ?? "neutral"} dot>
                  {p.status}
                </Badge>
              }
            />
          </Section>
          <Section title="Environmental">
            <Row label="Solar exposure" value={`${p.environmental.solarExposure} / 100`} />
            <Row label="Heat sensitivity" value={p.environmental.heatSensitivity} />
            <Row label="Nearest green space" value={`${p.environmental.greenProximityM} m`} />
          </Section>
          <p className="px-4 py-3 text-[11px] leading-snug text-faint">Environmental values are demo indicators. Analysis is not part of this module.</p>
        </>
      );
    }
    case "boundary":
      return (
        <>
          {header}
          {siteSummary && (
            <>
              <Section title="Site">
                <Row label="Site area" value={`${siteSummary.siteAreaHa.toFixed(1)} ha`} />
                <Row label="Buildings" value={num(siteSummary.buildings)} />
                <Row label="Green coverage" value={`${siteSummary.greenCoveragePct.toFixed(1)}%`} />
                <Row label="Road network" value={`${siteSummary.roadNetworkKm.toFixed(1)} km`} />
              </Section>
              <Section title="Capacity">
                <Row label="Water area" value={`${siteSummary.waterAreaHa.toFixed(1)} ha`} />
                <Row label="Population capacity" value={num(siteSummary.populationCapacity)} />
              </Section>
              <Section title="Reference">
                <Row label="Coordinates" value="Demo coordinates" />
                <Row label="Coordinate system" value={siteSummary.coordinateSystem} />
              </Section>
            </>
          )}
        </>
      );
    case "road":
    case "path":
      return (
        <>
          {header}
          <Section title="Overview">
            <Row label="Class" value={o.type === "path" ? "Pedestrian path" : `${o.properties.roadClass} road`} />
            <Row label="Lanes" value={o.type === "path" ? "—" : o.properties.lanes} />
            <Row
              label="Status"
              value={
                <Badge tone={STATUS_TONE[o.properties.status] ?? "neutral"} dot>
                  {o.properties.status}
                </Badge>
              }
            />
          </Section>
          <Section title="Dimensions">
            <Row label="Length" value={formatMetres(o.properties.lengthM)} />
            <Row label="Width" value={`${o.geometry.width} m`} />
          </Section>
        </>
      );
    case "green":
    case "water":
    case "parking":
    case "block":
      return (
        <>
          {header}
          <Section title="Overview">
            <Row label="Category" value={o.properties.category} />
            <Row
              label="Status"
              value={
                <Badge tone={STATUS_TONE[o.properties.status] ?? "neutral"} dot>
                  {o.properties.status}
                </Badge>
              }
            />
          </Section>
          <Section title="Dimensions">
            <Row label="Area" value={formatArea(o.properties.areaM2)} />
            <Row label="Vertices" value={o.geometry.points.length} />
          </Section>
        </>
      );
    case "poi":
      return (
        <>
          {header}
          <Section title="Overview">
            <Row
              label="Category"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: POI_COLORS[o.properties.category] }} aria-hidden="true" />
                  {o.properties.category}
                </span>
              }
            />
          </Section>
          <p className="px-4 py-3 text-[12.5px] leading-relaxed text-muted">{o.properties.description}</p>
        </>
      );
    case "transit":
      return (
        <>
          {header}
          <Section title="Overview">
            <Row label="Mode" value={o.properties.mode} />
            <Row label="Stations" value={o.properties.stations.length} />
          </Section>
          <ul className="px-4 py-3 text-[12.5px] text-ink" aria-label="Stations">
            {o.properties.stations.map((s) => (
              <li key={s.name} className="flex items-center gap-2 py-0.5">
                <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
                {s.name}
              </li>
            ))}
          </ul>
        </>
      );
    case "utility":
      return (
        <>
          {header}
          <Section title="Overview">
            <Row label="Network" value={o.properties.network} />
            <Row label="Length" value={formatMetres(o.geometry.points.length > 1 ? o.geometry.points.reduce((s, p, i, a) => (i === 0 ? 0 : s + Math.hypot(p.x - a[i - 1].x, p.y - a[i - 1].y)), 0) : 0)} />
          </Section>
        </>
      );
    default:
      return (
        <>
          {header}
          <p className="px-4 py-3 text-[12.5px] text-muted">No additional properties.</p>
        </>
      );
  }
}
