import { Link, useSearchParams } from "react-router-dom";
import { Box, Layers, type LucideIcon } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import type { StudioMode } from "../types/planning.types";

interface ModePlaceholderProps {
  mode: Exclude<StudioMode, "plan">;
  onBackToPlan: () => void;
}

const COPY: Record<Exclude<StudioMode, "plan">, { icon: LucideIcon; title: string; text: string; step: string }> = {
  context: {
    icon: Layers,
    title: "Context mode",
    text: "Context mode will bring real base maps, cadastral parcels, transit and utility datasets from the GIS module. Use the Context layers panel to preview indicative layers on the plan canvas today.",
    step: "Arrives with the GIS module",
  },
  "3d": {
    icon: Box,
    title: "3D Preview",
    text: "Studio-side massing previews are not built yet. The 3D City in the Visualization workspace already extrudes this plan into a lit, interactive model with the same site data.",
    step: "Available in Visualization",
  },
};

/** Honest placeholder for modes that are not built yet (Context, 3D Preview). */
export function ModePlaceholder({ mode, onBackToPlan }: ModePlaceholderProps) {
  const c = COPY[mode];
  const Icon = c.icon;
  const [params] = useSearchParams();
  const projectId = params.get("projectId");
  return (
    <div className="grid h-full place-items-center overflow-y-auto bg-[#F1F5FB] p-6">
      <div className="w-full max-w-md rounded-3xl border border-dashed border-line-strong bg-surface/80 p-6 text-center sm:p-8">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary ring-1 ring-primary/15">
          <Icon size={26} />
        </span>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-primary">{c.step}</p>
        <h2 className="mt-1 text-xl font-extrabold text-ink">{c.title}</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{c.text}</p>
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          {mode === "3d" && projectId && (
            <Link to={`/app/visualization?projectId=${encodeURIComponent(projectId)}`}>
              <Button fullWidth>
                <Box size={16} /> Open 3D City
              </Button>
            </Link>
          )}
          <Button variant="secondary" onClick={onBackToPlan}>
            Back to Plan
          </Button>
        </div>
      </div>
    </div>
  );
}
