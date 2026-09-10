import { PlanningStudio } from "../../features/planning/components/PlanningStudio";

/**
 * /app/planning[?projectId=<id>] — Planning Studio.
 * Fills the AppShell content area exactly; the studio manages its own
 * internal scrolling so the page itself never scrolls.
 */
export function PlanningStudioPage() {
  return (
    <div className="h-full min-h-0">
      <PlanningStudio />
    </div>
  );
}
