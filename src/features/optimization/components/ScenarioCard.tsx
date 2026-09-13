import { BookmarkCheck, Eye, GitCompareArrows } from "lucide-react";
import { CARD_METRICS, METRICS, STATUS_META, formatMetric, getScenarioKind, scoreStatus } from "../data/optimization.data";
import type { ScoredScenario } from "../services/optimization.service";
import { ConstraintSummaryPill } from "./ConstraintStatus";

interface ScenarioCardProps {
  scenario: ScoredScenario;
  active: boolean;
  compared: boolean;
  compareDisabled: boolean;
  onView: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onSelect?: (id: string) => void;
  dense?: boolean;
}

export function ScenarioStatusBadge({ status, className = "" }: { status: ScoredScenario["status"]; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-bold ring-1 ${meta.tone} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

const SCORE_TONE = { good: "text-success", moderate: "text-warning", attention: "text-danger" } as const;

/** Generated scenario summary card — an accessible article with explicit actions (never a click-anywhere card). */
export function ScenarioCard({ scenario, active, compared, compareDisabled, onView, onToggleCompare, onSelect, dense = false }: ScenarioCardProps) {
  const kind = getScenarioKind(scenario.kind);
  const Icon = kind.icon;
  const titleId = `scenario-card-${scenario.id}-title`;
  const changeCount = scenario.spatialState.counts.added + scenario.spatialState.counts.modified + scenario.spatialState.counts.removed;
  return (
    <article aria-labelledby={titleId} aria-current={active ? "true" : undefined} className={["flex h-full flex-col rounded-2xl border bg-surface transition-shadow", active ? "border-primary/50 shadow-soft ring-2 ring-primary/15" : "border-line hover:shadow-soft", dense ? "p-3" : "p-4"].join(" ")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-[13px] font-extrabold text-primary" aria-hidden="true">
            {scenario.letter}
          </span>
          <div className="min-w-0">
            <h3 id={titleId} className="flex items-center gap-1.5 truncate text-[14px] font-extrabold text-ink">
              <Icon size={14} className="shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate">{scenario.name}</span>
            </h3>
            <ScenarioStatusBadge status={scenario.status} className="mt-0.5" />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className={`block text-[22px] font-extrabold leading-none tabular-nums ${SCORE_TONE[scoreStatus(scenario.score)]}`}>{scenario.score}</span>
          <span className="text-[10.5px] font-bold text-faint">/ 100</span>
        </div>
      </div>

      {!dense && <p className="mt-2.5 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{scenario.description}</p>}

      <dl className="mt-3 grid grid-cols-3 gap-1.5">
        {CARD_METRICS.map((id) => (
          <div key={id} className="rounded-lg bg-surface-2 px-2 py-1.5">
            <dt className="truncate text-[10px] font-bold uppercase tracking-wider text-faint">{METRICS[id].short}</dt>
            <dd className="text-[13px] font-extrabold tabular-nums text-ink">{formatMetric(id, scenario.metrics[id])}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-muted">
        <span>
          Changes <span className="font-extrabold text-ink">{changeCount}</span>
        </span>
        <ConstraintSummaryPill checks={scenario.checks} />
      </div>

      <div className="mt-auto flex items-center gap-1.5 pt-3">
        <button
          type="button"
          onClick={() => onView(scenario.id)}
          aria-pressed={active}
          className={["inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[12px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20", active ? "bg-primary text-on-brand" : "border border-line bg-surface text-primary hover:border-primary hover:bg-surface-2"].join(" ")}
        >
          <Eye size={14} aria-hidden="true" /> {active ? "Viewing" : "View Scenario"}
        </button>
        <button
          type="button"
          onClick={() => onToggleCompare(scenario.id)}
          disabled={!compared && compareDisabled}
          aria-pressed={compared}
          aria-label={`${compared ? "Remove from" : "Add to"} comparison: ${scenario.name}`}
          title={compared ? "Remove from comparison" : compareDisabled ? "Up to four scenarios can be compared" : "Add to comparison"}
          className={["grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-40", compared ? "border-primary bg-primary/10 text-primary" : "border-line text-muted hover:border-primary hover:text-primary"].join(" ")}
        >
          <GitCompareArrows size={15} aria-hidden="true" />
        </button>
        {onSelect && scenario.status !== "Selected" && (
          <button type="button" onClick={() => onSelect(scenario.id)} aria-label={`Select ${scenario.name} as preferred`} title="Select as preferred" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-success hover:text-success focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
            <BookmarkCheck size={15} aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
}
