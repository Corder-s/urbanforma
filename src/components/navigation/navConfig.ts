import type { LucideIcon } from "lucide-react";
import {
  Home,
  FolderKanban,
  DraftingCompass,
  Activity,
  Workflow,
  Boxes,
  FileText,
  Building2,
  Settings,
  CircleHelp,
} from "lucide-react";

export interface NavLink {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Primary application navigation (shown at the top of the sidebar). */
export const PRIMARY_NAV: NavLink[] = [
  { to: "/app", label: "Home", icon: Home },
  { to: "/app/projects", label: "Projects", icon: FolderKanban },
  { to: "/app/planning", label: "Planning Studio", icon: DraftingCompass },
  { to: "/app/analysis", label: "Analysis", icon: Activity },
  { to: "/app/optimization", label: "Optimization", icon: Workflow },
  { to: "/app/visualization", label: "Visualization", icon: Boxes },
  { to: "/app/reports", label: "Reports", icon: FileText },
  { to: "/app/bim", label: "BIM", icon: Building2 },
];

/** Secondary navigation (below the divider). */
export const SECONDARY_NAV: NavLink[] = [
  { to: "/app/settings", label: "Settings", icon: Settings },
];

/** Help is a UI-only menu (not a route yet) — its items open placeholders. */
export const HELP_LABEL = "Help";
export const HELP_ITEMS = ["Documentation", "Support", "Keyboard shortcuts"];
export const HelpIcon = CircleHelp;

/** Breadcrumb labels keyed by path (Home handled explicitly). */
export const ROUTE_TITLES: Record<string, string> = {
  "/app": "Home",
  "/app/projects": "Projects",
  "/app/projects/new": "New Project",
  "/app/planning": "Planning Studio",
  "/app/analysis": "Analysis",
  "/app/optimization": "Optimization",
  "/app/visualization": "Visualization",
  "/app/reports": "Reports",
  "/app/bim": "BIM",
  "/app/settings": "Settings",
};
