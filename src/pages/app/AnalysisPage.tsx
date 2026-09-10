import { AnalysisWorkspace } from "../../features/analysis/components/AnalysisWorkspace";

/**
 * /app/analysis[?projectId=<id>&category=<id>] — Environmental & Urban Analysis.
 * Fills the AppShell content area exactly; the workspace manages its own
 * internal scrolling so the page itself never scrolls.
 */
export function AnalysisPage() {
  return (
    <div className="h-full min-h-0">
      <AnalysisWorkspace />
    </div>
  );
}
