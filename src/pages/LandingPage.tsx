import { LandingNavbar } from "../components/landing/LandingNavbar";
import { HeroSection } from "../components/landing/HeroSection";
import { IntroSection } from "../components/landing/IntroSection";
import { FeatureGrid } from "../components/landing/FeatureGrid";
import { WorkflowSection } from "../components/landing/WorkflowSection";
import { CityVisualization } from "../components/landing/CityVisualization";
import { AnalysisSection } from "../components/landing/AnalysisSection";
import { SustainabilitySection } from "../components/landing/SustainabilitySection";
import { PhilosophySection } from "../components/landing/PhilosophySection";
import { CTASection } from "../components/landing/CTASection";
import { LandingFooter } from "../components/landing/LandingFooter";

/** Public marketing landing page — accessible without authentication. */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <LandingNavbar />
      <main>
        <HeroSection />
        <IntroSection />
        <FeatureGrid />
        <WorkflowSection />
        <CityVisualization />
        <AnalysisSection />
        <SustainabilitySection />
        <PhilosophySection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
