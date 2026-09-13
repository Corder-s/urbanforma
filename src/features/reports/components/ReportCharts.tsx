import { useId } from "react";
import type { ReportMetric } from "../types/report.types";

/**
 * Charts for the printed document.
 *
 * Deliberately simple and print-safe: solid fills from the design tokens (no
 * gradients that vanish on paper), no animation, every chart paired with its
 * numbers in text so the document is readable in monochrome and by screen
 * readers. Nothing here re-implements an analysis — the values arrive already
 * computed from the report model.
 */

/** Metric status vocabulary plus "accent" for neutral, non-judgemental bars. */
export type BarTone = NonNullable<ReportMetric["status"]> | "accent";

const STATUS_FILL: Record<BarTone, string> = {
  good: "bg-success",
  watch: "bg-warning",
  poor: "bg-danger",
  neutral: "bg-primary",
  accent: "bg-accent",
};

const STATUS_TEXT: Record<BarTone, string> = {
  good: "text-success",
  watch: "text-warning",
  poor: "text-danger",
  neutral: "text-primary",
  accent: "text-accent",
};

function clampPct(value: number, max: number): number {
  if (!Number.isFinite(value) || max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

export interface MetricBarProps {
  label: string;
  value: string;
  /** 0–max indicator value; omit for an unbarred row. */
  score?: number;
  max?: number;
  status?: BarTone;
  note?: string;
}

/** One labelled indicator with a horizontal bar (the document's workhorse). */
export function MetricBar({ label, value, score, max = 100, status = "neutral", note }: MetricBarProps) {
  const fill = STATUS_FILL[status];
  return (
    <div className="report-block py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-[12.5px] font-semibold text-ink">{label}</span>
        <span className={`shrink-0 text-[12.5px] font-extrabold tabular-nums ${STATUS_TEXT[status]}`}>{value}</span>
      </div>
      {score !== undefined && (
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2" role="presentation">
          <div className={`h-full rounded-full ${fill}`} style={{ width: `${clampPct(score, max)}%` }} />
        </div>
      )}
      {note && <p className="mt-1 text-[11.5px] leading-snug text-muted">{note}</p>}
    </div>
  );
}

export function MetricBarList({ items, max = 100 }: { items: MetricBarProps[]; max?: number }) {
  if (items.length === 0) return null;
  return (
    <div className="divide-y divide-line/70">
      {items.map((item) => (
        <MetricBar key={item.label} {...item} max={max} />
      ))}
    </div>
  );
}

export interface ScoreBarRow {
  id: string;
  /** Short label printed at the left ("A", "Environment"). */
  label: string;
  score: number;
  /** Optional trailing detail ("Balanced · Selected"). */
  detail?: string;
  highlight?: boolean;
}

/** Ranked 0–100 bars — scenario scores, score breakdowns, goal progress. */
export function ScoreBars({ rows, max = 100 }: { rows: ScoreBarRow[]; max?: number }) {
  if (rows.length === 0) return null;
  return (
    <ul className="space-y-2.5" aria-label="Scores">
      {rows.map((r) => {
        const pct = clampPct(r.score, max);
        return (
          <li key={r.id} className="report-block">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-[12.5px] font-bold text-ink">
                {r.label}
                {r.detail && <span className="ml-2 font-medium text-muted">{r.detail}</span>}
              </span>
              <span className="shrink-0 text-[12.5px] font-extrabold tabular-nums text-ink">{Math.round(r.score)}</span>
            </div>
            <div className={`mt-1 h-2 w-full overflow-hidden rounded-full ${r.highlight ? "bg-primary/15" : "bg-surface-2"}`} role="presentation">
              <div className={`h-full rounded-full ${r.highlight ? "bg-primary" : "bg-accent"}`} style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export interface TrendPoint {
  label: string;
  environment: number;
  carbon: number;
  green: number;
}

/** Token colours (see src/styles/tokens.css) — CSS vars so print and screen match. */
const SERIES: { key: keyof Omit<TrendPoint, "label">; label: string; stroke: string }[] = [
  { key: "environment", label: "Environment", stroke: "var(--color-primary)" },
  { key: "carbon", label: "Carbon", stroke: "var(--color-accent)" },
  { key: "green", label: "Green", stroke: "var(--color-success)" },
];

/**
 * Environmental trend line chart. Drawn with currentColor-safe token colours so
 * it prints identically; the underlying numbers are also exposed as a
 * screen-reader table because a line chart alone is not accessible.
 */
export function TrendChart({ points }: { points: TrendPoint[] }) {
  const id = useId();
  if (points.length < 2) return null;

  const width = 560;
  const height = 150;
  const padX = 8;
  const padY = 14;
  const peak = Math.max(1, ...points.flatMap((p) => [p.environment, p.carbon, p.green]));
  const x = (i: number) => padX + (i * (width - padX * 2)) / (points.length - 1);
  const y = (v: number) => height - padY - (v / peak) * (height - padY * 2);

  return (
    <figure className="report-block">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-labelledby={`${id}-title`}
        preserveAspectRatio="none"
      >
        <title id={`${id}-title`}>Environmental trend across {points.length} recorded periods</title>
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={padX}
            x2={width - padX}
            y1={height - padY - t * (height - padY * 2)}
            y2={height - padY - t * (height - padY * 2)}
            stroke="var(--color-border)"
            strokeWidth="1"
            strokeDasharray={t === 1 ? undefined : "3 4"}
          />
        ))}
        {SERIES.map((s) => (
          <polyline
            key={s.key}
            fill="none"
            stroke={s.stroke}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={points.map((p, i) => `${x(i).toFixed(1)},${y(p[s.key]).toFixed(1)}`).join(" ")}
          />
        ))}
        {points.map((p, i) => (
          <g key={p.label}>
            {SERIES.map((s) => (
              <circle key={s.key} cx={x(i)} cy={y(p[s.key])} r="2.5" fill={s.stroke} />
            ))}
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-muted">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ background: s.stroke }} aria-hidden="true" />
            {s.label}
          </span>
        ))}
        <span className="ml-auto tabular-nums">
          {points[0].label} → {points[points.length - 1].label} · peak {Math.round(peak)}
        </span>
      </figcaption>
      <table className="sr-only">
        <caption>Environmental trend values</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            {SERIES.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.label}>
              <th scope="row">{p.label}</th>
              {SERIES.map((s) => (
                <td key={s.key}>{Math.round(p[s.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Stacked share bar (land-use / object-status distribution) with a legend. */
export function ShareBar({ rows }: { rows: { label: string; share: number; count?: number }[] }) {
  const palette = ["bg-primary", "bg-accent", "bg-success", "bg-warning", "bg-primary/60", "bg-accent/60", "bg-muted/50"];
  const total = rows.reduce((s, r) => s + r.share, 0);
  if (rows.length === 0 || total <= 0) return null;
  return (
    <figure className="report-block">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2" role="presentation">
        {rows.map((r, i) => (
          <div
            key={r.label}
            className={`h-full ${palette[i % palette.length]}`}
            style={{ width: `${(r.share / total) * 100}%` }}
          />
        ))}
      </div>
      <figcaption className="mt-2.5 grid gap-x-4 gap-y-1 sm:grid-cols-2">
        {rows.map((r, i) => (
          <span key={r.label} className="flex items-center gap-2 text-[11.5px] text-muted">
            <span className={`h-2 w-2 shrink-0 rounded-sm ${palette[i % palette.length]}`} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate font-semibold text-ink">{r.label}</span>
            <span className="shrink-0 tabular-nums">
              {((r.share / total) * 100).toFixed(0)}%{r.count !== undefined ? ` · ${r.count}` : ""}
            </span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
