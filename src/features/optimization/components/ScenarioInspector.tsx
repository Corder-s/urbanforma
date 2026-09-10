import { Archive, BookmarkCheck, FolderInput, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { PERFORMANCE_METRICS, METRICS, formatMetric, getScenarioKind, scoreStatus } from "../data/optimization.data";
import type { OptimizationWorkspaceState } from "../hooks/useOptimizationState";
import type { ScoredScenario } from "../services/optimization.service";
import { ConstraintStatus } from "./ConstraintStatus";
import { ScenarioStatusBadge } from "./ScenarioCard";
import { ScenarioChanges } from "./ScenarioChanges";
import { TradeoffPanel } from "./TradeoffPanel";

interface ScenarioInspectorProps {
  state: OptimizationWorkspaceState;
  onClose?: () => void;
  onRequestSelect: (scenario: ScoredScenario) => void;
  onRequestApply: (scenario: ScoredScenario) => void;
  idPrefix: string;
}

const SCORE_TONE = { good: "text-success", moderate: "text-warning", attention: "text-danger" } as const;
const BAR_TONE = { good: "bg-success", moderate: "bg-warning", attention: "bg-danger" } as const;

/**
 * Right panel — "Scenario Details": score, performance breakdown, changes,
 * trade-offs, constraint status and the decision actions. Shows the current
 * plan summary when no scenario is active.
 */
export function ScenarioInspector({ state, onClose, onRequestSelect, onRequestApply, idPrefix }: ScenarioInspectorProps) {
  const { context, activeScenario, currentChecks } = state;
  if (!context) return null;
  const s = activeScenario;
  const kind = s ? getScenarioKind(s.kind) : null;
  const titleId = `${idPrefix}-title`;

  return (
    <div className="flex h-full min-h-0 flex-col" aria-labelledby={titleId}>
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-4">
        <h2 id={titleId} className="text-[11px] font-bold uppercase tracking-widest text-faint">
          {s ? "Scenario Details" : "Current Plan"}
        </h2>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close details" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* header */}
        <div className="border-b border-line p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{s ? `Scenario ${s.letter}` : context.projectName}</p>
              <h3 className="mt-0.5 flex items-center gap-1.5 text-[16px] font-extrabold text-ink">
                {kind && <kind.icon size={16} className="shrink-0 text-primary" aria-hidden="true" />}
                <span className="truncate">{s ? s.name : "Current plan"}</span>
              </h3>
              {s ? <ScenarioStatusBadge status={s.status} className="mt-1.5" /> : <p className="mt-1 text-[11.5px] text-muted">{context.analysisFromRun ? "Based on the last analysis run" : "Based on the baseline analysis"}</p>}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-faint">Overall Score</p>
              <p className={`text-[28px] font-extrabold leading-none tabular-nums ${SCORE_TONE[scoreStatus(s ? s.score : context.current.score)]}`}>
                {s ? s.score : context.current.score}
                <span className="ml-1 text-[12px] font-bold text-faint">/ 100</span>
              </p>
              {s && (
                <p className="mt-0.5 text-[10.5px] tabular-nums text-muted">
                  {s.score - context.current.score >= 0 ? "+" : "−"}
                  {Math.abs(s.score - context.current.score)} vs current
                </p>
              )}
            </div>
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-muted">{s ? s.description : "Generated scenarios are compared against this plan. Select one on the map or in the list to inspect its changes, trade-offs and constraint status."}</p>
          {s && (
            <p className="mt-2 text-[10.5px] text-faint" title="How the score is composed">
              Score = current plan {s.scoreParts.base} {s.scoreParts.objectiveDelta >= 0 ? "+" : "−"} weighted gain {Math.abs(s.scoreParts.objectiveDelta).toFixed(1)}
              {s.scoreParts.penalty > 0 ? ` − constraint penalty ${s.scoreParts.penalty}` : ""}
            </p>
          )}
        </div>

        {/* performance */}
        <div className="border-b border-line p-4">
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-faint">Performance</h4>
          <ul className="mt-2 grid gap-2">
            {PERFORMANCE_METRICS.map((id) => {
              const value = s ? s.metrics[id] : context.current.metrics[id];
              const cur = context.current.metrics[id];
              const delta = s ? value - cur : 0;
              const st = scoreStatus(value);
              return (
                <li key={id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1">
                  <span className="truncate text-[12px] font-semibold text-ink">{METRICS[id].label}</span>
                  <span className="text-[12px] font-extrabold tabular-nums text-ink">
                    {Math.round(value)}
                    {s && delta !== 0 && <span className={`ml-1 text-[10.5px] font-bold ${delta > 0 ? "text-success" : "text-warning"}`}>({delta > 0 ? "+" : "−"}{Math.abs(Math.round(delta))})</span>}
                  </span>
                  <div className="col-span-2 relative h-1.5 w-full overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} aria-label={`${METRICS[id].label} ${Math.round(value)} of 100`}>
                    <div className={`h-full rounded-full ${BAR_TONE[st]}`} style={{ width: `${value}%` }} />
                    {s && <span className="absolute top-0 h-full w-0.5 bg-ink/50" style={{ left: `calc(${cur}% - 1px)` }} aria-hidden="true" title={`Current plan ${cur}`} />}
                  </div>
                </li>
              );
            })}
          </ul>
          <dl className="mt-3 grid grid-cols-2 gap-1.5 text-[11.5px]">
            {(["greenCoverage", "heatIndex", "solar", "populationCapacity", "far", "maxFloors"] as const).map((id) => (
              <div key={id} className="rounded-lg bg-surface-2 px-2 py-1.5">
                <dt className="truncate text-[10px] font-bold uppercase tracking-wider text-faint">{METRICS[id].short}</dt>
                <dd className="truncate font-extrabold tabular-nums text-ink">{formatMetric(id, s ? s.metrics[id] : context.current.metrics[id])}</dd>
              </div>
            ))}
          </dl>
        </div>

        {s ? (
          <>
            <div className="border-b border-line p-4">
              <ScenarioChanges changes={s.changes} />
            </div>
            <div className="border-b border-line p-4">
              <TradeoffPanel tradeoffs={s.tradeoffs} current={context.current.metrics} metrics={s.metrics} />
            </div>
            <div className="p-4">
              <ConstraintStatus checks={s.checks} dense />
            </div>
          </>
        ) : (
          <div className="p-4">
            <ConstraintStatus checks={currentChecks} title="Current plan vs constraints" dense />
          </div>
        )}
      </div>

      {/* actions */}
      {s && (
        <div className="shrink-0 border-t border-line bg-white p-3">
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant={s.status === "Selected" ? "secondary" : "primary"} onClick={() => onRequestSelect(s)} disabled={s.status === "Selected" || s.status === "Archived"} className="px-2">
              <BookmarkCheck size={15} aria-hidden="true" /> {s.status === "Selected" ? "Preferred" : "Select Scenario"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onRequestApply(s)} disabled={s.status !== "Selected"} title={s.status !== "Selected" ? "Select the scenario first" : "Create a local version from this scenario"} className="px-2">
              <FolderInput size={15} aria-hidden="true" /> Apply to Project
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[10.5px] text-faint">Apply creates a new local version; the current plan stays intact.</p>
            {s.status !== "Archived" && s.status !== "Selected" && (
              <button type="button" onClick={() => state.archiveScenario(s.id)} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
                <Archive size={12} aria-hidden="true" /> Archive
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
