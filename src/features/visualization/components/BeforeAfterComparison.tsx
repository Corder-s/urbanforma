import { useId, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Columns2, Minus, SlidersHorizontal } from "lucide-react";
import type { VisualizationState } from "../hooks/useVisualizationState";
import { compareOptions } from "../lib/scenarios";
import { MiniPlan } from "./map/MiniPlan";

interface BeforeAfterComparisonProps {
  state: VisualizationState;
  /** Present mode renders the panes larger and hides the picker copy. */
  presentation?: boolean;
}

/**
 * Before / After: Current Plan on the left, the selected scenario on the
 * right — side by side, or a single pane with a slider that wipes between the
 * two. The metrics table below states every change in words and numbers so
 * the comparison never relies on colour alone.
 */
export function BeforeAfterComparison({ state, presentation = false }: BeforeAfterComparisonProps) {
  const { currentPlanOption: before, selectedScenarioOption, scenarioOptions, setScenario, layers, settings, basemap } = state;
  const after = selectedScenarioOption ?? scenarioOptions.find((o) => o.preferred) ?? scenarioOptions.find((o) => o.id !== null) ?? null;
  const [layout, setLayout] = useState<"side" | "slider">("side");
  const [split, setSplit] = useState(50);
  const id = useId();

  if (!before) return <p className="p-4 text-[12.5px] text-muted">Loading scenarios…</p>;
  if (!after) return <p className="p-4 text-[12.5px] text-muted">No planning scenarios yet. Generate scenarios in Optimization to compare them here.</p>;
  const rows = compareOptions(before, after);
  const paneCls = "relative overflow-hidden rounded-xl border border-line bg-surface-2";
  const captionCls = "pointer-events-none absolute left-2 top-2 rounded-md border border-line bg-surface/95 px-2 py-0.5 text-[11px] font-bold text-ink shadow-soft";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-ink">
            {before.name} <span className="font-medium text-muted">→</span> {after.name}
            {after.preferred && <span className="ml-1.5 rounded-full bg-success/10 px-2 py-0.5 text-[10.5px] font-bold text-success">Preferred</span>}
          </p>
          {!presentation && <p className="text-[11.5px] text-muted">Current plan on the left, the selected scenario on the right.</p>}
        </div>
        <div role="radiogroup" aria-label="Comparison layout" className="flex shrink-0 items-center gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5">
          {(
            [
              { id: "side", label: "Side by side", icon: Columns2 },
              { id: "slider", label: "Slider", icon: SlidersHorizontal },
            ] as const
          ).map((o) => {
            const Icon = o.icon;
            const active = layout === o.id;
            return (
              <button key={o.id} type="button" role="radio" aria-checked={active} onClick={() => setLayout(o.id)} className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11.5px] font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 ${active ? "bg-surface text-primary shadow-soft" : "text-muted hover:text-ink"}`}>
                <Icon size={13} aria-hidden="true" />
                <span className={active ? "" : "hidden sm:inline"}>{o.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!presentation && scenarioOptions.length > 2 && (
        <div className="px-4 pt-2">
          <label htmlFor={`${id}-after`} className="sr-only">
            Scenario to compare
          </label>
          <select id={`${id}-after`} value={after.id ?? ""} onChange={(e) => setScenario(e.target.value || null)} className="h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-[12.5px] font-semibold text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15">
            {scenarioOptions
              .filter((o) => o.id !== null)
              .map((o) => (
                <option key={o.id ?? ""} value={o.id ?? ""}>
                  {o.letter ? `${o.letter} · ` : ""}
                  {o.name}
                  {o.preferred ? " · Preferred" : ""}
                </option>
              ))}
          </select>
        </div>
      )}

      <div className="px-4 pt-3">
        {layout === "side" ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <figure className={`${paneCls} aspect-[4/3]`}>
              <MiniPlan data={before.dataset} layers={layers} settings={settings} basemap={basemap} title={`Before: ${before.name}`} />
              <figcaption className={captionCls}>Before · {before.name}</figcaption>
            </figure>
            <figure className={`${paneCls} aspect-[4/3]`}>
              <MiniPlan data={after.dataset} layers={layers} settings={settings} basemap={basemap} title={`After: ${after.name}`} />
              <figcaption className={captionCls}>After · {after.name}</figcaption>
            </figure>
          </div>
        ) : (
          <div>
            <figure className={`${paneCls} aspect-[16/10]`}>
              <MiniPlan data={after.dataset} layers={layers} settings={settings} basemap={basemap} title={`After: ${after.name}`} />
              <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${split}%` }} aria-hidden="true">
                <div className="h-full" style={{ width: `${10000 / Math.max(1, split)}%` }}>
                  <MiniPlan data={before.dataset} layers={layers} settings={settings} basemap={basemap} />
                </div>
              </div>
              <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-primary" style={{ left: `calc(${split}% - 1px)` }} aria-hidden="true" />
              <figcaption className={captionCls}>Before · {before.name}</figcaption>
              <figcaption className="pointer-events-none absolute right-2 top-2 rounded-md border border-line bg-surface/95 px-2 py-0.5 text-[11px] font-bold text-ink shadow-soft">After · {after.name}</figcaption>
            </figure>
            <label htmlFor={`${id}-split`} className="mt-2 flex items-center gap-2 text-[11.5px] font-semibold text-muted">
              <span className="shrink-0">Before</span>
              <input id={`${id}-split`} type="range" min={0} max={100} value={split} onChange={(e) => setSplit(Number(e.target.value))} className="h-2 w-full cursor-pointer accent-primary" aria-label="Comparison slider: share of the view showing the current plan" aria-valuetext={`${split}% current plan`} />
              <span className="shrink-0">After</span>
            </label>
          </div>
        )}
      </div>

      <table className="mx-4 my-3 w-[calc(100%_-_2rem)] border-collapse text-left text-[12.5px]" aria-label="Metric comparison">
        <thead>
          <tr className="text-[10.5px] font-bold uppercase tracking-wider text-faint">
            <th scope="col" className="py-1 font-bold">
              Metric
            </th>
            <th scope="col" className="py-1 text-right font-bold">
              Before
            </th>
            <th scope="col" className="py-1 text-right font-bold">
              After
            </th>
            <th scope="col" className="py-1 pl-2 text-right font-bold">
              Change
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => {
            const Icon = r.change === "improved" ? ArrowUpRight : r.change === "reduced" ? ArrowDownRight : Minus;
            const tone = r.change === "improved" ? "text-success" : r.change === "reduced" ? "text-warning" : "text-muted";
            return (
              <tr key={r.id}>
                <th scope="row" className="py-1.5 pr-2 font-semibold text-ink">
                  {r.label}
                </th>
                <td className="py-1.5 text-right tabular-nums text-muted">{r.before}</td>
                <td className="py-1.5 text-right font-bold tabular-nums text-ink">{r.after}</td>
                <td className={`py-1.5 pl-2 text-right font-bold tabular-nums ${tone}`}>
                  <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
                    <Icon size={12} aria-hidden="true" />
                    {r.changeText}
                    <span className="sr-only">{r.change === "improved" ? " (improved)" : r.change === "reduced" ? " (worse)" : ""}</span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="px-4 pb-3 text-[11px] leading-snug text-faint">Scenario values are generated planning estimates from the optimization step, compared with the analysed current plan.</p>
    </div>
  );
}
