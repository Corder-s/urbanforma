import { ChevronRight, type LucideIcon } from "lucide-react";
import { STATUS_META } from "../data/analysis.data";
import type { AnalysisMetric, MetricStatus, MetricUnit } from "../types/analysis.types";

/** Formats a metric value with its unit for display (never colour-only). */
export function formatMetricValue(value: number, unit: MetricUnit, text?: string): { value: string; suffix: string } {
  if (unit === "text" || Number.isNaN(value)) return { value: text ?? "—", suffix: "" };
  switch (unit) {
    case "score":
      return { value: String(Math.round(value)), suffix: "/100" };
    case "percent":
      return { value: Number.isInteger(value) ? String(value) : value.toFixed(1), suffix: "%" };
    case "ha":
      return { value: value.toFixed(1), suffix: " ha" };
    case "km":
      return { value: value.toFixed(1), suffix: " km" };
    case "m/s":
      return { value: value.toFixed(1), suffix: " m/s" };
    case "people/ha":
      return { value: Math.round(value).toLocaleString("en-US"), suffix: " people/ha" };
    case "FAR":
      return { value: value.toFixed(2), suffix: " FAR" };
    case "floors":
      return { value: Number.isInteger(value) ? String(value) : value.toFixed(1), suffix: " floors" };
    case "tCO2e":
      return { value: Math.round(value).toLocaleString("en-US"), suffix: " tCO₂e / yr" };
    default:
      return { value: String(value), suffix: "" };
  }
}

export function StatusPill({ status, className = "" }: { status: MetricStatus; className?: string }) {
  const meta = STATUS_META[status];
  const tone = status === "good" ? "bg-success/10 text-success ring-success/20" : status === "moderate" ? "bg-warning/10 text-warning ring-warning/20" : status === "attention" ? "bg-danger/10 text-danger ring-danger/20" : "bg-surface-2 text-muted ring-line";
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${tone} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

/** Thin score track (0–100) used across cards and the inspector. */
export function ScoreTrack({ value, status, label, className = "" }: { value: number; status: MetricStatus; label: string; className?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const fill = status === "good" ? "bg-success" : status === "moderate" ? "bg-warning" : status === "attention" ? "bg-danger" : "bg-primary";
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-surface-2 ${className}`} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} ${v} out of 100`}>
      <div className={`h-full rounded-full ${fill} transition-[width] duration-500 ease-out motion-reduce:transition-none`} style={{ width: `${v}%` }} />
    </div>
  );
}

interface AnalysisMetricCardProps {
  metric: AnalysisMetric;
  icon?: LucideIcon;
  /** Card title override (defaults to the metric name). */
  title?: string;
  /** One-line summary shown under the value (defaults to the interpretation). */
  summary?: string;
  selected?: boolean;
  onSelect?: (metric: AnalysisMetric) => void;
  /** Smaller layout for lists inside the inspector / mobile strip. */
  dense?: boolean;
}

/**
 * Metric summary card. Value, unit, status pill, optional score track and a
 * one-line interpretation. Clicking pins the metric in the inspector.
 */
export function AnalysisMetricCard({ metric, icon: Icon, title, summary, selected = false, onSelect, dense = false }: AnalysisMetricCardProps) {
  const { value, suffix } = formatMetricValue(metric.value, metric.unit, metric.text);
  const interactive = !!onSelect;
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {Icon && (
            <span className={`grid shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ${dense ? "h-7 w-7" : "h-8 w-8"}`} aria-hidden="true">
              <Icon size={dense ? 14 : 16} />
            </span>
          )}
          <h3 className={`truncate font-bold text-ink ${dense ? "text-[12.5px]" : "text-[13px]"}`}>{title ?? metric.name}</h3>
        </div>
        <StatusPill status={metric.status} />
      </div>
      <div className={`flex items-baseline gap-1 ${dense ? "mt-1.5" : "mt-2.5"}`}>
        <span className={`font-extrabold tabular-nums tracking-tight text-ink ${dense ? "text-xl" : "text-2xl"}`}>{value}</span>
        {suffix && <span className="text-[12px] font-bold text-muted">{suffix}</span>}
      </div>
      {metric.score !== undefined && <ScoreTrack value={metric.score} status={metric.status} label={metric.name} className="mt-2" />}
      <p className={`text-muted ${dense ? "mt-1.5 line-clamp-2 text-[11.5px] leading-snug" : "mt-2 line-clamp-2 text-[12px] leading-snug"}`}>{summary ?? metric.interpretation}</p>
      {interactive && (
        <span className="mt-2 inline-flex items-center gap-0.5 text-[11.5px] font-bold text-primary">
          Details <ChevronRight size={13} aria-hidden="true" />
        </span>
      )}
    </>
  );
  const cls = `w-full rounded-2xl border bg-surface text-left shadow-soft transition-colors motion-reduce:transition-none ${dense ? "p-3" : "p-4"} ${selected ? "border-primary ring-4 ring-primary/10" : "border-line"}`;
  if (interactive)
    return (
      <button type="button" onClick={() => onSelect(metric)} aria-pressed={selected} aria-label={`${title ?? metric.name}: ${value}${suffix}. ${STATUS_META[metric.status].label}. Show details`} className={`${cls} hover:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20`}>
        {body}
      </button>
    );
  return <div className={cls}>{body}</div>;
}
