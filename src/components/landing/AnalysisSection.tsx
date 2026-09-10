import type { LucideIcon } from "lucide-react";
import { ThermometerSun, Sun, Wind, SunDim, CloudOff, Trees } from "lucide-react";
import { Reveal } from "./Reveal";

interface Metric {
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
  accent: string;
  bars: number[];
}

const METRICS: Metric[] = [
  { icon: ThermometerSun, label: "Heat", value: "32.4°C", note: "Cooling potential", accent: "#f97316", bars: [40, 55, 70, 60, 80, 65, 50] },
  { icon: Sun, label: "Sunlight", value: "6.2 hrs", note: "Solar exposure", accent: "#f59e0b", bars: [30, 45, 60, 78, 90, 70, 55] },
  { icon: Wind, label: "Wind", value: "3.4 m/s", note: "Natural ventilation", accent: "#06b6d4", bars: [55, 70, 48, 66, 72, 58, 64] },
  { icon: SunDim, label: "Daylight", value: "78%", note: "Daylight autonomy", accent: "#3b82f6", bars: [50, 62, 70, 74, 80, 78, 82] },
  { icon: CloudOff, label: "Carbon", value: "−24%", note: "Emissions offset", accent: "#2563eb", bars: [80, 70, 62, 55, 48, 40, 34] },
  { icon: Trees, label: "Green Space", value: "22.3%", note: "Canopy coverage", accent: "#16a34a", bars: [30, 42, 50, 58, 64, 70, 76] },
];

export function AnalysisSection() {
  return (
    <section id="analysis" className="border-y border-line bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">Environmental Analysis</p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-[42px]">
            Design With <span className="text-primary">Evidence.</span>
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-muted">
            Every proposal is measured against the conditions that shape
            comfort, resilience and sustainability.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {METRICS.map((m, i) => (
            <Reveal key={m.label} delay={(i % 3) * 110}>
              <div className="group h-full rounded-3xl border border-line bg-canvas p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-card">
                <div className="flex items-center justify-between">
                  <span
                    className="grid h-11 w-11 place-items-center rounded-xl"
                    style={{ backgroundColor: `${m.accent}1a`, color: m.accent }}
                  >
                    <m.icon size={22} />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-faint">
                    {m.label}
                  </span>
                </div>
                <p className="mt-4 text-3xl font-extrabold tracking-tight text-ink">{m.value}</p>
                <p className="mt-1 text-sm text-muted">{m.note}</p>

                {/* mini bar visualization */}
                <div className="mt-5 flex h-14 items-end gap-1.5">
                  {m.bars.map((h, j) => (
                    <span
                      key={j}
                      className="flex-1 rounded-t-md transition-all duration-500 group-hover:opacity-100"
                      style={{
                        height: `${h}%`,
                        backgroundColor: m.accent,
                        opacity: 0.28 + (j / m.bars.length) * 0.5,
                      }}
                    />
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <p className="mt-8 text-center text-[12px] text-faint">
          Illustrative environmental indicators for product demonstration.
        </p>
      </div>
    </section>
  );
}
