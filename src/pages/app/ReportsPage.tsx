import { ReportsWorkspace } from "../../features/reports/components/ReportsWorkspace";

/**
 * /app/reports[?projectId=<id>&reportId=<id>] — Reports & Documentation.
 *
 * A scrolling page (PageContainer) rather than a fixed workspace, because a
 * report is a document: it grows with its sections and must be printable. The
 * workspace inside owns the report list, its configuration and the preview.
 */
export function ReportsPage() {
  return <ReportsWorkspace />;
}
