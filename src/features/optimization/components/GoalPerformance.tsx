import { Check, Minus } from "lucide-react";
import { GOAL_ICONS, PRIORITIES } from "../data/optimization.data";
import type { GoalRow } from "../lib/scenario.scoring";
import type { ScoredScenario } from "../services/optimization.service";
import type { PlanningGoal } from "../types/optimization.types";

interface GoalPerformanceProps {
  rows: GoalRow[];
  goals: PlanningGoal[];
  scenarios: ScoredScenario[];
  activeId: string | null;
}

const SERIES_COLORS = ["#2563EB", "#059669", "#D97706", "#7C3AED"];

/**
 * Goal performance: target · current · each compared scenario, with progress
 * bars towards the target. Values always accompany the bars.
 */
export function GoalPerformance({ rows, goals, scenarios, activeId }: GoalPerformanceProps) {
  return (
    <section aria-labelledby="goal-performance-title" className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id="goal-performance-title" className="text-[15px] font-extrabold text-ink">
            Goal Performance
          </h3>
          <p className="text-[12px] text-muted">How the current plan and each compared scenario perform against your planning goals.</p>
        </div>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] font-bold text-ink" aria-label="Series">
          <li className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#64748B]" aria-hidden="true" /> Current
          </li>
          {scenarios.map((s, i) => (
            <li key={s.id} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }} aria-hidden="true" /> {s.letter} · {s.name}
            </li>
          ))}
        </ul>
      </div>

      <ul className="mt-3 grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
        {rows.map((r) => {
          const Icon = GOAL_ICONS[r.goalId];
          const priority = goals.find((g) => g.id === r.goalId)?.priority ?? "medium";
          const pLabel = PRIORITIES.find((p) => p.id === priority)?.label ?? "Medium";
          const entries = [{ key: "current", label: "Current", color: "#64748B", value: r.current }, ...scenarios.map((s, i) => ({ key: s.id, label: s.name, color: SERIES_COLORS[i % SERIES_COLORS.length], value: s.metrics[r.metric] }))];
          return (
            <li key={r.goalId} className="rounded-xl border border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                    <Icon size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-extrabold text-ink">{r.label}</p>
                    <p className="text-[11px] text-muted">
                      Target <span className="font-bold text-ink">{r.targetText}</span> · {pLabel} priority
                    </p>
                  </div>
                </div>
              </div>
              <ul className="mt-2.5 grid gap-1.5">
                {entries.map((e) => {
                  const pct = r.progress(e.value);
                  const met = pct >= 99.5;
                  const active = e.key === activeId;
                  return (
                    <li key={e.key} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-x-2 text-[11.5px]">
                      <span className={`truncate font-bold ${active ? "text-primary" : "text-muted"}`} title={e.label}>
                        {e.label}
                      </span>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={`${e.label}: ${r.format(e.value)} — ${Math.round(pct)}% of target`}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: e.color }} />
                      </div>
                      <span className="inline-flex items-center gap-1 tabular-nums font-extrabold text-ink">
                        {r.format(e.value)}
                        {met ? <Check size={11} className="text-success" strokeWidth={3} aria-label="target met" /> : <Minus size={11} className="text-faint" aria-label="below target" />}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
