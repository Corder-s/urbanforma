import { BimWorkspace } from "../../features/bim/components/BimWorkspace";

/**
 * /app/bim[?projectId=<id>&elementId=<id>] — BIM Integration & Model
 * Coordination.
 *
 * Fills the AppShell content area exactly; the workspace manages its own
 * internal scrolling (dashboard) and its fixed panels (model / coordination /
 * issues), so the page itself never scrolls.
 */
export function BimPage() {
  return (
    <div className="h-full min-h-0">
      <BimWorkspace />
    </div>
  );
}
