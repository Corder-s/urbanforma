import { useId } from "react";
import { Cloud, CloudFog, Sun } from "lucide-react";
import { ATMOSPHERES, TIME_OF_DAY } from "../data/visualization.data";
import type { VisualizationState } from "../hooks/useVisualizationState";
import type { Atmosphere } from "../types/visualization.types";
import { Segmented, Slider } from "./controls";

interface TimeOfDayControlProps {
  state: VisualizationState;
  idPrefix?: string;
  /** Hide the atmosphere block (phone quick drawer). */
  compact?: boolean;
}

const ATMOS_ICON: Record<Atmosphere, typeof Sun> = { clear: Sun, "soft-cloud": Cloud, hazy: CloudFog };

/**
 * Time of day (Morning → Evening) as a stepped slider with the preset labels,
 * plus the atmosphere choice. Both are visual simulations only: they change
 * light direction, shadow length, sky and contrast — no solar or weather
 * calculation runs behind them.
 */
export function TimeOfDayControl({ state, idPrefix = "tod", compact = false }: TimeOfDayControlProps) {
  const { settings, updateSettings } = state;
  const uid = useId();
  const index = Math.max(0, TIME_OF_DAY.findIndex((t) => t.id === settings.timeOfDay));
  const labelId = `${idPrefix}-atmos-${uid}`;
  return (
    <div>
      <Slider id={`${idPrefix}-time-${uid}`} label="Time of Day" min={0} max={TIME_OF_DAY.length - 1} value={index} onChange={(i) => updateSettings({ timeOfDay: TIME_OF_DAY[i].id })} format={(i) => TIME_OF_DAY[i]?.label ?? ""} />
      <ol className="mt-0.5 grid grid-cols-5 gap-1" aria-label="Time of day presets">
        {TIME_OF_DAY.map((t, i) => {
          const active = i === index;
          return (
            <li key={t.id}>
              <button type="button" onClick={() => updateSettings({ timeOfDay: t.id })} aria-pressed={active} className={`w-full rounded-md py-1 text-[10.5px] font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 ${active ? "bg-primary/10 text-primary" : "text-muted hover:bg-surface-2 hover:text-ink"}`}>
                {t.label}
              </button>
            </li>
          );
        })}
      </ol>
      {!compact && (
        <div className="mt-3">
          <p id={labelId} className="mb-1 text-[13px] font-semibold text-ink">
            Atmosphere
          </p>
          <Segmented
            label="Atmosphere"
            labelledBy={labelId}
            value={settings.atmosphere}
            onChange={(atmosphere) => updateSettings({ atmosphere })}
            size="sm"
            options={ATMOSPHERES.map((a) => {
              const Icon = ATMOS_ICON[a.id];
              return { id: a.id, label: a.label, hint: a.hint, icon: <Icon size={13} aria-hidden="true" /> };
            })}
          />
        </div>
      )}
      <p className="mt-2 text-[11px] leading-snug text-faint">Visual simulation only — lighting, shadows and sky are presets, not a solar or weather calculation.</p>
    </div>
  );
}
