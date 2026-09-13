import { useId } from "react";
import { PRESENTATION_SETTING_LABELS, THEMES } from "../data/presentation.data";
import type { VisualizationState } from "../hooks/useVisualizationState";
import type { PresentationTheme } from "../types/visualization.types";
import { SectionTitle, Switch } from "./controls";
import { PresentationMetrics } from "./PresentationMetrics";

interface PresentationSettingsProps {
  state: VisualizationState;
  idPrefix?: string;
}

/**
 * Presentation settings (stored with the presentation): theme, overlay
 * toggles (title, scenario, metrics, legend, north arrow, scale, annotations)
 * and the selected metrics.
 */
export function PresentationSettings({ state, idPrefix = "pres" }: PresentationSettingsProps) {
  const { presentation, selectedMetrics, selectedScenarioOption, currentPlanOption } = state;
  const p = presentation.presentation;
  const uid = useId();
  if (!p) return null;
  const themeLabel = `${idPrefix}-theme-${uid}`;
  return (
    <div className="grid gap-3">
      <div>
        <SectionTitle>Theme</SectionTitle>
        <p id={themeLabel} className="sr-only">
          Presentation theme
        </p>
        <div role="radiogroup" aria-labelledby={themeLabel} className="mt-1 grid grid-cols-2 gap-1.5">
          {THEMES.map((t) => {
            const on = p.theme === t.id;
            return (
              <button key={t.id} type="button" role="radio" aria-checked={on} onClick={() => presentation.setTheme(t.id as PresentationTheme)} title={t.hint} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 ${on ? "border-primary bg-primary/5" : "border-line bg-surface hover:border-line-strong"}`}>
                <span className="h-7 w-7 shrink-0 rounded-md border border-line" style={{ background: t.swatch }} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-bold text-ink">{t.label}</span>
                  <span className="block truncate text-[10.5px] text-muted">{t.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-faint">Themes style the overlay inside the Present viewport only; the darker backdrop never leaves it.</p>
      </div>

      <div>
        <SectionTitle>Overlay</SectionTitle>
        <div className="divide-y divide-line">
          {PRESENTATION_SETTING_LABELS.map((s) => (
            <Switch key={s.key} id={`${idPrefix}-${s.key}-${uid}`} label={s.label} hint={s.hint} checked={p.settings[s.key]} onChange={(v) => presentation.updateSettings({ [s.key]: v })} />
          ))}
        </div>
      </div>

      <PresentationMetrics selected={selectedMetrics} onToggle={presentation.toggleMetric} option={selectedScenarioOption ?? currentPlanOption} />
    </div>
  );
}
