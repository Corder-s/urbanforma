import { GOALS, GOAL_ICONS, PRIORITIES } from "../data/optimization.data";
import type { GoalId, GoalPriority, PlanningGoal } from "../types/optimization.types";

interface GoalsPanelProps {
  goals: PlanningGoal[];
  onChange: (id: GoalId, priority: GoalPriority) => void;
  disabled?: boolean;
  idPrefix: string;
}

/**
 * Planning goals with a Low / Medium / High priority per goal. A radio group
 * per goal (keyboard: arrows within a group, Tab between goals) — no slider
 * pile. Priorities steer the intensity of the generated scenarios.
 */
export function GoalsPanel({ goals, onChange, disabled = false, idPrefix }: GoalsPanelProps) {
  const highCount = goals.filter((g) => g.priority === "high").length;
  return (
    <section aria-labelledby={`${idPrefix}-goals-title`} className="border-b border-line">
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <h3 id={`${idPrefix}-goals-title`} className="text-[11px] font-bold uppercase tracking-widest text-faint">
          Planning Goals
        </h3>
        <span className="text-[11px] font-semibold text-muted">{highCount} high priority</span>
      </div>
      <p className="px-4 pt-1 text-[12px] leading-relaxed text-muted">Set how strongly each goal should shape the generated scenarios.</p>
      <ul className="grid gap-1 px-2 py-3">
        {GOALS.map((def) => {
          const value = goals.find((g) => g.id === def.id)?.priority ?? "medium";
          const Icon = GOAL_ICONS[def.id];
          const labelId = `${idPrefix}-goal-${def.id}`;
          return (
            <li key={def.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-surface-2/70">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                  <Icon size={14} />
                </span>
                <div className="min-w-0">
                  <span id={labelId} className="block truncate text-[12.5px] font-bold text-ink">
                    {def.label}
                  </span>
                  <span className="block truncate text-[11px] text-muted">{def.hint}</span>
                </div>
              </div>
              <div role="radiogroup" aria-labelledby={labelId} className="flex shrink-0 items-center gap-0.5 rounded-lg border border-line bg-white p-0.5">
                {PRIORITIES.map((p) => {
                  const active = value === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={disabled}
                      tabIndex={active ? 0 : -1}
                      onClick={() => onChange(def.id, p.id)}
                      onKeyDown={(e) => {
                        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
                        e.preventDefault();
                        const i = PRIORITIES.findIndex((x) => x.id === value);
                        const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
                        const next = PRIORITIES[(i + dir + PRIORITIES.length) % PRIORITIES.length];
                        onChange(def.id, next.id);
                        (e.currentTarget.parentElement?.children[PRIORITIES.indexOf(next)] as HTMLElement | undefined)?.focus();
                      }}
                      title={`${p.label} priority`}
                      className={[
                        "h-6 min-w-[28px] rounded-[6px] px-1.5 text-[10.5px] font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-50",
                        active ? (p.id === "high" ? "bg-primary text-white" : p.id === "medium" ? "bg-primary/15 text-primary" : "bg-surface-2 text-ink") : "text-muted hover:text-ink",
                      ].join(" ")}
                    >
                      <span aria-hidden="true">{p.label[0]}</span>
                      <span className="sr-only">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
