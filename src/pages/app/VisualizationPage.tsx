import { VisualizationWorkspace } from "../../features/visualization/components/VisualizationWorkspace";

/**
 * /app/visualization[?projectId=<id>] — GIS & 3D City Visualization.
 * Fills the AppShell content area exactly; the workspace manages its own
 * internal scrolling so the page itself never scrolls.
 */
export function VisualizationPage() {
  return (
    <div className="h-full min-h-0">
      <VisualizationWorkspace />
    </div>
  );
}
