import {
  Ruler,
  Boxes,
  ThermometerSun,
  Sparkles,
  Globe2,
  Building2,
} from "lucide-react";
import { Reveal } from "./Reveal";
import { FeatureCard } from "./FeatureCard";

const FEATURES = [
  {
    icon: Ruler,
    title: "Site Planning",
    description: "Define and understand your site — parcels, zoning, constraints and context in one view.",
  },
  {
    icon: Boxes,
    title: "3D City Modeling",
    description: "Explore urban form in an immersive, real-time three-dimensional environment.",
  },
  {
    icon: ThermometerSun,
    title: "Environmental Intelligence",
    description: "Understand heat, wind, sunlight and daylight across every proposal.",
  },
  {
    icon: Sparkles,
    title: "Smart Optimization",
    description: "Compare alternatives and improve planning decisions with quantified trade-offs.",
  },
  {
    icon: Globe2,
    title: "GIS & Spatial Data",
    description: "Bring real-world geographic context and layers into every plan.",
  },
  {
    icon: Building2,
    title: "BIM",
    description: "Move from concept toward detailed building information and delivery.",
  },
];

export function FeatureGrid() {
  return (
    <section id="platform" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">
            The Platform
          </p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-[42px]">
            Everything You Need to <span className="text-primary">Shape a City</span>
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 110}>
              <FeatureCard {...f} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
