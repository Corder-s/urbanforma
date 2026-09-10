import { Link } from "react-router-dom";
import { ArrowRight, Compass, Ruler, Leaf, Gauge, Building2 } from "lucide-react";
import { Button } from "../ui/Button";
import { LandingCityScene } from "./LandingCityScene";
import { FloatingMetric } from "./FloatingMetric";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-[72px]">
      {/* soft backdrop */}
      <div className="visual-sky pointer-events-none absolute inset-0" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, rgba(37,99,235,0.10), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-5 pb-10 pt-14 sm:px-8 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white/70 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary backdrop-blur animate-fade-in">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Smart City Planning Platform
          </span>

          <h1 className="mt-6 text-[40px] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-[68px] animate-rise-in">
            Design Better Cities.
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Understand Their Impact.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-muted animate-rise-in anim-delay-2">
            UrbanForma brings site planning, spatial intelligence,
            environmental analysis and 3D visualization into one connected
            urban planning workspace.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 animate-rise-in anim-delay-3">
            <Link to="/login">
              <Button size="lg">
                Start Planning <ArrowRight size={18} />
              </Button>
            </Link>
            <a href="#platform">
              <Button size="lg" variant="secondary">
                <Compass size={18} /> Explore Platform
              </Button>
            </a>
          </div>
        </div>

        {/* large city visual */}
        <div className="relative mt-8">
          <div className="relative mx-auto aspect-[720/520] w-full max-w-5xl">
            <LandingCityScene />

            {/* illustrative floating metrics */}
            <FloatingMetric icon={Ruler} label="Site Area" value="51.0 ha"
              className="left-[1%] top-[30%]" delay={900} />
            <FloatingMetric icon={Leaf} label="Green Cover" value="22.3%"
              className="right-[1%] top-[22%]" delay={1050} />
            <FloatingMetric icon={Gauge} label="Environment" value="84 / 100"
              className="left-[2%] bottom-[16%]" delay={1200} />
            <FloatingMetric icon={Building2} label="Buildings" value="148"
              className="right-[3%] bottom-[22%]" delay={1350} />

            <p className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[11px] font-medium text-faint">
              Illustrative visualization · not live data
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
