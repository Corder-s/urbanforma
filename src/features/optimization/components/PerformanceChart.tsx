import { useId } from "react";
import { CHART_METRICS, METRICS } from "../data/optimization.data";
import type { ScoredScenario } from "../services/optimization.service";
import type { CurrentPlan } from "../types/optimization.types";

interface PerformanceChartProps {
  current: CurrentPlan;
  scenarios: ScoredScenario[];
  activeId: string | null;
}

/** Series colours — paired with letters/labels in the legend and table, never colour alone. */
const SERIES_COLORS = ["#2563EB", "#059669", "#D97706", "#7C3AED"];
const CURRENT_COLOR = "#64748B";

/**
 * Grouped bar chart (SVG, no chart library): Current plan + compared
 * scenarios across Environment / Mobility / Green / Carbon / Urban Form.
 * Every bar has an accessible label; the data table below mirrors it.
 */
export function PerformanceChart({ current, scenarios, activeId }: PerformanceChartProps) {
  const id = useId();
  const series = [{ key: "current", label: "Current", color: CURRENT_COLOR, letter: "C", values: CHART_METRICS.map((m) => current.metrics[m]) }, ...scenarios.map((s, i) => ({ key: s.id, label: s.name, color: SERIES_COLORS[i % SERIES_COLORS.length], letter: s.letter, values: CHART_METRICS.map((m) => s.metrics[m]) }))];
  const W = 640;
  const H = 240;
  const padL = 36;
  const padR = 8;
  const padT = 14;
  const padB = 34;
  const groupW = (W - padL - padR) / CHART_METRICS.length;
  const barGap = 3;
  const barW = Math.min(26, (groupW - 24) / series.length - barGap);
  const y = (v: number) => padT + (1 - v / 100) * (H - padT - padB);

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id={`${id}-title`} className="text-[15px] font-extrabold text-ink">
            Performance Overview
          </h3>
          <p className="text-[12px] text-muted">Scores 0–100 across the five objective areas (demo values).</p>
        </div>
        <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-label="Series">
          {series.map((s) => (
            <li key={s.key} className={`inline-flex items-center gap-1.5 text-[11.5px] font-bold ${s.key === activeId ? "text-primary" : "text-ink"}`}>
              <span className="grid h-4 w-4 place-items-center rounded-[4px] text-[9px] font-extrabold text-on-brand" style={{ backgroundColor: s.color }} aria-hidden="true">
                {s.letter}
              </span>
              {s.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[520px]" role="img" aria-labelledby={`${id}-title`} aria-describedby={`${id}-table`}>
          {/* grid + axis */}
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#E2E8F0" strokeWidth={1} />
              <text x={padL - 6} y={y(v) + 3.5} textAnchor="end" fontSize={10} fill="#94A3B8" fontWeight={700} style={{ fontFamily: "Inter, sans-serif" }}>
                {v}
              </text>
            </g>
          ))}
          {CHART_METRICS.map((m, gi) => {
            const gx = padL + gi * groupW;
            const totalW = series.length * (barW + barGap) - barGap;
            const start = gx + (groupW - totalW) / 2;
            return (
              <g key={m}>
                {series.map((s, si) => {
                  const v = s.values[gi];
                  const x = start + si * (barW + barGap);
                  const active = s.key === activeId;
                  return (
                    <g key={s.key}>
                      <rect x={x} y={y(v)} width={barW} height={Math.max(1, y(0) - y(v))} rx={3} fill={s.color} opacity={active || s.key === "current" ? 1 : 0.78} stroke={active ? "#0F172A" : "none"} strokeWidth={active ? 1.2 : 0}>
                        <title>{`${s.label} — ${METRICS[m].label}: ${Math.round(v)}`}</title>
                      </rect>
                      <text x={x + barW / 2} y={y(v) - 3} textAnchor="middle" fontSize={9} fontWeight={800} fill="#334155" style={{ fontFamily: "Inter, sans-serif" }} aria-hidden="true">
                        {Math.round(v)}
                      </text>
                      <text x={x + barW / 2} y={y(0) + 11} textAnchor="middle" fontSize={8} fontWeight={800} fill={s.color} style={{ fontFamily: "Inter, sans-serif" }} aria-hidden="true">
                        {s.letter}
                      </text>
                    </g>
                  );
                })}
                <text x={gx + groupW / 2} y={H - 8} textAnchor="middle" fontSize={11} fontWeight={800} fill="#0F172A" style={{ fontFamily: "Inter, sans-serif" }}>
                  {METRICS[m].short}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* accessible data table */}
      <table id={`${id}-table`} className="sr-only">
        <caption>Performance values per series</caption>
        <thead>
          <tr>
            <th scope="col">Series</th>
            {CHART_METRICS.map((m) => (
              <th key={m} scope="col">
                {METRICS[m].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {series.map((s) => (
            <tr key={s.key}>
              <th scope="row">{s.label}</th>
              {s.values.map((v, i) => (
                <td key={i}>{Math.round(v)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
