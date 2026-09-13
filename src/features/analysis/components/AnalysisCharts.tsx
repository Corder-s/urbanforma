import { useId } from "react";
import type { ScoreBreakdown } from "../types/analysis.types";
import { statusForScore } from "../data/analysis.data";

/**
 * The four charts the module needs — hand-drawn SVG/CSS, no chart library.
 * Every chart carries the numbers as text (or an sr-only table) so the visual
 * is never the only source of the information.
 */

// ---------------------------------------------------------------------------
// Score ring (Urban Performance Score)
// ---------------------------------------------------------------------------

export function ScoreRing({ score, size = 132, label = "Urban Performance Score" }: { score: number; size?: number; label?: string }) {
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, score));
  const status = statusForScore(v);
  const color = status === "good" ? "#16A34A" : status === "moderate" ? "#D97706" : "#DC2626";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${Math.round(v)} out of 100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(v / 100) * c} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-[stroke-dasharray] duration-700 ease-out motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-[34px] font-extrabold leading-none tabular-nums tracking-tight text-ink">{Math.round(v)}</div>
          <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-muted">/ 100</div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Performance breakdown (horizontal bars)
// ---------------------------------------------------------------------------

export function BreakdownBars({ items, onSelect }: { items: ScoreBreakdown[]; onSelect?: (b: ScoreBreakdown) => void }) {
  return (
    <ul className="grid gap-2.5" aria-label="Performance breakdown">
      {items.map((b) => {
        const status = statusForScore(b.score);
        const fill = status === "good" ? "bg-success" : status === "moderate" ? "bg-warning" : "bg-danger";
        const inner = (
          <>
            <div className="flex items-center justify-between gap-3 text-[12.5px]">
              <span className="font-semibold text-ink">{b.label}</span>
              <span className="font-extrabold tabular-nums text-ink">
                {b.score}
                <span className="ml-0.5 text-[10.5px] font-bold text-muted">/100</span>
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={b.score} aria-valuemin={0} aria-valuemax={100} aria-label={`${b.label} ${b.score} out of 100`}>
              <div className={`h-full rounded-full ${fill} transition-[width] duration-700 ease-out motion-reduce:transition-none`} style={{ width: `${b.score}%` }} />
            </div>
          </>
        );
        return (
          <li key={b.id}>
            {onSelect ? (
              <button type="button" onClick={() => onSelect(b)} className="block w-full rounded-lg px-1 py-0.5 text-left hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20" aria-label={`${b.label} ${b.score} out of 100 — open ${b.label.toLowerCase()} analysis`}>
                {inner}
              </button>
            ) : (
              <div className="px-1 py-0.5">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Environmental trend (line chart)
// ---------------------------------------------------------------------------

interface TrendPoint {
  label: string;
  environment: number;
  carbon: number;
  green: number;
}

export function TrendChart({ points, height = 150 }: { points: TrendPoint[]; height?: number }) {
  const uid = useId();
  const w = 320;
  const h = height;
  const padL = 26;
  const padR = 10;
  const padT = 10;
  const padB = 22;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const min = 40;
  const max = 100;
  const x = (i: number) => padL + (points.length > 1 ? (i / (points.length - 1)) * innerW : innerW / 2);
  const y = (v: number) => padT + innerH - ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * innerH;
  const line = (key: "environment" | "carbon") => points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p[key]).toFixed(1)}`).join(" ");
  const area = `${line("environment")} L${x(points.length - 1).toFixed(1)} ${(padT + innerH).toFixed(1)} L${x(0).toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;
  const ticks = [40, 60, 80, 100];
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${w} ${h}`} className="block h-auto w-full" role="img" aria-labelledby={`${uid}-title`} aria-describedby={`${uid}-desc`}>
        <title id={`${uid}-title`}>Environmental trend across plan revisions</title>
        <desc id={`${uid}-desc`}>{points.map((p) => `${p.label}: environment ${p.environment}, carbon ${p.carbon}`).join("; ")}</desc>
        <defs>
          <linearGradient id={`${uid}-fill`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} stroke="#E2E8F0" strokeWidth={1} />
            <text x={padL - 6} y={y(t) + 3.5} textAnchor="end" fontSize={9.5} fontWeight={600} fill="#94A3B8" style={{ fontFamily: "Inter, sans-serif" }}>
              {t}
            </text>
          </g>
        ))}
        <path d={area} fill={`url(#${uid}-fill)`} />
        <path d={line("carbon")} fill="none" stroke="#64748B" strokeWidth={1.8} strokeDasharray="4 3" strokeLinejoin="round" strokeLinecap="round" />
        <path d={line("environment")} fill="none" stroke="#2563EB" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={p.label}>
            <circle cx={x(i)} cy={y(p.environment)} r={3.2} fill="#FFFFFF" stroke="#2563EB" strokeWidth={2} />
            <text x={x(i)} y={h - 6} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize={9.5} fontWeight={700} fill="#64748B" style={{ fontFamily: "Inter, sans-serif" }}>
              {p.label}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-primary" aria-hidden="true" /> Environmental score
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded border-t-2 border-dashed border-muted" aria-hidden="true" /> Carbon performance
        </span>
        <span className="ml-auto text-faint">Demo revision history</span>
      </figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Distribution bar (stacked; land use) + histogram (density)
// ---------------------------------------------------------------------------

export function StackedBar({ items, label }: { items: { label: string; share: number; color: string }[]; label: string }) {
  return (
    <div>
      <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${label}: ${items.map((i) => `${i.label} ${i.share}%`).join(", ")}`}>
        {items.map((i) => (
          <div key={i.label} className="h-full border-r-2 border-on-brand last:border-r-0" style={{ width: `${i.share}%`, background: i.color }} />
        ))}
      </div>
      <ul className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3" aria-hidden="true">
        {items.map((i) => (
          <li key={i.label} className="flex items-center justify-between gap-2 text-[12px]">
            <span className="flex min-w-0 items-center gap-1.5 text-muted">
              <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: i.color }} />
              <span className="truncate">{i.label}</span>
            </span>
            <span className="font-bold tabular-nums text-ink">{i.share}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Histogram({ items, label, unit = "%" }: { items: { band: string; share: number; buildings: number }[]; label: string; unit?: string }) {
  const max = Math.max(1, ...items.map((i) => i.share));
  return (
    <div>
      <div className="flex h-28 items-end gap-2" role="img" aria-label={`${label}: ${items.map((i) => `${i.band} floors ${i.share}${unit} (${i.buildings} buildings)`).join(", ")}`}>
        {items.map((i) => (
          <div key={i.band} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10.5px] font-bold tabular-nums text-ink">{i.share}%</span>
            <div className="w-full rounded-t-md bg-primary/80 transition-[height] duration-500 ease-out motion-reduce:transition-none" style={{ height: `${Math.max(3, (i.share / max) * 78)}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2 border-t border-line pt-1.5" aria-hidden="true">
        {items.map((i) => (
          <span key={i.band} className="flex-1 text-center text-[10.5px] font-semibold text-muted">
            {i.band}
          </span>
        ))}
      </div>
      <p className="mt-1 text-center text-[10.5px] font-semibold uppercase tracking-wider text-faint">Floors per building</p>
    </div>
  );
}

/** Small proportional bars (e.g. carbon contributors, area classes). */
export function ShareRows({ rows, color = "bg-primary", suffix = "%", label }: { rows: { label: string; value: number; text?: string }[]; color?: string; suffix?: string; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="grid gap-2" aria-label={label}>
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-center justify-between gap-3 text-[12px]">
            <span className="text-muted">{r.label}</span>
            <span className="font-bold tabular-nums text-ink">{r.text ?? `${Number.isInteger(r.value) ? r.value : r.value.toFixed(1)}${suffix}`}</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
