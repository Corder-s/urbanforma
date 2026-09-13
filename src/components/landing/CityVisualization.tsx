import { useState } from "react";
import { Box, Map, Satellite } from "lucide-react";
import { Reveal } from "./Reveal";
import { LandingCityScene, type CityViewMode } from "./LandingCityScene";

const MODES: { id: CityViewMode; label: string; icon: typeof Box }[] = [
  { id: "3d", label: "3D", icon: Box },
  { id: "map", label: "Map", icon: Map },
  { id: "satellite", label: "Satellite", icon: Satellite },
];

export function CityVisualization() {
  const [mode, setMode] = useState<CityViewMode>("3d");

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">Spatial Visualization</p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-[42px]">
            See Your City <span className="text-primary">Before You Build It.</span>
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-muted">
            Explore buildings, streets, open spaces and infrastructure through an
            interactive spatial environment.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="relative mt-12 overflow-hidden rounded-[28px] border border-line bg-surface shadow-card">
            {/* demo view controls */}
            <div className="absolute left-4 top-4 z-30 flex items-center gap-1 rounded-2xl border border-line bg-surface/90 p-1 shadow-soft backdrop-blur">
              {MODES.map((m) => {
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setMode(m.id)}
                    className={[
                      "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                      active
                        ? "bg-primary text-on-brand shadow-glow"
                        : "text-muted hover:bg-surface-2 hover:text-primary",
                    ].join(" ")}
                  >
                    <m.icon size={16} /> {m.label}
                  </button>
                );
              })}
            </div>

            <div className="visual-sky aspect-[16/9] w-full sm:aspect-[16/8]">
              <LandingCityScene mode={mode} />
            </div>

            <p className="absolute bottom-3 right-4 z-20 rounded-full bg-surface/85 px-3 py-1 text-[11px] font-semibold text-muted backdrop-blur">
              Interactive demo · {MODES.find((m) => m.id === mode)?.label} view
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
