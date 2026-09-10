import { OptimizationWorkspace } from "../../features/optimization/components/OptimizationWorkspace";

/**
 * /app/optimization[?projectId=<id>] — Optimization & Scenario Planning.
 * Fills the AppShell content area exactly; the workspace manages its own
 * internal scrolling so the page itself never scrolls.
 */
export function OptimizationPage() {
  return (
    <div className="h-full min-h-0">
      <OptimizationWorkspace />
    </div>
  );
}
