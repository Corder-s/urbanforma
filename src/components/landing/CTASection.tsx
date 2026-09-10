import { Link } from "react-router-dom";
import { ArrowRight, LogIn } from "lucide-react";
import { Button } from "../ui/Button";
import { Reveal } from "./Reveal";

export function CTASection() {
  return (
    <section className="px-5 py-20 sm:px-8 sm:py-28">
      <Reveal className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-[32px] border border-primary/20 bg-gradient-to-br from-primary to-accent px-6 py-16 text-center shadow-card sm:px-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            aria-hidden="true"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.25) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage: "radial-gradient(ellipse 70% 80% at 50% 0%, #000, transparent 75%)",
              WebkitMaskImage: "radial-gradient(ellipse 70% 80% at 50% 0%, #000, transparent 75%)",
            }}
          />
          <div className="relative">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              Ready to Design the Next City?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-white/85">
              Start exploring a smarter way to plan, visualize and improve urban
              environments.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link to="/login">
                <Button size="lg" className="bg-white text-primary-dark shadow-float hover:bg-white/90">
                  Get Started <ArrowRight size={18} />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="secondary" className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                  <LogIn size={18} /> Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
