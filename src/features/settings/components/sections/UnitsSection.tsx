import { useUnitPreferences } from "../../hooks/useUnitPreferences";
import { UNIT_SAMPLES, formatSample } from "../../lib/units";
import { ChoiceGroup, InlineNote, SettingRow, SettingsPanel } from "../controls";
import type { UnitSystem } from "../../types/settings.types";

const SYSTEM_OPTIONS: { value: UnitSystem; label: string }[] = [
  { value: "metric", label: "Metric" },
  { value: "imperial", label: "Imperial" },
];

/**
 * Units (§6).
 *
 * One switch, one service. `lib/units.ts` owns every conversion and formatter;
 * the planning geometry helpers, the project service, the BIM volume formatter
 * and the report builders all delegate to it, so this preference changes the
 * whole application at once and there is no second copy of the maths to drift.
 * The header's Metric / Imperial switch writes this same setting.
 */
export function UnitsSection() {
  const { system, setSystem } = useUnitPreferences();

  return (
    <>
      <SettingsPanel title="Measurement system" description="Measurement system used across every module.">
        <SettingRow
          label="Unit system"
          hint="Applies to distances, areas, volumes, elevations, speeds and temperatures."
        >
          <ChoiceGroup ariaLabel="Unit system" value={system} options={SYSTEM_OPTIONS} onChange={setSystem} />
        </SettingRow>
        <InlineNote>
          Switching re-formats what is already on screen — projects, planning, analysis, optimization,
          visualization, reports and BIM. Stored geometry never changes: everything is kept in metric and
          converted on display.
        </InlineNote>
      </SettingsPanel>

      <div className="mt-4">
        <SettingsPanel title="Preview" description="The same values, both ways.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[26rem] border-collapse text-left">
              <caption className="sr-only">Unit formatting preview</caption>
              <thead>
                <tr className="border-b border-line text-[11px] font-extrabold uppercase tracking-[0.12em] text-faint">
                  <th scope="col" className="py-2 pr-3">
                    Quantity
                  </th>
                  <th scope="col" className="py-2 pr-3">
                    Metric
                  </th>
                  <th scope="col" className="py-2">
                    Imperial
                  </th>
                </tr>
              </thead>
              <tbody>
                {UNIT_SAMPLES.map((sample) => (
                  <tr key={`${sample.kind}-${sample.label}`} className="border-b border-line/70 last:border-b-0">
                    <th scope="row" className="py-2 pr-3 text-[12.5px] font-semibold text-muted">
                      {sample.label}
                    </th>
                    <td
                      className={[
                        "py-2 pr-3 text-[13px] font-bold tabular-nums",
                        system === "metric" ? "text-primary" : "text-ink",
                      ].join(" ")}
                    >
                      {formatSample(sample, "metric")}
                    </td>
                    <td
                      className={[
                        "py-2 text-[13px] font-bold tabular-nums",
                        system === "imperial" ? "text-primary" : "text-ink",
                      ].join(" ")}
                    >
                      {formatSample(sample, "imperial")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SettingsPanel>
      </div>
    </>
  );
}
