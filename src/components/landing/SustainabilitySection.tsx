import type { LucideIcon } from "lucide-react";
import { Leaf, Zap, Bike, Droplets, CloudOff, Tent } from "lucide-react";
import { Reveal } from "./Reveal";

interface Stat {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix: string;
  color: string;
  note: string;
}

const STATS: Stat[] = [
  { icon: Leaf, label: "Green Coverage", value: 22.3, suffix: "%", color: "#16a34a", note: "Canopy & open space" },
  { icon: Zap, label: "Energy", value: 68, suffix: "%", color: "#f59e0b", note: "Renewable share" },
  { icon: Bike, label: "Mobility", value: 87, suffix: "%", color: "#06b6d4", note: "Active transit access" },
  { icon: Droplets, label: "Water", value: 41, suffix: "%", color: "#3b82f6", note: "Stormwater managed" },
  { icon: CloudOff, label: "Carbon", value: 24, suffix: "%", color: "#2563eb", note: "Emissions reduced" },
  { icon: Tent, label: "Public Space", value: 18.5, suffix: "%", color: "#7c3aed", note: "Of land area" },
];

function Ring({ value, color }: { value: number; color: string }) {
  const pct = Math.min(100, value);
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
      <circle cx="40" cy="40" r={r} fill="none" stroke="#e7eef9" strokeWidth="8" />
      <circle
        cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeLinecap="round" strokeDasharray={c}
        strokeDashoffset={c - (c * pct) / 100}
        style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.22,0.7,0.2,1)" }}
      />
    </svg>
  );
}

export function SustainabilitySection() {
  return (
    <section id="sustainability" className="visual-sky py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">Sustainability</p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-[42px]">
            Build Cities That <span className="text-primary">Perform Better.</span>
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-muted">
            Track the indicators that turn ambitious targets into measurable
            urban performance.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={(i % 3) * 110}>
              <div className="flex h-full items-center gap-5 rounded-3xl border border-line bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card">
                <div className="relative grid shrink-0 place-items-center">
                  <Ring value={s.value} color={s.color} />
                  <span className="absolute text-[15px] font-extrabold text-ink">
                    {s.value}
                    <span className="text-[10px] font-bold text-muted">{s.suffix}</span>
                  </span>
                </div>
                <div>
                  <span
                    className="grid h-9 w-9 place-items-center rounded-lg"
                    style={{ backgroundColor: `${s.color}1a`, color: s.color }}
                  >
                    <s.icon size={18} />
                  </span>
                  <h3 className="mt-2 text-lg font-extrabold text-ink">{s.label}</h3>
                  <p className="text-sm text-muted">{s.note}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <p className="mt-8 text-center text-[12px] text-faint">
          Demonstration metrics — illustrative of the platform&apos;s analytics.
        </p>
      </div>
    </section>
  );
}
