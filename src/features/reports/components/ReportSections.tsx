import type { ReactElement } from "react";
import { formatDate, formatNumber } from "../../projects/project.service";
import { getCategory } from "../../analysis/data/analysis.data";
import { COMPARE_METRICS, METRICS } from "../../optimization/data/optimization.data";
import {
  beforeAfterRows,
  constraintRows,
  environmentalMetrics,
  executiveSummary,
  formatAnalysisNumber,
  goalRows,
  insightRows,
  keyMetrics,
  landUseRows,
  mobilityMetrics,
  objectiveRows,
  objectCountRows,
  planCompositionRows,
  projectRows,
  provenanceRows,
  recommendationRows,
  scenarioChangeRows,
  scenarioRows,
  scoreBreakdown,
  siteRows,
  stageRows,
  urbanFormMetrics,
  viewRows,
} from "../lib/reportData";
import type { ScenarioRow } from "../lib/reportData";
import { enabledSections } from "../lib/reportModel";
import type { ReportConfig, ReportMetric, ReportModel, ReportSectionId } from "../types/report.types";
import { MetricBarList, ScoreBars, ShareBar, TrendChart, type MetricBarProps } from "./ReportCharts";
import { BulletList, DataTable, DefinitionList, DeltaCell, StatusTag, VERDICT_GLYPH, verdictTone } from "./ReportTables";
import { ModelViewFigure, PlanFigure } from "./ReportFigures";
import { SectionUnavailable } from "./ReportStates";

/**
 * Section renderers — one per catalogue entry.
 *
 * Each is a pure function of the report model: no fetching, no local state, no
 * hard-coded numbers. When a source did not respond the section prints an
 * explicit note instead of an empty table, so a generated document is never
 * silently incomplete.
 */

interface SectionProps {
  model: ReportModel;
  report: ReportConfig;
}

const toBar = (m: ReportMetric): MetricBarProps => ({
  label: m.label,
  value: m.value,
  score: m.score,
  status: m.status ?? "neutral",
  note: m.note,
});

/** 2–4 headline numbers, printed as tiles (used by the summary and key metrics). */
function MetricTiles({ items }: { items: ReportMetric[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="report-block grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((m) => (
        <li key={m.id} className="rounded-xl border border-line bg-surface-2/50 px-3 py-2.5">
          <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-muted">{m.label}</p>
          <p className="mt-1 text-[17px] font-extrabold leading-none tabular-nums text-ink">{m.value}</p>
          {m.note && <p className="mt-1 text-[11px] leading-snug text-muted">{m.note}</p>}
          {m.score !== undefined && (
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white" role="presentation">
              <div
                className={`h-full rounded-full ${m.status === "good" ? "bg-success" : m.status === "watch" ? "bg-warning" : m.status === "poor" ? "bg-danger" : "bg-primary"}`}
                style={{ width: `${Math.max(0, Math.min(100, m.score))}%` }}
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function Paragraphs({ items }: { items: string[] }) {
  return (
    <div className="report-block space-y-2.5">
      {items.map((text, i) => (
        <p key={i} className="text-[12.5px] leading-relaxed text-ink">
          {text}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Executive summary
// ---------------------------------------------------------------------------

function ExecutiveSummarySection({ model, report }: SectionProps) {
  const summary = executiveSummary(model, report);
  return (
    <div className="space-y-4">
      <Paragraphs items={summary.paragraphs} />
      <MetricTiles items={summary.highlights} />
      <div>
        <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Recommended actions</h3>
        <ol className="report-block mt-2 space-y-1.5 pl-5 text-[12.5px] leading-relaxed text-ink list-decimal">
          {summary.actions.map((a, i) => (
            <li key={i} className="pl-1">
              {a}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2–5. Project, site, plan, urban form
// ---------------------------------------------------------------------------

function ProjectOverviewSection({ model }: SectionProps) {
  if (!model.project) return <SectionUnavailable label="The project record" />;
  const stages = stageRows(model);
  return (
    <div className="space-y-4">
      {model.project.description && <Paragraphs items={[model.project.description]} />}
      <DefinitionList rows={projectRows(model)} />
      {stages.length > 0 && (
        <div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Programme stages</h3>
          <div className="mt-2">
            <DataTable
              caption="Planning programme stages"
              dense
              columns={[
                { key: "stage", header: "Stage", render: (r) => <span className="font-semibold">{r.label}</span> },
                {
                  key: "status",
                  header: "Status",
                  render: (r) => (
                    <StatusTag
                      tone={r.value === "Completed" ? "good" : r.value === "In Progress" ? "accent" : "neutral"}
                      glyph={r.value === "Completed" ? "✓" : r.value === "In Progress" ? "●" : "○"}
                    >
                      {r.value}
                    </StatusTag>
                  ),
                },
                { key: "note", header: "Detail", render: (r) => <span className="text-muted">{r.note}</span> },
              ]}
              rows={stages.map((r) => ({ id: r.label, ...r }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SiteContextSection({ model }: SectionProps) {
  const rows = siteRows(model);
  if (rows.length === 0) return <SectionUnavailable label="Site context" hint="Open Planning Studio to define the site boundary." />;
  return (
    <div className="space-y-3">
      <DefinitionList rows={rows} />
      <p className="report-block text-[11px] leading-relaxed text-muted">
        Coordinates and surrounding context are demo values produced by the planning module — they illustrate the
        document structure and are not survey data.
      </p>
    </div>
  );
}

function PlanningOverviewSection({ model }: SectionProps) {
  if (!model.planning) return <SectionUnavailable label="The planning document" hint="Open Planning Studio to draw a plan for this project." />;
  const counts = objectCountRows(model);
  const peak = counts.length ? counts[0].count : 1;
  return (
    <div className="space-y-4">
      <DefinitionList rows={planCompositionRows(model)} />
      {counts.length > 0 && (
        <div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Mapped features</h3>
          <div className="mt-1.5">
            <MetricBarList items={counts.map((c) => ({ label: c.label, value: formatNumber(c.count), score: c.count, max: peak, status: "neutral" as const }))} />
          </div>
        </div>
      )}
    </div>
  );
}

function UrbanFormSection({ model }: SectionProps) {
  const landUse = landUseRows(model);
  const bands = model.analysis?.densityDistribution ?? [];
  const metrics = urbanFormMetrics(model);
  const statuses = model.planning?.status ?? [];
  if (landUse.length === 0 && bands.length === 0 && metrics.length === 0 && statuses.length === 0) {
    return <SectionUnavailable label="Urban form data" hint="Draw buildings in Planning Studio, then run the analysis." />;
  }
  return (
    <div className="space-y-4">
      {landUse.length > 0 && (
        <div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Land-use distribution</h3>
          <div className="mt-2">
            <ShareBar rows={landUse.map((l) => ({ label: l.label, share: l.share, count: l.buildings || undefined }))} />
          </div>
        </div>
      )}
      {bands.length > 0 && (
        <div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Building height bands</h3>
          <div className="mt-1.5">
            <MetricBarList
              items={bands.map((b) => ({
                label: b.band,
                value: `${b.buildings} buildings · ${(b.share * 100).toFixed(0)}%`,
                score: b.share * 100,
                status: "accent",
              }))}
            />
          </div>
        </div>
      )}
      {statuses.length > 0 && (
        <div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Delivery status of mapped objects</h3>
          <div className="mt-2">
            <ShareBar rows={statuses.map((s) => ({ label: s.label, share: s.count, count: s.count }))} />
          </div>
        </div>
      )}
      {metrics.length > 0 && (
        <div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Urban form indicators</h3>
          <div className="mt-1.5">
            <MetricBarList items={metrics.map(toBar)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Figures: site plan (2-D) and model view (axonometric)
// ---------------------------------------------------------------------------

/** "Figure 1 / 2" — numbered by position among the report's enabled figures. */
function figureLabel(report: ReportConfig, id: ReportSectionId): string {
  const figures = enabledSections(report).filter((s) => s.id === "sitePlan" || s.id === "modelView");
  const index = figures.findIndex((s) => s.id === id);
  return index >= 0 ? `Figure ${index + 1}` : "Figure";
}

function sourceNote(model: ReportModel): string {
  const kind = model.spatial?.source.kind;
  return kind === "local-plan"
    ? "your saved Planning Studio plan"
    : kind === "demo"
      ? "the demo site model"
      : "the live site model";
}

function SitePlanSection({ model, report }: SectionProps) {
  if (!model.spatial) {
    return (
      <SectionUnavailable
        label="The site plan figure"
        hint="The spatial dataset for this project could not be read. Draw a plan in Planning Studio, then generate the report again."
      />
    );
  }
  return (
    <div className="space-y-3">
      <PlanFigure data={model.spatial} label={figureLabel(report, "sitePlan")} />
      <p className="report-block text-[11.5px] leading-relaxed text-muted">
        Drawn from {sourceNote(model)} — the same geometry the 2-D map and the 3-D city render, so the figure and the
        workspace can never disagree. North is up; the plan is fitted to the page without cropping.
      </p>
    </div>
  );
}

function ModelViewSection({ model, report }: SectionProps) {
  if (!model.spatial) {
    return (
      <SectionUnavailable
        label="The model view figure"
        hint="The spatial dataset for this project could not be read. Draw a plan in Planning Studio, then generate the report again."
      />
    );
  }
  const facts = model.planning;
  return (
    <div className="space-y-3">
      <ModelViewFigure data={model.spatial} label={figureLabel(report, "modelView")} />
      <p className="report-block text-[11.5px] leading-relaxed text-muted">
        Axonometric massing of {sourceNote(model)}, drawn at true height with no vertical exaggeration
        {facts ? ` — ${facts.buildings} volumes, tallest ${facts.tallestM.toFixed(1)} m, average ${facts.avgFloors.toFixed(1)} floors` : ""}. Roofs are
        coloured by land use, existing buildings in grey.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6–7. Environmental & mobility
// ---------------------------------------------------------------------------

function EnvironmentalSection({ model }: SectionProps) {
  const analysis = model.analysis;
  if (!analysis) return <SectionUnavailable label="Environmental analysis" hint="Run the analysis in the Analysis workspace, then generate the report again." />;
  const breakdown = scoreBreakdown(model);
  const metrics = environmentalMetrics(model);
  const comparison = analysis.comparison;
  return (
    <div className="space-y-4">
      <MetricTiles
        items={[
          { id: "overall", label: "Overall analysis score", value: `${Math.round(analysis.overallScore)}/100`, score: analysis.overallScore, status: analysis.overallScore >= 75 ? "good" : analysis.overallScore >= 55 ? "watch" : "poor", note: `Generated ${formatDate(analysis.generatedAt)}` },
          ...metrics.slice(0, 3),
        ]}
      />
      {breakdown.length > 0 && (
        <div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Score breakdown</h3>
          <div className="mt-2">
            <ScoreBars rows={breakdown.map((b) => ({ id: b.id, label: b.label, score: b.score }))} />
          </div>
        </div>
      )}
      {metrics.length > 0 && (
        <div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Environmental indicators</h3>
          <div className="mt-1.5">
            <MetricBarList items={metrics.map(toBar)} />
          </div>
        </div>
      )}
      {analysis.trend.length > 1 && (
        <div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Environmental trend</h3>
          <div className="mt-2">
            <TrendChart points={analysis.trend} />
          </div>
        </div>
      )}
      {comparison.length > 0 && (
        <div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Current plan vs baseline</h3>
          <div className="mt-2">
            <DataTable
              caption="Current plan compared with the recorded baseline"
              dense
              columns={[
                { key: "label", header: "Indicator", render: (r) => <span className="font-semibold">{r.label}</span> },
                { key: "current", header: "Current", align: "right", render: (r) => <span className="font-bold">{r.current}</span> },
                { key: "baseline", header: "Baseline", align: "right", render: (r) => <span className="text-muted">{r.baseline}</span> },
                { key: "delta", header: "Change", align: "right", render: (r) => <DeltaCell deltaPct={r.deltaPct} higherIsBetter={r.higherIsBetter} /> },
              ]}
              rows={comparison.map((c) => ({
                id: c.id,
                label: c.label,
                current: formatAnalysisNumber(c.current, c.unit),
                baseline: formatAnalysisNumber(c.baseline, c.unit),
                deltaPct: c.baseline !== 0 ? ((c.current - c.baseline) / Math.abs(c.baseline)) * 100 : null,
                higherIsBetter: c.higherIsBetter,
              }))}
            />
          </div>
        </div>
      )}
      <p className="report-block text-[11px] leading-relaxed text-muted">
        Indicators are produced by the demo analysis engine ({analysis.engine.version}) — {analysis.engine.note}
      </p>
    </div>
  );
}

function MobilitySection({ model }: SectionProps) {
  const analysis = model.analysis;
  if (!analysis) return <SectionUnavailable label="Mobility analysis" hint="Run the analysis in the Analysis workspace, then generate the report again." />;
  const metrics = mobilityMetrics(model);
  const mobilityScore = analysis.breakdown.find((b) => b.id === "mobility");
  const findings = analysis.findings.filter((f) => getCategory(f.category).group === "Mobility");
  if (metrics.length === 0 && !mobilityScore && findings.length === 0) {
    return <SectionUnavailable label="Mobility indicators" />;
  }
  return (
    <div className="space-y-4">
      {mobilityScore && (
        <ScoreBars rows={[{ id: mobilityScore.id, label: mobilityScore.label, score: mobilityScore.score, highlight: true }]} />
      )}
      {metrics.length > 0 && <MetricBarList items={metrics.map(toBar)} />}
      {findings.length > 0 && (
        <div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Mobility findings</h3>
          <div className="mt-2">
            <BulletList items={findings.map((f) => f.text)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 8–10. Optimization, scenarios, before / after
// ---------------------------------------------------------------------------

function OptimizationSection({ model }: SectionProps) {
  const opt = model.optimization;
  if (!opt) return <SectionUnavailable label="Optimization data" hint="Open the Optimization workspace to configure goals and constraints." />;
  const goals = goalRows(model);
  const objectives = objectiveRows(model);
  const constraints = constraintRows(model);
  const generation = opt.state.generation;
  return (
    <div className="space-y-4">
      <DefinitionList
        rows={[
          { label: "Scenario engine", value: `${generation?.providerId ?? "demo"} ${generation?.providerVersion ?? ""}`.trim() },
          { label: "Last run", value: generation ? formatDate(generation.generatedAt) : "No saved run" },
          { label: "Scenario set", value: `${opt.scenarios.length} evaluated`, note: opt.scenarios.map((s) => `${s.letter} ${s.name}`).join(" · ") },
          { label: "Selected scenario", value: opt.selected ? `${opt.selected.letter} — ${opt.selected.name}` : "None selected" },
          { label: "Current plan score", value: `${Math.round(opt.context.current.score)}/100` },
          { label: "Runs recorded", value: `${opt.state.history.length + (generation ? 1 : 0)}` },
        ]}
      />
      {opt.generatedForReport && (
        <p className="report-block rounded-xl border border-line bg-surface-2/60 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-muted">
          No scenario run was saved in the Optimization workspace, so this report derived the scenario set from the
          current plan using the same deterministic engine. Nothing was written back to the workspace.
        </p>
      )}
      {goals.length > 0 && (
        <div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Planning goals</h3>
          <div className="mt-2">
            <DataTable
              caption="Planning goals, targets and current performance"
              dense
              columns={[
                { key: "label", header: "Goal", render: (r) => <span className="font-semibold">{r.label}</span> },
                {
                  key: "priority",
                  header: "Priority",
                  render: (r) => (
                    <StatusTag tone={r.priority === "high" ? "poor" : r.priority === "medium" ? "watch" : "neutral"}>
                      {r.priority}
                    </StatusTag>
                  ),
                },
                { key: "target", header: "Target", align: "right", render: (r) => r.target },
                { key: "current", header: "Current plan", align: "right", render: (r) => <span className="font-bold">{r.current}</span> },
                {
                  key: "progress",
                  header: "Attainment",
                  align: "right",
                  render: (r) => `${Math.round(Math.min(1.2, r.progress) * 100)}%`,
                },
              ]}
              rows={goals}
            />
          </div>
        </div>
      )}
      {objectives.length > 0 && (
        <div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Objective weights</h3>
          <div className="mt-2">
            <ScoreBars rows={objectives.map((o) => ({ id: o.id, label: o.label, score: o.weight, detail: o.hint }))} max={100} />
          </div>
        </div>
      )}
      {constraints.length > 0 && (
        <div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Constraints (current plan)</h3>
          <div className="mt-2">
            <DataTable
              caption="Planning constraints and the current plan's compliance"
              dense
              columns={[
                { key: "label", header: "Constraint", render: (r) => <span className="font-semibold">{r.label}</span> },
                { key: "limit", header: "Limit", align: "right", render: (r) => r.limit },
                { key: "value", header: "Current", align: "right", render: (r) => <span className="font-bold">{r.value}</span> },
                {
                  key: "verdict",
                  header: "Verdict",
                  render: (r) => (
                    <StatusTag tone={verdictTone(r.verdict)} glyph={VERDICT_GLYPH[r.verdict]}>
                      {r.verdict === "off" ? "disabled" : r.verdict}
                    </StatusTag>
                  ),
                },
                { key: "message", header: "Note", render: (r) => <span className="text-muted">{r.message}</span> },
              ]}
              rows={constraints}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ScenarioComparisonSection({ model }: SectionProps) {
  const scenarios = scenarioRows(model);
  if (scenarios.length === 0) return <SectionUnavailable label="Scenarios" hint="Generate scenarios in the Optimization workspace, or generate the report again to derive them." />;
  const selectedId = model.optimization?.state.selectedScenarioId ?? null;
  const best = scenarios.reduce((a, b) => (b.score > a.score ? b : a));
  return (
    <div className="space-y-4">
      <ScoreBars
        rows={scenarios.map((s) => ({
          id: s.id,
          label: `${s.letter} · ${s.name}`,
          score: s.score,
          detail: s.selected ? "Selected" : s.id === best.id ? "Best score" : s.kindLabel,
          highlight: s.selected || s.id === best.id,
        }))}
      />
      <DataTable
        caption="Scenario performance across the comparison metrics"
        dense
        columns={[
          {
            key: "scenario",
            header: "Scenario",
            render: (r) => (
              <span className="font-semibold">
                {r.letter} · {r.name}
                {r.selected && <span className="ml-1.5 text-[10.5px] font-bold uppercase text-primary">selected</span>}
              </span>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (r) => (
              <StatusTag tone={r.statusLabel === "Selected" ? "accent" : r.statusLabel === "Archived" ? "neutral" : "good"}>
                {r.statusLabel}
              </StatusTag>
            ),
          },
          { key: "score", header: "Score", align: "right", render: (r) => <span className="font-extrabold">{Math.round(r.score)}</span> },
          ...COMPARE_METRICS.slice(0, 6).map((id) => ({
            key: id,
            header: METRICS[id].short,
            align: "right" as const,
            render: (r: ScenarioRow) => r.metrics.find((m) => m.id === id)?.value ?? "—",
          })),
          {
            key: "compliance",
            header: "Constraints",
            align: "right",
            render: (r) =>
              r.violations > 0 ? (
                <StatusTag tone="poor" glyph={VERDICT_GLYPH.fail}>
                  {r.violations} breached
                </StatusTag>
              ) : r.warnings > 0 ? (
                <StatusTag tone="watch" glyph={VERDICT_GLYPH.warning}>
                  {r.warnings} warning{r.warnings === 1 ? "" : "s"}
                </StatusTag>
              ) : (
                <StatusTag tone="good" glyph={VERDICT_GLYPH.pass}>
                  compliant
                </StatusTag>
              ),
          },
        ]}
        rows={scenarios}
      />
      <p className="report-block text-[11.5px] leading-relaxed text-muted">
        Scenario {best.letter} ({best.name}) scores highest under the current objective weights
        {selectedId ? `, and scenario ${scenarios.find((s) => s.id === selectedId)?.letter ?? ""} is the one selected for the plan` : ", but no scenario has been selected yet"}.
      </p>
    </div>
  );
}

function BeforeAfterSection({ model }: SectionProps) {
  const rows = beforeAfterRows(model);
  const changes = scenarioChangeRows(model);
  const scenario = model.optimization?.selected ?? null;
  if (rows.length === 0) return <SectionUnavailable label="Before / after comparison" hint="Select a scenario in the Optimization workspace to compare it with the current plan." />;
  return (
    <div className="space-y-4">
      <p className="report-block text-[12.5px] leading-relaxed text-ink">
        {scenario
          ? `Comparison of the current plan against scenario ${scenario.letter} — ${scenario.name} (${scenario.description}).`
          : "Comparison of the current plan against the highest-scoring scenario, because no scenario has been selected yet."}
      </p>
      <DataTable
        caption="Current plan compared with the proposed scenario"
        dense
        columns={[
          { key: "label", header: "Metric", render: (r) => <span className="font-semibold">{r.label}</span> },
          { key: "current", header: "Current plan", align: "right", render: (r) => <span className="text-muted">{r.current}</span> },
          { key: "proposed", header: "Proposed", align: "right", render: (r) => <span className="font-bold">{r.proposed}</span> },
          { key: "delta", header: "Change", align: "right", render: (r) => <DeltaCell deltaPct={r.deltaPct} higherIsBetter={r.higherIsBetter} /> },
        ]}
        rows={rows}
      />
      {changes.length > 0 && (
        <div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Proposed changes</h3>
          <div className="mt-2">
            <DataTable
              caption="Changes the scenario proposes against the current plan"
              dense
              columns={[
                { key: "type", header: "Type", render: (r) => <StatusTag tone="accent">{r.type}</StatusTag> },
                { key: "text", header: "Change", render: (r) => <span className="font-semibold">{r.text}</span> },
                { key: "detail", header: "Detail", render: (r) => <span className="text-muted">{r.detail ?? "—"}</span> },
              ]}
              rows={changes}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 11–15. Visualization, metrics, insights, recommendations, information
// ---------------------------------------------------------------------------

function VisualizationSection({ model }: SectionProps) {
  const views = viewRows(model);
  if (views.length === 0) {
    return <SectionUnavailable label="Saved views" hint="Save a camera view in the Visualization workspace to reference it here." />;
  }
  return (
    <div className="space-y-3">
      <DataTable
        caption="Saved visualization views attached to this project"
        dense
        columns={[
          { key: "name", header: "View", render: (r) => <span className="font-semibold">{r.name}</span> },
          { key: "mode", header: "Mode", render: (r) => r.mode },
          { key: "viewMode", header: "Renderer", render: (r) => r.viewMode },
          { key: "basemap", header: "Basemap", render: (r) => r.basemap },
          { key: "scenario", header: "Scenario", render: (r) => r.scenario },
          { key: "metrics", header: "Metrics", align: "right", render: (r) => r.metrics },
          { key: "annotations", header: "Notes", align: "right", render: (r) => r.annotations },
          { key: "createdAt", header: "Captured", align: "right", render: (r) => r.createdAt },
        ]}
        rows={views}
      />
      <p className="report-block text-[11.5px] leading-relaxed text-muted">
        Views are references, not copies: each one stores a camera pose, layer visibility and scenario, so opening it in
        the Visualization workspace reproduces exactly what this row describes.
      </p>
    </div>
  );
}

function KeyMetricsSection({ model }: SectionProps) {
  const metrics = keyMetrics(model);
  if (metrics.length === 0) return <SectionUnavailable label="Key metrics" />;
  return (
    <div className="space-y-4">
      <MetricTiles items={metrics.slice(0, 4)} />
      <MetricBarList items={metrics.map(toBar)} />
    </div>
  );
}

function InsightsSection({ model }: SectionProps) {
  const insights = insightRows(model);
  if (insights.length === 0) return <SectionUnavailable label="Insights" hint="Run the analysis to record findings for this project." />;
  return (
    <DataTable
      caption="Findings recorded by the analysis and the project record"
      dense
      columns={[
        { key: "group", header: "Area", render: (r) => <span className="font-semibold">{r.group}</span> },
        { key: "text", header: "Finding", render: (r) => r.text },
        {
          key: "status",
          header: "Assessment",
          align: "right",
          render: (r) => (
            <StatusTag tone={r.status ?? "neutral"} glyph={r.status === "good" ? "✓" : r.status === "poor" ? "!" : "i"}>
              {r.statusLabel}
            </StatusTag>
          ),
        },
      ]}
      rows={insights}
    />
  );
}

function RecommendationsSection({ model }: SectionProps) {
  const recommendations = recommendationRows(model);
  if (recommendations.length === 0) {
    return (
      <p className="report-block text-[12.5px] leading-relaxed text-ink">
        No recommendations were produced: every constraint passes and no indicator is flagged for attention in the
        current data.
      </p>
    );
  }
  return (
    <DataTable
      caption="Recommended actions, ordered by priority"
      dense
      columns={[
        {
          key: "priority",
          header: "Priority",
          render: (r) => (
            <StatusTag tone={r.priority === "high" ? "poor" : r.priority === "medium" ? "watch" : "neutral"}>
              {r.priority}
            </StatusTag>
          ),
        },
        { key: "text", header: "Recommendation", render: (r) => <span className="font-semibold">{r.text}</span> },
        { key: "source", header: "Derived from", render: (r) => <span className="text-muted">{r.source}</span> },
      ]}
      rows={recommendations}
    />
  );
}

function ProjectInformationSection({ model, report }: SectionProps) {
  return (
    <div className="space-y-3">
      <DefinitionList rows={provenanceRows(model, report)} />
      <p className="report-block text-[11px] leading-relaxed text-muted">
        UrbanForma reports read the same services the workspace uses — project, planning, analysis, optimization and
        visualization — and store configuration only. Numbers are never copied into the report, so regenerating it always
        reflects the current state of the project.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

const RENDERERS: Record<ReportSectionId, (props: SectionProps) => ReactElement> = {
  executiveSummary: ExecutiveSummarySection,
  projectOverview: ProjectOverviewSection,
  siteContext: SiteContextSection,
  sitePlan: SitePlanSection,
  planningOverview: PlanningOverviewSection,
  urbanForm: UrbanFormSection,
  modelView: ModelViewSection,
  environmental: EnvironmentalSection,
  mobility: MobilitySection,
  optimization: OptimizationSection,
  scenarioComparison: ScenarioComparisonSection,
  beforeAfter: BeforeAfterSection,
  visualization: VisualizationSection,
  keyMetrics: KeyMetricsSection,
  insights: InsightsSection,
  recommendations: RecommendationsSection,
  projectInformation: ProjectInformationSection,
};

/** Renders one section's body (the heading and numbering live in the preview). */
export function ReportSectionBody({ id, model, report }: { id: ReportSectionId } & SectionProps) {
  const Renderer = RENDERERS[id];
  return <Renderer model={model} report={report} />;
}
