import { Database, Lightbulb, PenTool, BarChart3, Flag, ArrowDown } from "lucide-react";
import { Reveal } from "./Reveal";

const FLOW = [
  { icon: Database, label: "Data" },
  { icon: Lightbulb, label: "Insight" },
  { icon: PenTool, label: "Design" },
  { icon: BarChart3, label: "Analysis" },
  { icon: Flag, label: "Decision" },
];

export function PhilosophySection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <Reveal className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">Product Philosophy</p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-[42px]">
            From Data to <span className="text-primary">Decisions.</span>
          </h2>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-14 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            {FLOW.map((step, i) => (
              <div key={step.label} className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
                <div className="flex w-44 flex-col items-center gap-3 rounded-3xl border border-line bg-surface px-5 py-6 shadow-soft transition duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-card">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary">
                    <step.icon size={24} />
                  </span>
                  <span className="text-lg font-extrabold uppercase tracking-wide text-ink">
                    {step.label}
                  </span>
                </div>
                {i < FLOW.length - 1 && (
                  <ArrowDown size={22} className="text-primary/50 sm:rotate-[-90deg]" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
