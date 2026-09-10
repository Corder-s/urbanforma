import { Reveal } from "./Reveal";

const CONCEPTS = [
  { n: "01", title: "Plan", text: "Shape sites, parcels and urban form with clear spatial structure." },
  { n: "02", title: "Understand", text: "See how decisions shape heat, light, wind, mobility and life." },
  { n: "03", title: "Optimize", text: "Compare scenarios and steer every plan toward better outcomes." },
];

export function IntroSection() {
  return (
    <section className="border-y border-line bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">
            Planning is more than drawing.
          </p>
          <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-[42px]">
            Understand how design decisions{" "}
            <span className="text-primary">affect the city.</span>
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-muted">
            UrbanForma connects the spatial, environmental and performance layers
            of a proposal in a single workspace — so every plan is informed by
            evidence, not intuition alone.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {CONCEPTS.map((c, i) => (
            <Reveal key={c.n} delay={i * 120}>
              <div className="group h-full rounded-3xl border border-line bg-canvas p-8 transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-card">
                <span className="bg-gradient-to-br from-primary to-accent bg-clip-text text-5xl font-extrabold tracking-tight text-transparent">
                  {c.n}
                </span>
                <h3 className="mt-4 text-2xl font-extrabold uppercase tracking-wide text-ink">
                  {c.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">{c.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
