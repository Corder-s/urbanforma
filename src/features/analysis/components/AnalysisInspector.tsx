import { Crosshair, MousePointerClick, X } from "lucide-react";
import { LAND_USE_STYLE } from "../../visualization/data/visualization.data";
import { formatArea } from "../../visualization/lib/spatial";
import { getCategory, STATUS_META } from "../data/analysis.data";
import type { AnalysisState } from "../hooks/useAnalysisState";
import type { AnalysisMetric, ZoneDetail } from "../types/analysis.types";
import { ShareRows } from "./AnalysisCharts";
import { AnalysisLegend } from "./AnalysisLegend";
import { AnalysisMetricCard, formatMetricValue, ScoreTrack, StatusPill } from "./AnalysisMetricCard";
import { AnalysisRecommendations } from "./AnalysisRecommendations";

interface AnalysisInspectorProps {
  state: AnalysisState;
  onClose?: () => void;
  idPrefix?: string;
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="border-b border-line px-4 py-3 last:border-b-0" aria-label={title}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[10.5px] font-bold uppercase tracking-widest text-faint">{title}</h3>
        {action}
      </div>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

function Rows({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5">{children}</dl>;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-[12.5px] text-muted">{label}</dt>
      <dd className="text-right text-[12.5px] font-bold tabular-nums text-ink">{value}</dd>
    </>
  );
}

/**
 * Right-hand details panel. Shows, top to bottom: the pinned / headline metric
 * with interpretation, key factors and recommendation; the selected zone or
 * building read through the active analysis; the overlay legend; and the
 * category's remaining metrics. Docked at xl+, a drawer below.
 */
export function AnalysisInspector({ state, onClose, idPrefix = "inspector" }: AnalysisInspectorProps) {
  const { activeCategory, categoryMetrics, selectedMetric, selectMetric, selectedZone, selectedBuilding, selectArea, activeOverlay, result, requestCamera, focusZone } = state;
  const category = getCategory(activeCategory);
  const headline = selectedMetric ?? categoryMetrics[0] ?? null;
  const others = categoryMetrics.filter((m) => m.id !== headline?.id);
  const considerations = result?.considerations.filter((c) => c.category === activeCategory) ?? [];

  return (
    <aside className="flex h-full min-h-0 flex-col" aria-labelledby={`${idPrefix}-title`}>
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-4">
        <h2 id={`${idPrefix}-title`} className="text-[11px] font-bold uppercase tracking-widest text-faint">
          {activeCategory === "overview" ? "Details" : `${category.label} · Details`}
        </h2>
        <div className="flex items-center gap-0.5">
          {selectedMetric && (
            <button type="button" onClick={() => selectMetric(null)} className="rounded-md px-1.5 text-[12px] font-bold text-primary hover:text-primary-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
              Unpin
            </button>
          )}
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Close details panel" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {headline ? <MetricDetail metric={headline} /> : null}

        {/* selected area */}
        {selectedZone && <ZoneSection zone={selectedZone} state={state} onClear={() => selectArea(null)} onCenter={() => requestCamera("fit")} />}
        {selectedBuilding && selectedBuilding.type === "building" && (
          <Section
            title="Selected building"
            action={
              <button type="button" onClick={() => selectArea(null)} className="rounded-md px-1.5 text-[12px] font-bold text-primary hover:text-primary-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
                Clear
              </button>
            }
          >
            <p className="text-[14px] font-extrabold text-ink">Building {selectedBuilding.name}</p>
            <p className="mb-2 text-[12px] text-muted">
              {selectedBuilding.properties.landUse} · {selectedBuilding.properties.floors} floors · {selectedBuilding.properties.status}
            </p>
            <Rows>
              <Row label="Height" value={`${selectedBuilding.properties.height} m`} />
              <Row label="Footprint" value={formatArea(selectedBuilding.properties.footprint)} />
              <Row label="Density" value={selectedBuilding.properties.density} />
              <Row label="Capacity" value={`${selectedBuilding.properties.populationCapacity.toLocaleString("en-US")} people`} />
              <Row label="Solar exposure" value={`${selectedBuilding.properties.environmental.solarExposure} / 100`} />
              <Row label="Heat sensitivity" value={selectedBuilding.properties.environmental.heatSensitivity} />
              <Row label="Nearest green" value={`${selectedBuilding.properties.environmental.greenProximityM} m`} />
              {activeOverlay && activeOverlay.buildings[selectedBuilding.id] !== undefined && <Row label={`${activeOverlay.title} (relative)`} value={`${Math.round(activeOverlay.buildings[selectedBuilding.id] * 100)} / 100`} />}
            </Rows>
          </Section>
        )}
        {!selectedZone && !selectedBuilding && activeCategory !== "overview" && (
          <Section title="Selected area">
            <p className="flex items-start gap-2 text-[12.5px] leading-snug text-muted">
              <MousePointerClick size={15} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              {activeOverlay?.zones.length ? "Select a zone on the map to read its values for this analysis." : "Select a building on the map to read its values."}
            </p>
            {focusZone && activeOverlay?.zones.length ? (
              <button
                type="button"
                onClick={() => selectArea(focusZone)}
                className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-[12px] font-bold text-primary transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
              >
                Inspect suggested zone ({focusZone.replace("zone-", "")})
              </button>
            ) : null}
          </Section>
        )}

        {/* legend */}
        {activeOverlay && (
          <Section title="Legend">
            <AnalysisLegend overlay={activeOverlay} showFocus={!!focusZone && !selectedZone && !selectedBuilding} className="border-0 bg-transparent p-0 shadow-none" />
          </Section>
        )}

        {/* other metrics of the category */}
        {others.length > 0 && (
          <Section title={activeCategory === "overview" ? "Breakdown" : "More indicators"}>
            <div className="grid gap-2">
              {others.map((m) => (
                <AnalysisMetricCard key={m.id} metric={m} dense selected={selectedMetric?.id === m.id} onSelect={(x) => selectMetric(x.id)} />
              ))}
            </div>
          </Section>
        )}

        {considerations.length > 0 && (
          <Section title="Planning considerations">
            <AnalysisRecommendations considerations={considerations} bare limit={3} />
          </Section>
        )}

        <div className="px-4 py-3">
          <p className="text-[11px] leading-snug text-faint">Demo values derived from the plan geometry — not measurements, simulations or recommendations from an optimisation engine.</p>
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------

function MetricDetail({ metric }: { metric: AnalysisMetric }) {
  const { value, suffix } = formatMetricValue(metric.value, metric.unit, metric.text);
  return (
    <section className="border-b border-line px-4 py-4" aria-label={`${metric.name} details`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold uppercase tracking-widest text-faint">{getCategory(metric.category).label}</p>
          <h3 className="mt-0.5 text-[15px] font-extrabold text-ink">{metric.name}</h3>
        </div>
        <StatusPill status={metric.status} />
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-[30px] font-extrabold leading-none tabular-nums tracking-tight text-ink">{value}</span>
        {suffix && <span className="text-[13px] font-bold text-muted">{suffix}</span>}
      </div>
      {metric.score !== undefined && <ScoreTrack value={metric.score} status={metric.status} label={metric.name} className="mt-3" />}
      <p className="mt-3 text-[13px] font-semibold leading-snug text-ink">{metric.interpretation}</p>
      <p className="mt-1 text-[12px] leading-snug text-muted">{metric.description}</p>

      {metric.breakdown && metric.breakdown.length > 0 && (
        <div className="mt-3">
          <ShareRows label={`${metric.name} breakdown`} rows={metric.breakdown.map((b) => ({ label: b.label, value: b.value, text: b.text ?? formatMetricValue(b.value, b.unit).value + formatMetricValue(b.value, b.unit).suffix.replace("/100", "") }))} color={metric.status === "attention" ? "bg-danger/70" : metric.status === "moderate" ? "bg-warning/70" : metric.status === "good" ? "bg-success/70" : "bg-primary/70"} />
        </div>
      )}

      {metric.keyFactors && metric.keyFactors.length > 0 && (
        <div className="mt-3">
          <h4 className="text-[10.5px] font-bold uppercase tracking-widest text-faint">Key factors</h4>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {metric.keyFactors.map((f) => (
              <li key={f} className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11.5px] font-semibold text-ink">
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {metric.recommendation && (
        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
          <h4 className="text-[10.5px] font-bold uppercase tracking-widest text-primary">Planning consideration</h4>
          <p className="mt-1 text-[12.5px] leading-snug text-ink">{metric.recommendation}</p>
        </div>
      )}
      <p className="sr-only">Status: {STATUS_META[metric.status].label}</p>
    </section>
  );
}

function ZoneSection({ zone, state, onClear, onCenter }: { zone: ZoneDetail; state: AnalysisState; onClear: () => void; onCenter: () => void }) {
  const cat = state.activeCategory;
  const heatWord = zone.heat >= 75 ? "High" : zone.heat >= 55 ? "Moderate" : "Low";
  const solarWord = zone.solar >= 75 ? "High" : zone.solar >= 55 ? "Moderate" : "Low";
  return (
    <Section
      title="Selected area"
      action={
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={onCenter} aria-label="Fit site" title="Fit site" className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
            <Crosshair size={14} />
          </button>
          <button type="button" onClick={onClear} className="rounded-md px-1.5 text-[12px] font-bold text-primary hover:text-primary-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
            Clear
          </button>
        </div>
      }
    >
      <p className="text-[14px] font-extrabold capitalize text-ink">{zone.label}</p>
      <p className="mb-2 text-[12px] text-muted">
        {zone.buildingCount} {zone.buildingCount === 1 ? "building" : "buildings"} · {zone.density.toLowerCase()} density
      </p>

      {cat === "solar" && (
        <>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold tabular-nums text-ink">{zone.solar}</span>
            <span className="text-[12px] font-bold text-muted">/100 solar exposure</span>
          </div>
          <ScoreTrack value={zone.solar} status={zone.solar >= 75 ? "good" : zone.solar >= 55 ? "moderate" : "attention"} label="Selected area solar" className="mt-1.5" />
          <Rows>
            <Row label="Exposure class" value={solarWord} />
            <Row label="Peak exposure" value={state.metrics.find((m) => m.id === "solar-peak")?.text ?? "—"} />
          </Rows>
          <p className="mt-2 rounded-lg bg-surface-2 px-2.5 py-2 text-[12px] font-semibold text-ink">{zone.solar >= 75 ? "Recommended: Good for solar-oriented development." : zone.solar >= 55 ? "Suitable for daylight-sensitive uses with some shading." : "Consider uses that tolerate limited daylight."}</p>
        </>
      )}
      {cat === "heat" && (
        <>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold tabular-nums text-ink">{zone.heat}</span>
            <span className="text-[12px] font-bold text-muted">/100 heat index · {heatWord}</span>
          </div>
          <ScoreTrack value={zone.heat} status={zone.heat >= 75 ? "attention" : zone.heat >= 55 ? "moderate" : "good"} label="Selected area heat index" className="mt-1.5" />
          <div className="mt-2">
            <h4 className="text-[10.5px] font-bold uppercase tracking-widest text-faint">Main contributors</h4>
            <ul className="mt-1 list-disc pl-4 text-[12px] leading-relaxed text-ink">
              <li>Hard surfaces</li>
              <li>Building concentration ({zone.buildingCount} buildings)</li>
              <li>{zone.greenShare < 15 ? "Low vegetation" : "Limited shade along routes"}</li>
            </ul>
            <h4 className="mt-2 text-[10.5px] font-bold uppercase tracking-widest text-faint">Potential mitigation</h4>
            <ul className="mt-1 list-disc pl-4 text-[12px] leading-relaxed text-ink">
              <li>Increase tree canopy</li>
              <li>Add green / open space</li>
              <li>Improve shading of public space</li>
            </ul>
          </div>
        </>
      )}
      {cat === "wind" && (
        <Rows>
          <Row label="Comfort" value={`${zone.wind} / 100`} />
          <Row label="Prevailing" value={state.metrics.find((m) => m.id === "wind-direction")?.text ?? "—"} />
          <Row label="Tallest nearby" value={zone.avgFloors >= 9 ? "High-rise edge" : "Mid-rise"} />
        </Rows>
      )}
      {(cat === "green" || cat === "openspace") && (
        <Rows>
          <Row label="Green share" value={`${zone.greenShare}%`} />
          <Row label="Open space walk" value={`${zone.walkMinutesToOpenSpace} min`} />
          <Row label="Buildings" value={zone.buildingCount} />
        </Rows>
      )}
      {cat === "carbon" && (
        <Rows>
          <Row label="Floor area intensity" value={`${zone.far.toFixed(2)} FAR`} />
          <Row label="Buildings" value={zone.buildingCount} />
          <Row label="Green share" value={`${zone.greenShare}%`} />
        </Rows>
      )}
      {(cat === "density" || cat === "height" || cat === "landuse") && (
        <>
          <Rows>
            <Row label="Density" value={zone.density} />
            <Row label="FAR" value={zone.far.toFixed(2)} />
            <Row label="Average height" value={`${zone.avgFloors} floors`} />
            <Row label="Population Capacity" value={zone.populationCapacity.toLocaleString("en-US")} />
          </Rows>
          {zone.landUseMix.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Land-use mix in zone">
              {zone.landUseMix.map((l) => (
                <li key={l.landUse} className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-ink">
                  <span className="h-2 w-2 rounded-full" style={{ background: LAND_USE_STYLE[l.landUse as keyof typeof LAND_USE_STYLE]?.stroke ?? "#94A3B8" }} aria-hidden="true" />
                  {l.landUse} {l.share}%
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {(cat === "accessibility" || cat === "roads" || cat === "walkability") && (
        <Rows>
          <Row label="Open space walk" value={`${zone.walkMinutesToOpenSpace} min`} />
          <Row label="Buildings" value={zone.buildingCount} />
          <Row label="Population Capacity" value={zone.populationCapacity.toLocaleString("en-US")} />
        </Rows>
      )}
      {cat === "overview" && (
        <Rows>
          <Row label="Solar" value={`${zone.solar} / 100`} />
          <Row label="Heat index" value={`${zone.heat} / 100`} />
          <Row label="FAR" value={zone.far.toFixed(2)} />
          <Row label="Population Capacity" value={zone.populationCapacity.toLocaleString("en-US")} />
        </Rows>
      )}
    </Section>
  );
}
