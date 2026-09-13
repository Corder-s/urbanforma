import type { ReportSectionId, ReportType } from "../types/report.types";

/** Human metadata for every section the preview can render. */
export interface SectionMeta {
  id: ReportSectionId;
  label: string;
  /** Shown in the config panel so planners know what they are toggling. */
  blurb: string;
  /** Which ReportModel source the section depends on (for honest empty states). */
  needs: ("project" | "planning" | "analysis" | "optimization" | "visualization")[];
}

export const SECTION_CATALOG: SectionMeta[] = [
  { id: "executiveSummary", label: "Executive Summary", blurb: "One-page position: scope, headline metrics, findings and recommendations.", needs: ["project"] },
  { id: "projectOverview", label: "Project Overview", blurb: "Name, location, type, status, progress and programme dates.", needs: ["project"] },
  { id: "siteContext", label: "Site Context", blurb: "Boundary, surrounding context, land use, streets, green and water.", needs: ["planning"] },
  { id: "planningOverview", label: "Planning Overview", blurb: "What is proposed: buildings, streets, parks, coverage and density.", needs: ["planning"] },
  { id: "urbanForm", label: "Urban Form", blurb: "Massing and land-use distribution of the proposed plan.", needs: ["planning"] },
  { id: "environmental", label: "Environmental Analysis", blurb: "Solar, heat, wind, green and carbon performance with scores.", needs: ["analysis"] },
  { id: "mobility", label: "Mobility Analysis", blurb: "Accessibility, walkability and street-network performance.", needs: ["analysis"] },
  { id: "optimization", label: "Optimization", blurb: "Goals, weights, constraints and the evaluated scenario set.", needs: ["optimization"] },
  { id: "scenarioComparison", label: "Scenario Comparison", blurb: "Side-by-side performance of every evaluated scenario.", needs: ["optimization"] },
  { id: "beforeAfter", label: "Before / After", blurb: "Current plan against the selected scenario, metric by metric.", needs: ["optimization"] },
  { id: "visualization", label: "Visualization", blurb: "Saved camera views and presentation snapshots attached to the project.", needs: ["visualization"] },
  { id: "keyMetrics", label: "Key Metrics", blurb: "The project's headline indicators in one table.", needs: ["project"] },
  { id: "insights", label: "Insights", blurb: "What the analysis found, ranked by severity.", needs: ["analysis"] },
  { id: "recommendations", label: "Recommendations", blurb: "Actions for decision-makers, derived from findings and constraints.", needs: ["analysis"] },
  { id: "projectInformation", label: "Project Information", blurb: "Provenance: owner, versions, sources and document control.", needs: ["project"] },
];

export const SECTION_META: Record<ReportSectionId, SectionMeta> = Object.fromEntries(
  SECTION_CATALOG.map((s) => [s.id, s])
) as Record<ReportSectionId, SectionMeta>;

export interface ReportTypeMeta {
  id: ReportType;
  label: string;
  description: string;
  /** Default enabled sections, in document order. */
  sections: ReportSectionId[];
}

export const REPORT_TYPES: ReportTypeMeta[] = [
  {
    id: "executive",
    label: "Executive Report",
    description: "A short decision-making document: position, headline metrics and recommendations.",
    sections: ["executiveSummary", "keyMetrics", "insights", "recommendations"],
  },
  {
    id: "planning",
    label: "Planning Report",
    description: "The proposed plan: site context, programme, urban form and land use.",
    sections: ["projectOverview", "siteContext", "planningOverview", "urbanForm", "keyMetrics"],
  },
  {
    id: "environmental",
    label: "Environmental Report",
    description: "Environmental performance: solar, heat, wind, green, carbon and mobility.",
    sections: ["executiveSummary", "environmental", "mobility", "insights", "recommendations"],
  },
  {
    id: "optimization",
    label: "Optimization Report",
    description: "Scenario evaluation: goals, constraints, comparison and before/after.",
    sections: ["optimization", "scenarioComparison", "beforeAfter", "recommendations"],
  },
  {
    id: "comprehensive",
    label: "Comprehensive Project Report",
    description: "The full planning document combining every major section.",
    sections: [
      "executiveSummary",
      "projectOverview",
      "siteContext",
      "planningOverview",
      "urbanForm",
      "environmental",
      "mobility",
      "optimization",
      "scenarioComparison",
      "beforeAfter",
      "visualization",
      "keyMetrics",
      "insights",
      "recommendations",
      "projectInformation",
    ],
  },
];

export const REPORT_TYPE_META: Record<ReportType, ReportTypeMeta> = Object.fromEntries(
  REPORT_TYPES.map((t) => [t.id, t])
) as Record<ReportType, ReportTypeMeta>;

/** Default title for a new report of a given type. */
export function defaultReportTitle(type: ReportType, projectName: string): string {
  return `${REPORT_TYPE_META[type].label} — ${projectName}`;
}
