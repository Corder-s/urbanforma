import { DEV_PROJECTS } from "./projects.data";
import type {
  EnvironmentalSummary,
  NextStep,
  PlanningStage,
  PlanningStageKey,
  Project,
  ProjectActivity,
  ProjectDetail,
  ProjectInsight,
  ProjectMetrics,
  ProjectOwner,
  SiteContext,
  StageStatus,
} from "../project.types";

/**
 * Development dataset for the Project Details page.
 *
 * Every detail record is derived from the canonical `DEV_PROJECTS` list so the
 * Projects page and the details page can never disagree about a project's name,
 * status, progress or site area. Each project then layers on its own
 * hand-authored details (metrics, site context, insights, activity, next steps).
 *
 * All values are DEMO data. In a later step this file is replaced by
 * `GET /api/projects/:id` (Spring Boot → PostgreSQL/PostGIS); the UI already
 * reads exclusively through `project.service.ts#getProjectDetails`.
 */

const hoursAgo = (h: number): string => new Date(Date.now() - h * 3_600_000).toISOString();
const daysAgo = (d: number): string => hoursAgo(d * 24);

// ---------------------------------------------------------------------------
// Planning stages
// ---------------------------------------------------------------------------

const STAGE_ORDER: { key: PlanningStageKey; label: string; summary: string }[] = [
  { key: "site-context", label: "Site & Context", summary: "Boundary, context layers and constraints" },
  { key: "design", label: "Design", summary: "Land use, buildings, roads and open space" },
  { key: "analysis", label: "Analysis", summary: "Heat, sunlight, wind, green coverage and carbon" },
  { key: "optimization", label: "Optimization", summary: "Performance-based scenario improvements" },
  { key: "visualization", label: "Visualization", summary: "3D massing and presentation views" },
  { key: "reports", label: "Reports", summary: "Environmental reports and BIM export" },
];

/**
 * Build the six planning stages from the index of the current stage and the
 * completion of that stage. Everything before is Completed, everything after is
 * Not Started — this keeps the demo data internally consistent.
 */
function buildStages(current: PlanningStageKey, currentProgress: number, allDone = false): PlanningStage[] {
  const currentIndex = STAGE_ORDER.findIndex((s) => s.key === current);
  return STAGE_ORDER.map((s, i) => {
    let status: StageStatus;
    let progress: number;
    if (allDone || i < currentIndex) {
      status = "Completed";
      progress = 100;
    } else if (i === currentIndex) {
      status = "In Progress";
      progress = currentProgress;
    } else {
      status = "Not Started";
      progress = 0;
    }
    return { ...s, status, progress };
  });
}

// ---------------------------------------------------------------------------
// Owners (demo team)
// ---------------------------------------------------------------------------

const OWNERS: Record<string, ProjectOwner> = {
  priya: { name: "Priya Sharma", role: "Lead Urban Planner", email: "priya.sharma@urbanforma.dev" },
  arjun: { name: "Arjun Mehta", role: "Urban Designer", email: "arjun.mehta@urbanforma.dev" },
  lena: { name: "Lena Sørensen", role: "Sustainability Analyst", email: "lena.sorensen@urbanforma.dev" },
  rahul: { name: "Rahul Verma", role: "Masterplanning Director", email: "rahul.verma@urbanforma.dev" },
};

// ---------------------------------------------------------------------------
// Per-project detail overlays
// ---------------------------------------------------------------------------

interface DetailOverlay {
  currentStage: PlanningStageKey;
  /** Completion of the current stage (0–100). Ignored when `delivered`. */
  stageProgress: number;
  /** Completed/archived projects: all stages done. */
  delivered?: boolean;
  metrics: Omit<ProjectMetrics, "siteAreaHa" | "environmentalScore">;
  siteContext: Omit<SiteContext, "location" | "siteAreaHa">;
  insights: ProjectInsight[];
  environmental: Omit<EnvironmentalSummary, "score">;
  activities: ProjectActivity[];
  nextSteps: NextStep[];
  owner: ProjectOwner;
}

const NEXT_DESIGN: NextStep = {
  id: "ns-design",
  title: "Continue Design",
  text: "Complete the current building and road layout.",
  actionLabel: "Open Planning Studio",
  to: "/app/planning",
  primary: true,
};
const NEXT_ANALYSIS: NextStep = {
  id: "ns-analysis",
  title: "Run Environmental Analysis",
  text: "Evaluate heat, sunlight, wind and green coverage.",
  actionLabel: "Open Analysis",
  to: "/app/analysis",
};
const NEXT_OPTIMIZE: NextStep = {
  id: "ns-optimize",
  title: "Review Optimization",
  text: "Generate and compare planning scenarios against your goals and constraints.",
  actionLabel: "Open Optimization",
  to: "/app/optimization",
};
const NEXT_VISUALIZE: NextStep = {
  id: "ns-visualize",
  title: "Prepare Visualization",
  text: "Generate 3D massing views for stakeholder review.",
  actionLabel: "Open Visualization",
  to: "/app/visualization",
};
const NEXT_REPORT: NextStep = {
  id: "ns-report",
  title: "Generate Reports",
  text: "Export the environmental report and BIM package.",
  actionLabel: "Open Reports",
  to: "/app/reports",
};

const OVERLAYS: Record<string, DetailOverlay> = {
  "smart-city-masterplan": {
    currentStage: "analysis",
    stageProgress: 60,
    metrics: { buildings: 148, greenCoveragePct: 22.3, estimatedPopulation: 12_480, roadNetworkKm: 18.6 },
    siteContext: {
      center: { lat: 28.4595, lng: 77.0266 },
      terrain: "Gently sloping plain, 2–4% grade toward the south-east",
      existingDevelopment: "Partially developed — low-rise institutional and vacant plots",
      accessibility: "Metro station 600 m; arterial road on the northern edge",
      zoning: "Mixed-use (residential, commercial, institutional)",
    },
    insights: [
      { id: "i1", category: "Environmental", level: "positive", text: "Green coverage is currently above the project baseline." },
      { id: "i2", category: "Mobility", level: "positive", text: "Primary road access is well connected to the surrounding network." },
      { id: "i3", category: "Development", level: "info", text: "Building distribution is concentrated around the central site area." },
      { id: "i4", category: "Planning", level: "attention", text: "Optimization is recommended after the current analysis stage." },
    ],
    environmental: {
      metrics: [
        { key: "heat", label: "Heat", value: "Good", level: 78, note: "Low heat-island risk" },
        { key: "sunlight", label: "Sunlight", value: "7.2 hrs", level: 82, note: "Average daily on ground level" },
        { key: "wind", label: "Wind", value: "4.2 m/s", level: 70, note: "Comfortable pedestrian conditions" },
        { key: "green", label: "Green Coverage", value: "22.3%", level: 62, note: "Above 20% baseline" },
        { key: "carbon", label: "Carbon", value: "71,928 t CO₂e", level: 58, note: "Estimated embodied + operational" },
      ],
    },
    activities: [
      { id: "a1", kind: "analysis", title: "Environmental analysis completed", detail: "Sunlight and wind studies updated", time: "2 hours ago", atIso: hoursAgo(2) },
      { id: "a2", kind: "boundary", title: "Site boundary updated", detail: "Northern edge aligned with cadastral survey", time: "Yesterday", atIso: hoursAgo(26) },
      { id: "a3", kind: "layout", title: "Building layout revised", detail: "Central block heights adjusted", time: "2 days ago", atIso: daysAgo(2) },
      { id: "a4", kind: "comment", title: "Review comments added", detail: "3 notes on the transit corridor", time: "4 days ago", atIso: daysAgo(4) },
      { id: "a5", kind: "created", title: "Project created", time: "5 days ago", atIso: daysAgo(5) },
    ],
    nextSteps: [
      { ...NEXT_ANALYSIS, primary: true, title: "Complete Environmental Analysis", text: "Finish the wind-comfort study to close the analysis stage." },
      { ...NEXT_OPTIMIZE },
      { ...NEXT_DESIGN, primary: false, title: "Refine Design", text: "Adjust the central block massing based on analysis results." },
    ],
    owner: OWNERS.priya,
  },

  "marina-south-innovation-district": {
    currentStage: "design",
    stageProgress: 55,
    metrics: { buildings: 86, greenCoveragePct: 18.0, estimatedPopulation: 6_900, roadNetworkKm: 9.4 },
    siteContext: {
      center: { lat: 1.2712, lng: 103.8636 },
      terrain: "Flat reclaimed land, 2–3 m above mean sea level",
      existingDevelopment: "Undeveloped waterfront parcel with temporary event use",
      accessibility: "MRT interchange 400 m; waterfront promenade access",
      zoning: "Business park / innovation district",
    },
    insights: [
      { id: "i1", category: "Environmental", level: "attention", text: "Green coverage is below the 20% district target." },
      { id: "i2", category: "Mobility", level: "positive", text: "Active-mobility network connects to two transit nodes." },
      { id: "i3", category: "Development", level: "info", text: "Higher-density blocks are clustered along the waterfront edge." },
      { id: "i4", category: "Planning", level: "info", text: "Stormwater strategy should be finalized before analysis." },
    ],
    environmental: {
      metrics: [
        { key: "heat", label: "Heat", value: "Moderate", level: 58, note: "Shading needed on east–west streets" },
        { key: "sunlight", label: "Sunlight", value: "6.8 hrs", level: 74, note: "Average daily on ground level" },
        { key: "wind", label: "Wind", value: "3.6 m/s", level: 64, note: "Sea breeze from the south" },
        { key: "green", label: "Green Coverage", value: "18.0%", level: 48, note: "Below 20% target" },
        { key: "carbon", label: "Carbon", value: "40,210 t CO₂e", level: 62, note: "Estimated embodied + operational" },
      ],
    },
    activities: [
      { id: "a1", kind: "layout", title: "Public realm layout updated", detail: "Promenade widened to 18 m", time: "1 hour ago", atIso: hoursAgo(1) },
      { id: "a2", kind: "boundary", title: "Flood-risk layer imported", time: "Yesterday", atIso: hoursAgo(30) },
      { id: "a3", kind: "layout", title: "Block typologies assigned", time: "3 days ago", atIso: daysAgo(3) },
      { id: "a4", kind: "created", title: "Project created", time: "3 months ago", atIso: daysAgo(90) },
    ],
    nextSteps: [NEXT_DESIGN, NEXT_ANALYSIS, NEXT_OPTIMIZE],
    owner: OWNERS.arjun,
  },

  "riverside-quarter": {
    currentStage: "optimization",
    stageProgress: 70,
    metrics: { buildings: 42, greenCoveragePct: 31.0, estimatedPopulation: 3_150, roadNetworkKm: 5.2 },
    siteContext: {
      center: { lat: 55.6867, lng: 12.5989 },
      terrain: "Flat harbour quay, partially on engineered fill",
      existingDevelopment: "Former industrial warehouses, two retained heritage sheds",
      accessibility: "Harbour bus and metro within 500 m; cycle superhighway adjacent",
      zoning: "Residential with ground-floor active uses",
    },
    insights: [
      { id: "i1", category: "Environmental", level: "positive", text: "Daylight targets are met in 94% of dwellings in the current scenario." },
      { id: "i2", category: "Mobility", level: "positive", text: "Car-light layout keeps through-traffic off the quay." },
      { id: "i3", category: "Development", level: "info", text: "Scenario B trades 6% floor area for improved wind comfort." },
      { id: "i4", category: "Planning", level: "attention", text: "Select a preferred scenario to unlock visualization and reporting." },
    ],
    environmental: {
      metrics: [
        { key: "heat", label: "Heat", value: "Good", level: 84, note: "Cool maritime climate" },
        { key: "sunlight", label: "Sunlight", value: "5.4 hrs", level: 66, note: "Winter sun constrained by latitude" },
        { key: "wind", label: "Wind", value: "5.1 m/s", level: 56, note: "Quay-edge gusts need mitigation" },
        { key: "green", label: "Green Coverage", value: "31.0%", level: 80, note: "Well above baseline" },
        { key: "carbon", label: "Carbon", value: "18,640 t CO₂e", level: 76, note: "Timber structure option" },
      ],
    },
    activities: [
      { id: "a1", kind: "optimization", title: "Scenario B optimization run", detail: "Wind comfort improved by 12%", time: "3 hours ago", atIso: hoursAgo(3) },
      { id: "a2", kind: "analysis", title: "Daylight analysis completed", time: "Yesterday", atIso: hoursAgo(28) },
      { id: "a3", kind: "layout", title: "Courtyard blocks re-oriented", time: "4 days ago", atIso: daysAgo(4) },
      { id: "a4", kind: "created", title: "Project created", time: "7 months ago", atIso: daysAgo(200) },
    ],
    nextSteps: [{ ...NEXT_OPTIMIZE, primary: true }, NEXT_VISUALIZE, NEXT_REPORT],
    owner: OWNERS.lena,
  },

  "greenfield-new-town": {
    currentStage: "site-context",
    stageProgress: 68,
    metrics: { buildings: 0, greenCoveragePct: 14.5, estimatedPopulation: 42_000, roadNetworkKm: 46.0 },
    siteContext: {
      center: { lat: 18.6298, lng: 73.7997 },
      terrain: "Undulating agricultural land with a seasonal stream",
      existingDevelopment: "Agricultural — scattered farm structures only",
      accessibility: "State highway 2 km; proposed suburban rail corridor",
      zoning: "Proposed new-town structure plan",
    },
    insights: [
      { id: "i1", category: "Environmental", level: "attention", text: "Seasonal stream corridor should be protected as a blue-green spine." },
      { id: "i2", category: "Mobility", level: "info", text: "Primary access depends on the planned rail corridor timeline." },
      { id: "i3", category: "Development", level: "info", text: "Phase 1 land parcels are still being defined." },
      { id: "i4", category: "Planning", level: "info", text: "Complete context layers before starting the design stage." },
    ],
    environmental: {
      metrics: [
        { key: "heat", label: "Heat", value: "Warm", level: 46, note: "High summer temperatures" },
        { key: "sunlight", label: "Sunlight", value: "8.1 hrs", level: 90, note: "Strong solar resource" },
        { key: "wind", label: "Wind", value: "2.8 m/s", level: 52, note: "Low prevailing wind" },
        { key: "green", label: "Green Coverage", value: "14.5%", level: 38, note: "Baseline before design" },
        { key: "carbon", label: "Carbon", value: "120,800 t CO₂e", level: 40, note: "Preliminary estimate" },
      ],
    },
    activities: [
      { id: "a1", kind: "boundary", title: "Contour layer imported", detail: "1 m contours from survey", time: "Yesterday", atIso: hoursAgo(20) },
      { id: "a2", kind: "boundary", title: "Site boundary drawn", time: "3 days ago", atIso: daysAgo(3) },
      { id: "a3", kind: "created", title: "Project created", time: "6 weeks ago", atIso: daysAgo(45) },
    ],
    nextSteps: [
      { id: "ns-context", title: "Complete Site Context", text: "Add hydrology and land-ownership layers to the site model.", actionLabel: "Open Planning Studio", to: "/app/planning", primary: true },
      NEXT_DESIGN,
      NEXT_ANALYSIS,
    ],
    owner: OWNERS.rahul,
  },

  "harbor-living": {
    currentStage: "reports",
    stageProgress: 100,
    delivered: true,
    metrics: { buildings: 36, greenCoveragePct: 27.6, estimatedPopulation: 2_400, roadNetworkKm: 3.8 },
    siteContext: {
      center: { lat: 51.9067, lng: 4.4861 },
      terrain: "Flat harbour basin edge, 1 m above NAP",
      existingDevelopment: "Delivered residential development (completed)",
      accessibility: "Metro 300 m; water taxi stop on site",
      zoning: "Residential (delivered)",
    },
    insights: [
      { id: "i1", category: "Environmental", level: "positive", text: "As-built green coverage exceeds the planning target by 5.6%." },
      { id: "i2", category: "Mobility", level: "positive", text: "Car-free core with shared mobility hubs at both entrances." },
      { id: "i3", category: "Development", level: "positive", text: "All phases delivered; BIM export archived." },
      { id: "i4", category: "Planning", level: "info", text: "Project is complete — no further planning actions required." },
    ],
    environmental: {
      metrics: [
        { key: "heat", label: "Heat", value: "Good", level: 82, note: "Water-adjacent cooling" },
        { key: "sunlight", label: "Sunlight", value: "6.0 hrs", level: 70, note: "Average daily on ground level" },
        { key: "wind", label: "Wind", value: "4.8 m/s", level: 60, note: "Mitigated with planting" },
        { key: "green", label: "Green Coverage", value: "27.6%", level: 74, note: "Above target" },
        { key: "carbon", label: "Carbon", value: "11,300 t CO₂e", level: 84, note: "As-built figure" },
      ],
    },
    activities: [
      { id: "a1", kind: "export", title: "Final BIM export archived", time: "2 days ago", atIso: daysAgo(2) },
      { id: "a2", kind: "export", title: "Environmental report issued", time: "1 week ago", atIso: daysAgo(7) },
      { id: "a3", kind: "created", title: "Project created", time: "14 months ago", atIso: daysAgo(420) },
    ],
    nextSteps: [
      { id: "ns-view-report", title: "View Final Reports", text: "Open the issued environmental report and export package.", actionLabel: "Open Reports", to: "/app/reports", primary: true },
      { id: "ns-bim", title: "Review BIM Archive", text: "Browse the delivered BIM model and export history.", actionLabel: "Open BIM", to: "/app/bim" },
    ],
    owner: OWNERS.lena,
  },

  "tech-park-expansion": {
    currentStage: "analysis",
    stageProgress: 35,
    metrics: { buildings: 24, greenCoveragePct: 20.0, estimatedPopulation: 9_800, roadNetworkKm: 6.1 },
    siteContext: {
      center: { lat: 12.9716, lng: 77.5946 },
      terrain: "Plateau with a slight fall to the west",
      existingDevelopment: "Existing campus phase 1 — four office blocks",
      accessibility: "Outer ring road adjacent; metro extension under construction",
      zoning: "IT / employment campus",
    },
    insights: [
      { id: "i1", category: "Environmental", level: "info", text: "Sunlight study is in progress for the new north blocks." },
      { id: "i2", category: "Mobility", level: "attention", text: "Peak-hour access relies on a single ring-road junction." },
      { id: "i3", category: "Development", level: "info", text: "New blocks step down toward the existing campus." },
      { id: "i4", category: "Planning", level: "info", text: "Complete daylight analysis before microclimate optimization." },
    ],
    environmental: {
      metrics: [
        { key: "heat", label: "Heat", value: "Moderate", level: 60, note: "Shaded streets recommended" },
        { key: "sunlight", label: "Sunlight", value: "7.6 hrs", level: 84, note: "Average daily on ground level" },
        { key: "wind", label: "Wind", value: "3.1 m/s", level: 58, note: "Moderate" },
        { key: "green", label: "Green Coverage", value: "20.0%", level: 55, note: "At baseline" },
        { key: "carbon", label: "Carbon", value: "33,900 t CO₂e", level: 60, note: "Estimated" },
      ],
    },
    activities: [
      { id: "a1", kind: "analysis", title: "Sunlight analysis started", time: "5 hours ago", atIso: hoursAgo(5) },
      { id: "a2", kind: "layout", title: "North blocks massing updated", time: "2 days ago", atIso: daysAgo(2) },
      { id: "a3", kind: "created", title: "Project created", time: "2 months ago", atIso: daysAgo(60) },
    ],
    nextSteps: [{ ...NEXT_ANALYSIS, primary: true }, NEXT_OPTIMIZE, NEXT_VISUALIZE],
    owner: OWNERS.arjun,
  },

  "waterfront-promenade": {
    currentStage: "optimization",
    stageProgress: 45,
    metrics: { buildings: 12, greenCoveragePct: 34.0, estimatedPopulation: 900, roadNetworkKm: 2.9 },
    siteContext: {
      center: { lat: 38.7071, lng: -9.1355 },
      terrain: "Flat riverfront with a 2 m quay wall",
      existingDevelopment: "Surface parking and disused rail sidings",
      accessibility: "Tram and rail station 350 m; ferry terminal on site",
      zoning: "Public open space with cultural uses",
    },
    insights: [
      { id: "i1", category: "Environmental", level: "positive", text: "Tree canopy provides shade on 68% of the promenade length." },
      { id: "i2", category: "Mobility", level: "positive", text: "Continuous cycle route links both ends of the waterfront." },
      { id: "i3", category: "Development", level: "info", text: "Cultural pavilions are concentrated at the ferry terminal." },
      { id: "i4", category: "Planning", level: "info", text: "Public-space tuning is 45% complete." },
    ],
    environmental: {
      metrics: [
        { key: "heat", label: "Heat", value: "Good", level: 76, note: "River breeze cooling" },
        { key: "sunlight", label: "Sunlight", value: "7.9 hrs", level: 86, note: "Average daily on ground level" },
        { key: "wind", label: "Wind", value: "4.0 m/s", level: 68, note: "Comfortable" },
        { key: "green", label: "Green Coverage", value: "34.0%", level: 86, note: "Well above baseline" },
        { key: "carbon", label: "Carbon", value: "8,740 t CO₂e", level: 88, note: "Low — landscape-led" },
      ],
    },
    activities: [
      { id: "a1", kind: "optimization", title: "Shade optimization run", time: "Yesterday", atIso: hoursAgo(26) },
      { id: "a2", kind: "layout", title: "Pavilion positions revised", time: "5 days ago", atIso: daysAgo(5) },
      { id: "a3", kind: "created", title: "Project created", time: "5 months ago", atIso: daysAgo(150) },
    ],
    nextSteps: [{ ...NEXT_OPTIMIZE, primary: true }, NEXT_VISUALIZE, NEXT_REPORT],
    owner: OWNERS.arjun,
  },

  "central-station-area": {
    currentStage: "design",
    stageProgress: 20,
    metrics: { buildings: 18, greenCoveragePct: 12.0, estimatedPopulation: 15_600, roadNetworkKm: 7.3 },
    siteContext: {
      center: { lat: 19.076, lng: 72.8777 },
      terrain: "Flat urban land bounded by rail infrastructure",
      existingDevelopment: "Dense mixed-use fabric with informal commercial frontage",
      accessibility: "Major rail interchange on site; bus terminal adjacent",
      zoning: "Transit-oriented development",
    },
    insights: [
      { id: "i1", category: "Environmental", level: "attention", text: "Green coverage is well below the 20% baseline." },
      { id: "i2", category: "Mobility", level: "positive", text: "Interchange provides exceptional transit access." },
      { id: "i3", category: "Development", level: "info", text: "Parcel definition is in progress around the station forecourt." },
      { id: "i4", category: "Planning", level: "info", text: "Balance density with new public space in the design stage." },
    ],
    environmental: {
      metrics: [
        { key: "heat", label: "Heat", value: "Warm", level: 40, note: "High urban heat load" },
        { key: "sunlight", label: "Sunlight", value: "8.3 hrs", level: 88, note: "Average daily on ground level" },
        { key: "wind", label: "Wind", value: "2.6 m/s", level: 44, note: "Low — dense fabric" },
        { key: "green", label: "Green Coverage", value: "12.0%", level: 30, note: "Below baseline" },
        { key: "carbon", label: "Carbon", value: "58,400 t CO₂e", level: 48, note: "Preliminary estimate" },
      ],
    },
    activities: [
      { id: "a1", kind: "layout", title: "Station forecourt parcels defined", time: "3 days ago", atIso: daysAgo(3) },
      { id: "a2", kind: "boundary", title: "Rail land ownership layer added", time: "2 weeks ago", atIso: daysAgo(14) },
      { id: "a3", kind: "created", title: "Project created", time: "4 weeks ago", atIso: daysAgo(28) },
    ],
    nextSteps: [NEXT_DESIGN, NEXT_ANALYSIS, NEXT_OPTIMIZE],
    owner: OWNERS.rahul,
  },

  "logistics-hub": {
    currentStage: "reports",
    stageProgress: 100,
    delivered: true,
    metrics: { buildings: 58, greenCoveragePct: 16.0, estimatedPopulation: 4_200, roadNetworkKm: 31.5 },
    siteContext: {
      center: { lat: 13.0827, lng: 80.2707 },
      terrain: "Flat coastal plain",
      existingDevelopment: "Delivered logistics and light-industry hub (completed)",
      accessibility: "Port road and national highway junction on site",
      zoning: "Industrial / logistics (delivered)",
    },
    insights: [
      { id: "i1", category: "Environmental", level: "info", text: "Green buffers screen 100% of residential edges." },
      { id: "i2", category: "Mobility", level: "positive", text: "Freight corridors separate heavy vehicles from worker access." },
      { id: "i3", category: "Development", level: "positive", text: "All phases delivered and reported." },
      { id: "i4", category: "Planning", level: "info", text: "Project is complete — no further planning actions required." },
    ],
    environmental: {
      metrics: [
        { key: "heat", label: "Heat", value: "Moderate", level: 54, note: "Large roof areas" },
        { key: "sunlight", label: "Sunlight", value: "7.0 hrs", level: 78, note: "Average daily" },
        { key: "wind", label: "Wind", value: "3.4 m/s", level: 62, note: "Coastal breeze" },
        { key: "green", label: "Green Coverage", value: "16.0%", level: 44, note: "Buffer planting" },
        { key: "carbon", label: "Carbon", value: "142,000 t CO₂e", level: 36, note: "As-built figure" },
      ],
    },
    activities: [
      { id: "a1", kind: "export", title: "Final report issued", time: "2 weeks ago", atIso: daysAgo(14) },
      { id: "a2", kind: "created", title: "Project created", time: "16 months ago", atIso: daysAgo(500) },
    ],
    nextSteps: [
      { id: "ns-view-report", title: "View Final Reports", text: "Open the issued environmental report and export package.", actionLabel: "Open Reports", to: "/app/reports", primary: true },
    ],
    owner: OWNERS.rahul,
  },

  "riverside-town-archive": {
    currentStage: "design",
    stageProgress: 40,
    metrics: { buildings: 30, greenCoveragePct: 15.0, estimatedPopulation: 5_000, roadNetworkKm: 6.8 },
    siteContext: {
      center: { lat: 23.0225, lng: 72.5714 },
      terrain: "Riverbank terrace with a flood-prone lower bench",
      existingDevelopment: "Undeveloped riverbank",
      accessibility: "Ring road 1.5 km",
      zoning: "Concept study (archived)",
    },
    insights: [
      { id: "i1", category: "Planning", level: "info", text: "This concept was archived and superseded by Riverside Quarter." },
      { id: "i2", category: "Environmental", level: "attention", text: "Lower bench lies within the 1-in-100-year flood extent." },
      { id: "i3", category: "Development", level: "info", text: "Layout was 40% complete when archived." },
    ],
    environmental: {
      metrics: [
        { key: "heat", label: "Heat", value: "Warm", level: 44, note: "Snapshot at archive time" },
        { key: "sunlight", label: "Sunlight", value: "7.4 hrs", level: 82, note: "Snapshot at archive time" },
        { key: "wind", label: "Wind", value: "2.9 m/s", level: 50, note: "Snapshot at archive time" },
        { key: "green", label: "Green Coverage", value: "15.0%", level: 40, note: "Snapshot at archive time" },
        { key: "carbon", label: "Carbon", value: "24,300 t CO₂e", level: 56, note: "Snapshot at archive time" },
      ],
    },
    activities: [
      { id: "a1", kind: "comment", title: "Project archived", detail: "Superseded by Riverside Quarter", time: "6 months ago", atIso: daysAgo(180) },
      { id: "a2", kind: "created", title: "Project created", time: "20 months ago", atIso: daysAgo(600) },
    ],
    nextSteps: [
      { id: "ns-archive", title: "Archived Project", text: "This concept is read-only. Open Riverside Quarter for the active programme.", actionLabel: "Browse Projects", to: "/app/projects", primary: true },
    ],
    owner: OWNERS.priya,
  },
};

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

/** Fallback overlay for a project that has no hand-authored details yet. */
function defaultOverlay(p: Project): DetailOverlay {
  return {
    currentStage: "design",
    stageProgress: p.progress,
    metrics: { buildings: 0, greenCoveragePct: 0, estimatedPopulation: 0, roadNetworkKm: 0 },
    siteContext: {
      center: { lat: 0, lng: 0 },
      terrain: "Not surveyed",
      existingDevelopment: "Unknown",
      accessibility: "Unknown",
    },
    insights: [],
    environmental: { metrics: [] },
    activities: [],
    nextSteps: [NEXT_DESIGN],
    owner: OWNERS.priya,
  };
}

function toDetail(p: Project): ProjectDetail {
  const o = OVERLAYS[p.id] ?? defaultOverlay(p);
  return {
    ...p,
    currentStage: o.currentStage,
    metrics: { ...o.metrics, siteAreaHa: p.siteAreaHa, environmentalScore: p.env.score },
    stages: buildStages(o.currentStage, o.stageProgress, o.delivered),
    siteContext: { ...o.siteContext, location: p.location, siteAreaHa: p.siteAreaHa },
    insights: o.insights,
    environmental: { score: p.env.score, metrics: o.environmental.metrics },
    activities: o.activities,
    nextSteps: o.nextSteps,
    owner: o.owner,
  };
}

/** Full detail records for every development project, keyed by id. */
export const DEV_PROJECT_DETAILS: Record<string, ProjectDetail> = Object.fromEntries(
  DEV_PROJECTS.map((p) => [p.id, toDetail(p)])
);

/**
 * Detail record for a project the user just created. Nothing has been modelled
 * or analysed yet, so metrics/insights are honest zeros and empties (no
 * invented numbers); next steps point to the first real action.
 */
export function buildCreatedProjectDetail(p: Project, owner: ProjectOwner): ProjectDetail {
  const pop = p.preferences?.targetPopulation ?? 0;
  const hasCenter = !!p.center;
  return {
    ...p,
    currentStage: "site-context",
    metrics: {
      siteAreaHa: p.siteAreaHa,
      buildings: 0,
      greenCoveragePct: 0,
      environmentalScore: 0,
      estimatedPopulation: pop,
      roadNetworkKm: 0,
    },
    stages: buildStages("site-context", 10),
    siteContext: {
      location: p.location,
      center: p.center ?? { lat: 0, lng: 0 },
      siteAreaHa: p.siteAreaHa,
      terrain: "Not surveyed yet",
      existingDevelopment: "To be mapped in Site & Context",
      accessibility: "To be assessed",
      zoning: p.type,
    },
    insights: [
      {
        id: "i1",
        category: "Planning",
        level: "info",
        text: hasCenter
          ? "Site centre recorded. Define the boundary to unlock context analysis."
          : "Add site coordinates and a boundary to unlock context analysis.",
      },
      {
        id: "i2",
        category: "Development",
        level: "info",
        text: pop > 0
          ? `Target population of ${pop.toLocaleString("en-US")} will guide density and housing mix.`
          : "Set a target population to guide density and housing mix.",
      },
      {
        id: "i3",
        category: "Environmental",
        level: "attention",
        text: "No environmental analysis has been run for this project yet.",
      },
    ],
    environmental: { score: 0, metrics: [] },
    activities: [{ id: "a1", kind: "created", title: "Project created", time: "Just now", atIso: p.createdAtIso }],
    nextSteps: [
      {
        id: "ns-context",
        title: "Define Site & Context",
        text: "Draw the site boundary and import context layers for the site.",
        actionLabel: "Open Planning Studio",
        to: "/app/planning",
        primary: true,
      },
      NEXT_DESIGN,
      NEXT_ANALYSIS,
    ],
    owner,
  };
}
