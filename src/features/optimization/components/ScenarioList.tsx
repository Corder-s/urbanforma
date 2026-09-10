import { Sparkles } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import type { ScoredScenario } from "../services/optimization.service";
import { ScenarioCard } from "./ScenarioCard";

interface ScenarioListProps {
  scenarios: ScoredScenario[];
  activeId: string | null;
  compareIds: string[];
  generating: boolean;
  onView: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onSelect: (id: string) => void;
  onGenerate: () => void;
  /** "strip" = horizontal scroll strip (below the map); "grid" = responsive grid. */
  layout?: "strip" | "grid";
  title?: string;
}

/** Generated planning scenarios — the bottom comparison / status area of the workspace. */
export function ScenarioList({ scenarios, activeId, compareIds, generating, onView, onToggleCompare, onSelect, onGenerate, layout = "strip", title = "Generated planning scenarios" }: ScenarioListProps) {
  if (scenarios.length === 0) {
    return (
      <div className="flex h-full min-h-[132px] items-center justify-center px-4 py-4">
        <div className="flex max-w-xl flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true">
            <Sparkles size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-extrabold text-ink">No scenarios yet</h3>
            <p className="text-[12.5px] leading-relaxed text-muted">Set goals, priorities and constraints, then generate planning scenarios for the current plan. Scenarios are demo derivations — not engineering results.</p>
          </div>
          <Button size="sm" onClick={onGenerate} disabled={generating} loading={generating} className="shrink-0">
            {generating ? "Generating…" : "Generate Scenarios"}
          </Button>
        </div>
      </div>
    );
  }
  const compareFull = compareIds.length >= 4;
  return (
    <section aria-label={title} className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-3">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-faint">{title}</h3>
        <span className="text-[11px] font-semibold text-muted">
          {scenarios.length} scenarios · {compareIds.length} in comparison
        </span>
      </div>
      {layout === "strip" ? (
        <ul className="flex min-h-0 gap-3 overflow-x-auto px-4 pb-3 pt-2">
          {scenarios.map((s) => (
            <li key={s.id} className="w-[286px] shrink-0">
              <ScenarioCard scenario={s} active={s.id === activeId} compared={compareIds.includes(s.id)} compareDisabled={compareFull} onView={onView} onToggleCompare={onToggleCompare} onSelect={onSelect} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid gap-3 px-4 pb-4 pt-2 sm:grid-cols-2 2xl:grid-cols-4">
          {scenarios.map((s) => (
            <li key={s.id}>
              <ScenarioCard scenario={s} active={s.id === activeId} compared={compareIds.includes(s.id)} compareDisabled={compareFull} onView={onView} onToggleCompare={onToggleCompare} onSelect={onSelect} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
