import type { LucideIcon } from "lucide-react";

/** High-level project lifecycle status used across the app. */
export type ProjectStatus =
  | "Planning"
  | "Analysis"
  | "Optimization"
  | "Completed"
  | "Archived";

/**
 * The kind of planning project (used for the type filter / badge and the
 * Create Project form). Includes the legacy demo-data kinds so existing
 * projects remain valid.
 */
export type ProjectType =
  | "Residential"
  | "Commercial"
  | "Mixed Use"
  | "Industrial"
  | "Institutional"
  | "Public Space"
  | "Urban Redevelopment"
  | "Smart City District"
  | "Masterplan"
  | "Site Planning"
  | "Urban Design"
  | "Development";

export type WorkflowStageState = "done" | "current" | "upcoming";

/** One step in the active project's planning workflow. */
export interface ProjectStage {
  key: string;
  label: string;
  state: WorkflowStageState;
}

/** Environmental preview values for a project (illustrative until wired up). */
export interface EnvironmentalSnapshot {
  /** Qualitative heat label, e.g. "Good". */
  heat: string;
  sunlight: string; // e.g. "7.2 hrs"
  wind: string; // e.g. "4.2 m/s"
  greenCoverage: string; // e.g. "22.3%"
  carbon: string; // e.g. "71,928 t CO₂e"
  score: number; // 0–100 environmental score
}

export interface Project {
  id: string;
  name: string;
  location: string;
  /** One-line description used in list view and search. */
  description: string;
  type: ProjectType;
  status: ProjectStatus;
  /** Site area in hectares (numeric so it sorts; format with formatSiteArea). */
  siteAreaHa: number;
  progress: number; // 0–100
  /** Human-readable recency label, e.g. "12 minutes ago". */
  updatedAt: string;
  /** ISO timestamps for sorting / time-window filters. */
  updatedAtIso: string;
  createdAtIso: string;
  /** Human-readable current stage, e.g. "Environmental Analysis". */
  stage: string;
  /** Selects the miniature site visualization variant. */
  thumbVariant: number;
  env: EnvironmentalSnapshot;
  /** Planning preferences chosen at creation (user-created projects). */
  preferences?: ProjectPreferences;
  /** Optional site centre (user-created projects with coordinates). */
  center?: { lat: number; lng: number };
}

export interface ActivityItem {
  id: string;
  label: string;
  time: string;
  icon: LucideIcon;
  tone: "blue" | "green" | "amber" | "teal";
}

export interface AttentionItem {
  id: string;
  title: string;
  text: string;
  actionLabel: string;
  /** Destination route. */
  to: string;
}

export interface PortfolioSummary {
  activeProjects: number;
  totalSiteArea: string;
  projectsInPlanning: number;
  completedProjects: number;
}

/** Everything the Home/Dashboard renders, from a single data source. */
export interface DashboardData {
  featured: Project | null;
  recent: Project[];
  portfolio: PortfolioSummary;
  activity: ActivityItem[];
  attention: AttentionItem[];
  /** Workflow stages for the active (featured) project. */
  stages: ProjectStage[];
}

/** Sort options for the Projects list. */
export type ProjectSort =
  | "recent"
  | "name"
  | "progress"
  | "siteArea"
  | "created";

/** Last-updated time-window filter for the Projects list. */
export type UpdatedFilter = "anytime" | "today" | "week" | "month";

export type ViewMode = "grid" | "list";

/** Discriminated result state for the Home/Dashboard view. */
export type DashboardState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "empty" }
  | { status: "ready"; data: DashboardData };

// ---------------------------------------------------------------------------
// Project Details (Step 9)
// ---------------------------------------------------------------------------

/** Lifecycle state of one planning stage on the details page. */
export type StageStatus = "Completed" | "In Progress" | "Not Started";

/** The six canonical planning stages, in order. */
export type PlanningStageKey =
  | "site-context"
  | "design"
  | "analysis"
  | "optimization"
  | "visualization"
  | "reports";

export interface PlanningStage {
  key: PlanningStageKey;
  label: string;
  status: StageStatus;
  /** 0–100 completion of this stage. */
  progress: number;
  /** Short helper line, e.g. "Boundary, context layers and constraints". */
  summary: string;
}

/** Severity/importance level of a project insight (never colour-only). */
export type InsightLevel = "positive" | "info" | "attention";

export type InsightCategory = "Environmental" | "Mobility" | "Development" | "Planning";

export interface ProjectInsight {
  id: string;
  category: InsightCategory;
  text: string;
  level: InsightLevel;
}

/** Key planning metrics shown in the metric-card grid. */
export interface ProjectMetrics {
  siteAreaHa: number;
  buildings: number;
  /** Percentage, e.g. 22.3 */
  greenCoveragePct: number;
  /** 0–100 */
  environmentalScore: number;
  estimatedPopulation: number;
  /** Kilometres */
  roadNetworkKm: number;
}

/** Simple metric with a 0–100 indicator level for the environmental snapshot. */
export interface EnvironmentalMetric {
  key: "heat" | "sunlight" | "wind" | "green" | "carbon";
  label: string;
  /** Display value, e.g. "7.2 hrs". */
  value: string;
  /** 0–100 — higher is better (already normalised for the indicator). */
  level: number;
  /** Short qualitative note, e.g. "Comfortable". */
  note: string;
}

export interface EnvironmentalSummary {
  /** 0–100 environmental score. */
  score: number;
  metrics: EnvironmentalMetric[];
}

/**
 * Site context for the details page. Shaped so a real map/GIS provider can be
 * connected later: `center` + `boundary` are real WGS84 coordinates, and the
 * map component only ever reads from this object.
 */
export interface SiteContext {
  /** Human-readable address / locality. */
  location: string;
  /** Centre point of the site, decimal degrees. */
  center: { lat: number; lng: number };
  siteAreaHa: number;
  terrain: string;
  existingDevelopment: string;
  accessibility: string;
  /** Optional planning zoning summary. */
  zoning?: string;
}

export type ActivityKind =
  | "analysis"
  | "boundary"
  | "layout"
  | "created"
  | "optimization"
  | "export"
  | "comment";

export interface ProjectActivity {
  id: string;
  kind: ActivityKind;
  title: string;
  /** Optional one-line detail. */
  detail?: string;
  /** Human-readable relative time, e.g. "2 hours ago". */
  time: string;
  /** ISO timestamp (kept for future ordering / grouping). */
  atIso: string;
}

export interface NextStep {
  id: string;
  title: string;
  text: string;
  actionLabel: string;
  /** Destination route (existing placeholder modules for now). */
  to: string;
  /** Marks the recommended/primary next action. */
  primary?: boolean;
}

export interface ProjectOwner {
  name: string;
  role: string;
  email: string;
}

/** Full project record for /app/projects/:projectId (GET /api/projects/:id). */
export interface ProjectDetail extends Project {
  currentStage: PlanningStageKey;
  metrics: ProjectMetrics;
  stages: PlanningStage[];
  siteContext: SiteContext;
  insights: ProjectInsight[];
  environmental: EnvironmentalSummary;
  activities: ProjectActivity[];
  nextSteps: NextStep[];
  owner: ProjectOwner;
}

/** Discriminated result state for the Project Details view. */
export type ProjectDetailState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error" }
  | { status: "ready"; project: ProjectDetail };

// ---------------------------------------------------------------------------
// Create Project (Step 10)
// ---------------------------------------------------------------------------

export type AreaUnit = "ha" | "m2" | "km2";
export type DistanceUnit = "m" | "km";
export type DevelopmentDensity = "Low" | "Medium" | "High";
export type PlanningPriority =
  | "Balanced Development"
  | "Sustainability"
  | "Mobility"
  | "Housing"
  | "Economic Development"
  | "Public Realm";
export type SustainabilityGoal = "Standard" | "Enhanced" | "High Sustainability";

/** Payload for creating a project (future POST /api/projects body). */
export interface CreateProjectInput {
  name: string;
  description: string;
  type: ProjectType;
  location: string;
  /** Site area expressed in `areaUnit`. */
  siteArea: number;
  areaUnit: AreaUnit;
  latitude?: number;
  longitude?: number;
  targetPopulation?: number;
  density: DevelopmentDensity;
  planningPriority: PlanningPriority;
  sustainabilityGoal: SustainabilityGoal;
  distanceUnit: DistanceUnit;
}

/** Planning preferences captured at creation, stored with the project. */
export interface ProjectPreferences {
  targetPopulation?: number;
  density: DevelopmentDensity;
  planningPriority: PlanningPriority;
  sustainabilityGoal: SustainabilityGoal;
  areaUnit: AreaUnit;
  distanceUnit: DistanceUnit;
}

/**
 * Raw (string) form state for the Create Project page. Kept as strings so the
 * inputs are fully controlled and drafts round-trip through localStorage
 * without loss; it is parsed/validated into CreateProjectInput on submit.
 */
export interface CreateProjectFormValues {
  name: string;
  description: string;
  type: ProjectType | "";
  location: string;
  siteArea: string;
  areaUnit: AreaUnit;
  latitude: string;
  longitude: string;
  targetPopulation: string;
  density: DevelopmentDensity;
  planningPriority: PlanningPriority;
  sustainabilityGoal: SustainabilityGoal;
  distanceUnit: DistanceUnit;
}

export type CreateProjectField = keyof CreateProjectFormValues;
export type CreateProjectErrors = Partial<Record<CreateProjectField, string>>;
