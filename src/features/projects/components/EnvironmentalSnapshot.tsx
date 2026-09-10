import { useId } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CloudOff, Leaf, Sun, ThermometerSun, Wind } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { EnvironmentalMetric, EnvironmentalSummary } from "../project.types";
import { SectionHeading } from "../../../components/dashboard/SectionHeading";
import { Button } from "../../../components/ui/Button";

const ICONS: Record<EnvironmentalMetric["key"], LucideIcon> = {
  heat: ThermometerSun,
  sunlight: Sun,
  wind: Wind,
  green: Leaf,
  carbon: CloudOff,
};

function ScoreRing({ score }: { score: number }) {
  const id = useId();
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-20 w-20 shrink-0 place-items-center" aria-hidden="true">
      <svg viewBox="0 0 76 76" className="h-20 w-20 -rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" stroke="#E7EEF9" strokeWidth="7" />
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * Math.min(100, score)) / 100}
          className="transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none"
        />
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <p className="text-lg font-extrabold leading-none text-ink">{score}</p>
        <p className="text-[9px] font-bold uppercase tracking-wide text-faint">/ 100</p>
      </div>
    </div>
  );
}

function MetricBar({ m }: { m: EnvironmentalMetric }) {
  const Icon = ICONS[m.key];
  const level = Math.max(0, Math.min(100, Math.round(m.level)));
  return (
    <li className="py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2.5 text-[13.5px] font-medium text-muted">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-primary">
            <Icon size={16} />
          </span>
          <span className="truncate">{m.label}</span>
        </span>
        <span className="shrink-0 text-sm font-extrabold text-ink">{m.value}</span>
      </div>
      <div className="mt-2 flex items-center gap-3 sm:pl-[42px]">
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
          role="meter"
          aria-valuenow={level}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${m.label} indicator`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-[width] duration-700 ease-out motion-reduce:transition-none"
            style={{ width: `${level}%` }}
          />
        </div>
        <span className="hidden w-28 shrink-0 truncate text-right text-[11.5px] text-faint sm:block lg:hidden xl:block" title={m.note}>{m.note}</span>
      </div>
    </li>
  );
}

/** Compact environmental summary — score ring + five indicator bars. */
export function EnvironmentalSnapshot({ env, projectId }: { env: EnvironmentalSummary; projectId?: string }) {
  const analysisTo = projectId ? `/app/analysis?projectId=${encodeURIComponent(projectId)}` : "/app/analysis";
  return (
    <section aria-labelledby="env-title" className="flex h-full flex-col">
      <SectionHeading id="env-title" title="Environmental Snapshot" hint="Summary only — full analysis comes later" />
      <div className="flex flex-1 flex-col rounded-3xl border border-line bg-white p-5 shadow-soft">
        <div className="flex items-center gap-4">
          <ScoreRing score={env.score} />
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-ink">
              Environmental Score <span className="sr-only">{env.score} out of 100</span>
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              Composite of heat, sunlight, wind, green coverage and carbon. Demo values.
            </p>
          </div>
        </div>

        {env.metrics.length > 0 ? (
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {env.metrics.map((m) => (
              <MetricBar key={m.key} m={m} />
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl bg-surface-2 px-3 py-2 text-[13px] text-muted">
            No environmental data yet — run an analysis to populate this summary.
          </p>
        )}

        <Link to={analysisTo} className="mt-auto pt-4">
          <Button size="sm" variant="secondary" fullWidth>
            Open Analysis <ArrowRight size={16} />
          </Button>
        </Link>
      </div>
    </section>
  );
}
