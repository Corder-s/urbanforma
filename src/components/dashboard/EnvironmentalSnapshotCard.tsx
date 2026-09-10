import { Link } from "react-router-dom";
import { ThermometerSun, Sun, Wind, Leaf, CloudOff, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { EnvironmentalSnapshot } from "../../features/projects/project.types";
import { Reveal } from "../landing/Reveal";
import { SectionHeading } from "./SectionHeading";
import { Button } from "../ui/Button";

interface Row {
  icon: LucideIcon;
  label: string;
  value: string;
}

function ScoreRing({ score }: { score: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-24 w-24 shrink-0 place-items-center">
      <svg viewBox="0 0 84 84" className="h-24 w-24 -rotate-90">
        <circle cx="42" cy="42" r={r} fill="none" stroke="#E7EEF9" strokeWidth="8" />
        <circle
          cx="42"
          cy="42"
          r={r}
          fill="none"
          stroke="url(#envGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * Math.min(100, score)) / 100}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.22,0.7,0.2,1)" }}
        />
        <defs>
          <linearGradient id="envGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <p className="text-xl font-extrabold leading-none text-ink">{score}</p>
        <p className="text-[10px] font-bold uppercase tracking-wide text-faint">/ 100</p>
      </div>
    </div>
  );
}

/** Project-level environmental preview (illustrative values). */
export function EnvironmentalSnapshotCard({
  env,
  projectName,
}: {
  env: EnvironmentalSnapshot;
  projectName: string;
}) {
  const rows: Row[] = [
    { icon: ThermometerSun, label: "Heat", value: env.heat },
    { icon: Sun, label: "Sunlight", value: env.sunlight },
    { icon: Wind, label: "Wind", value: env.wind },
    { icon: Leaf, label: "Green Coverage", value: env.greenCoverage },
    { icon: CloudOff, label: "Carbon", value: env.carbon },
  ];

  return (
    <section aria-labelledby="env-title">
      <SectionHeading id="env-title" title="Environmental Snapshot" hint={projectName} />
      <Reveal className="h-full">
        <div className="flex h-full flex-col gap-5 rounded-3xl border border-line bg-white p-5 shadow-soft">
          <div className="flex items-center gap-4">
            <ScoreRing score={env.score} />
            <div>
              <p className="text-sm font-extrabold text-ink">Environmental Score</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                Project-level preview values for demonstration — not live sensor data.
              </p>
            </div>
          </div>

          <dl className="divide-y divide-line">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between py-2.5">
                <dt className="flex items-center gap-2.5 text-[13.5px] font-medium text-muted">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2 text-primary">
                    <r.icon size={16} />
                  </span>
                  {r.label}
                </dt>
                <dd className="text-sm font-extrabold text-ink">{r.value}</dd>
              </div>
            ))}
          </dl>

          <Link to="/app/analysis" className="mt-auto">
            <Button size="sm" variant="secondary" fullWidth>
              Open Analysis <ArrowRight size={16} />
            </Button>
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
