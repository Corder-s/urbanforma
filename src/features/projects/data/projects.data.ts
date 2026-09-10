import type { Project } from "../project.types";

/**
 * Canonical development dataset for projects. This is the single source the
 * Projects page AND the dashboard draw from. It is replaced in a later step by
 * the project service backed by GET /api/projects (Spring Boot → PostGIS).
 *
 * ISO timestamps are derived relative to "now" so the Last-Updated filter and
 * date sorting always behave realistically in development.
 */

const hoursAgo = (h: number): string => new Date(Date.now() - h * 3_600_000).toISOString();
const daysAgo = (d: number): string => hoursAgo(d * 24);

export const DEV_PROJECTS: Project[] = [
  {
    id: "smart-city-masterplan",
    name: "Smart City Masterplan",
    location: "Delhi NCR",
    description:
      "A 51-hectare mixed-use smart district integrating transit, environmental analysis and 3D massing for a low-carbon urban core.",
    type: "Masterplan",
    status: "Analysis",
    siteAreaHa: 51.0,
    progress: 72,
    updatedAt: "12 minutes ago",
    updatedAtIso: hoursAgo(0.2),
    createdAtIso: daysAgo(120),
    stage: "Environmental Analysis",
    thumbVariant: 0,
    env: { heat: "Good", sunlight: "7.2 hrs", wind: "4.2 m/s", greenCoverage: "22.3%", carbon: "71,928 t CO₂e", score: 84 },
  },
  {
    id: "marina-south-innovation-district",
    name: "Marina South Innovation District",
    location: "Singapore",
    description:
      "Waterfront innovation district with resilient public realm, stormwater strategy and active-mobility networks.",
    type: "Urban Design",
    status: "Planning",
    siteAreaHa: 24.5,
    progress: 64,
    updatedAt: "1 hour ago",
    updatedAtIso: hoursAgo(1),
    createdAtIso: daysAgo(90),
    stage: "Massing & Form",
    thumbVariant: 1,
    env: { heat: "Moderate", sunlight: "6.8 hrs", wind: "3.6 m/s", greenCoverage: "18.0%", carbon: "40,210 t CO₂e", score: 78 },
  },
  {
    id: "riverside-quarter",
    location: "Copenhagen",
    name: "Riverside Quarter",
    description:
      "Harbor-adjacent living quarter optimizing daylight, wind comfort and green coverage across multiple scenarios.",
    type: "Development",
    status: "Optimization",
    siteAreaHa: 12.8,
    progress: 88,
    updatedAt: "3 hours ago",
    updatedAtIso: hoursAgo(3),
    createdAtIso: daysAgo(200),
    stage: "Scenario Optimization",
    thumbVariant: 2,
    env: { heat: "Good", sunlight: "5.4 hrs", wind: "5.1 m/s", greenCoverage: "31.0%", carbon: "18,640 t CO₂e", score: 88 },
  },
  {
    id: "greenfield-new-town",
    name: "Greenfield New Town",
    location: "Pune",
    description:
      "Large greenfield town structure plan establishing land use, transit corridors and a phased delivery framework.",
    type: "Masterplan",
    status: "Planning",
    siteAreaHa: 140.0,
    progress: 34,
    updatedAt: "Yesterday",
    updatedAtIso: hoursAgo(20),
    createdAtIso: daysAgo(45),
    stage: "Site & Context",
    thumbVariant: 3,
    env: { heat: "Warm", sunlight: "8.1 hrs", wind: "2.8 m/s", greenCoverage: "14.5%", carbon: "120,800 t CO₂e", score: 66 },
  },
  {
    id: "harbor-living",
    name: "Harbor Living",
    location: "Rotterdam",
    description:
      "Completed harbor residential development delivered with BIM export and full environmental reporting.",
    type: "Development",
    status: "Completed",
    siteAreaHa: 9.4,
    progress: 100,
    updatedAt: "2 days ago",
    updatedAtIso: daysAgo(2),
    createdAtIso: daysAgo(420),
    stage: "Delivered",
    thumbVariant: 4,
    env: { heat: "Good", sunlight: "6.0 hrs", wind: "4.8 m/s", greenCoverage: "27.6%", carbon: "11,300 t CO₂e", score: 90 },
  },
  {
    id: "tech-park-expansion",
    name: "Tech Park Expansion",
    location: "Bengaluru",
    description:
      "Employment campus expansion exploring building form, microclimate and pedestrian-friendly public streets.",
    type: "Site Planning",
    status: "Analysis",
    siteAreaHa: 18.2,
    progress: 57,
    updatedAt: "5 hours ago",
    updatedAtIso: hoursAgo(5),
    createdAtIso: daysAgo(60),
    stage: "Sunlight & Daylight",
    thumbVariant: 1,
    env: { heat: "Moderate", sunlight: "7.6 hrs", wind: "3.1 m/s", greenCoverage: "20.0%", carbon: "33,900 t CO₂e", score: 74 },
  },
  {
    id: "waterfront-promenade",
    name: "Waterfront Promenade",
    location: "Lisbon",
    description:
      "Public-space led urban design reconnecting the city to the Tagus with parks, paths and cultural venues.",
    type: "Urban Design",
    status: "Optimization",
    siteAreaHa: 7.6,
    progress: 81,
    updatedAt: "Yesterday",
    updatedAtIso: hoursAgo(26),
    createdAtIso: daysAgo(150),
    stage: "Public Space Tuning",
    thumbVariant: 4,
    env: { heat: "Good", sunlight: "7.9 hrs", wind: "4.0 m/s", greenCoverage: "34.0%", carbon: "8,740 t CO₂e", score: 86 },
  },
  {
    id: "central-station-area",
    name: "Central Station Area",
    location: "Mumbai",
    description:
      "Transit-oriented development masterplan around a major interchange, balancing density with public space.",
    type: "Masterplan",
    status: "Planning",
    siteAreaHa: 33.0,
    progress: 22,
    updatedAt: "3 days ago",
    updatedAtIso: daysAgo(3),
    createdAtIso: daysAgo(28),
    stage: "Parcel Definition",
    thumbVariant: 0,
    env: { heat: "Warm", sunlight: "8.3 hrs", wind: "2.6 m/s", greenCoverage: "12.0%", carbon: "58,400 t CO₂e", score: 62 },
  },
  {
    id: "logistics-hub",
    name: "Logistics Hub Masterplan",
    location: "Chennai",
    description:
      "Regional logistics and light-industry masterplan with freight corridors, services and green buffers.",
    type: "Masterplan",
    status: "Completed",
    siteAreaHa: 96.0,
    progress: 100,
    updatedAt: "2 weeks ago",
    updatedAtIso: daysAgo(14),
    createdAtIso: daysAgo(500),
    stage: "Delivered",
    thumbVariant: 3,
    env: { heat: "Moderate", sunlight: "7.0 hrs", wind: "3.4 m/s", greenCoverage: "16.0%", carbon: "142,000 t CO₂e", score: 70 },
  },
  {
    id: "riverside-town-archive",
    name: "Riverside Town Concept",
    location: "Ahmedabad",
    description:
      "Archived early-stage concept study superseded by the Riverside Quarter program.",
    type: "Site Planning",
    status: "Archived",
    siteAreaHa: 15.0,
    progress: 40,
    updatedAt: "6 months ago",
    updatedAtIso: daysAgo(180),
    createdAtIso: daysAgo(600),
    stage: "Archived",
    thumbVariant: 2,
    env: { heat: "Warm", sunlight: "7.4 hrs", wind: "2.9 m/s", greenCoverage: "15.0%", carbon: "24,300 t CO₂e", score: 68 },
  },
];

/** Distinct locations for the Location filter, sorted alphabetically. */
export const PROJECT_LOCATIONS: string[] = Array.from(
  new Set(DEV_PROJECTS.map((p) => p.location))
).sort((a, b) => a.localeCompare(b));
