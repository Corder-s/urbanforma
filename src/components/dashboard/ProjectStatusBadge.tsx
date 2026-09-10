import { Badge } from "../ui/Badge";
import type { ProjectStatus } from "../../features/projects/project.types";

const MAP: Record<ProjectStatus, { tone: "blue" | "teal" | "amber" | "green" | "neutral" }> = {
  Planning: { tone: "blue" },
  Analysis: { tone: "teal" },
  Optimization: { tone: "amber" },
  Completed: { tone: "green" },
  Archived: { tone: "neutral" },
};

/** Subtle status badge — dot + text label (status is never color-only). */
export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge tone={MAP[status].tone} dot>
      {status}
    </Badge>
  );
}
