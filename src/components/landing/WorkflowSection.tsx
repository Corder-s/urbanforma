import { MapPin, Layers, PenTool, Activity, SlidersHorizontal, Share2 } from "lucide-react";
import { Reveal } from "./Reveal";

const STEPS = [
  { icon: MapPin, n: "01", title: "Choose Your Site", text: "Bring in parcels, boundaries and context." },
  { icon: Layers, n: "02", title: "Understand the Context", text: "Layer in GIS, climate and spatial data." },
  { icon: PenTool, n: "03", title: "Design the City", text: "Mass buildings, streets and open space in 3D." },
  { icon: Activity, n: "04", title: "Analyze the Impact", text: "Test heat, wind, daylight, carbon and more." },
  { icon: SlidersHorizontal, n: "05", title: "Optimize the Plan", text: "Compare scenarios and tune performance." },
  { icon: Share2, n: "06", title: "Visualize & Export", text: "Communicate with immersive views and BIM." },
];

export function WorkflowSection() {
  return (
    <section id="how-it-works" className="visual-sky border-y border-line py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">How It Works</p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-[42px]">
            From Site to <span className="text-primary">Skyline</span>
          </h2>
        </Reveal>

        <div className="relative mt-16">
          {/* connecting line */}
          <div
            className="absolute left-0 right-0 top-7 hidden h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent lg:block"
            aria-hidden="true"
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-6">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div className="group relative text-center lg:text-left">
                  <div className="relative z-10 mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-line bg-white text-primary shadow-soft transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-card lg:mx-0">
                    <s.icon size={24} />
                  </div>
                  <p className="mt-4 text-xs font-bold tracking-widest text-accent">STEP {s.n}</p>
                  <h3 className="mt-1 text-[15px] font-extrabold text-ink">{s.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
