import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "../ui/Button";
import { ProjectThumb } from "./ProjectThumb";

/** Empty workspace — shown when the user genuinely has no projects. */
export function DashboardEmpty() {
  return (
    <div className="grid place-items-center px-6 py-16 sm:py-24">
      <div className="w-full max-w-md text-center">
        <div className="relative mx-auto aspect-[240/150] w-full max-w-sm overflow-hidden rounded-3xl border border-line bg-surface-2 shadow-soft">
          <ProjectThumb variant={2} label="Empty workspace illustration" className="h-full w-full opacity-90" />
        </div>
        <h2 className="mt-7 text-2xl font-extrabold tracking-tight text-ink">
          Your city planning workspace starts here.
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-muted">
          Create your first project to begin designing a smarter city — site
          planning, environmental analysis and 3D visualization in one place.
        </p>
        <Link to="/app/projects/new" className="mt-6 inline-block">
          <Button size="lg">
            <Plus size={18} /> Create Project
          </Button>
        </Link>
      </div>
    </div>
  );
}
