import { Link } from "react-router-dom";
import { Badge } from "../../../components/ui/Badge";
import type { VisualizationState } from "../hooks/useVisualizationState";

interface ScenarioSelectorProps {
  state: VisualizationState;
  /** Compact list (no descriptions) for the phone drawer. */
  compact?: boolean;
}

/**
 * Scenario selection: Current Plan + the Step 14 planning scenarios (Balanced
 * Growth, Green Priority, Mobility First, Compact City). Selecting one swaps
 * the dataset shown by both renderers; the preferred scenario is badged.
 */
export function ScenarioSelector({ state, compact = false }: ScenarioSelectorProps) {
  const { scenarios, scenarioOptions, selectedScenario, setScenario, projectId } = state;
  const loading = scenarios.status === "loading" || scenarios.status === "idle";
  return (
    <div>
      <div role="radiogroup" aria-label="Scenario" aria-busy={loading} className="grid gap-1">
        {loading && scenarioOptions.length === 0 && (
          <div className="grid gap-1" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" />
            ))}
          </div>
        )}
        {scenarioOptions.map((o) => {
          const active = (o.id ?? null) === (selectedScenario ?? null);
          return (
            <button
              key={o.id ?? "current"}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setScenario(o.id)}
              className={[
                "flex w-full items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                active ? "border-primary bg-primary/5" : "border-line bg-white hover:border-line-strong hover:bg-surface-2",
              ].join(" ")}
            >
              <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md text-[10.5px] font-extrabold ${active ? "bg-primary text-white" : "bg-surface-2 text-muted"}`} aria-hidden="true">
                {o.letter ?? "•"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-[13px] font-bold text-ink">{o.name}</span>
                  {o.preferred && (
                    <Badge tone="green" dot>
                      Preferred
                    </Badge>
                  )}
                  {o.id === null && (
                    <Badge tone="neutral" dot>
                      Baseline
                    </Badge>
                  )}
                </span>
                {!compact && <span className="mt-0.5 block text-[11.5px] leading-snug text-muted">{o.description}</span>}
                <span className="mt-1 block text-[11px] tabular-nums text-muted">
                  Score <span className="font-bold text-ink">{Math.round(o.score)}</span> · Green <span className="font-bold text-ink">{o.metrics.greenCoverage.display}</span> · Pop. <span className="font-bold text-ink">{o.metrics.population.display}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {scenarios.status === "error" && <p className="mt-2 text-[11.5px] leading-snug text-warning">{scenarios.note}</p>}
      {scenarios.status === "ready" && (
        <p className="mt-2 text-[11px] leading-snug text-faint">
          {scenarios.note}{" "}
          {projectId && (
            <Link to={`/app/optimization?projectId=${projectId}`} className="font-bold text-primary hover:text-primary-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
              Open Optimization
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
