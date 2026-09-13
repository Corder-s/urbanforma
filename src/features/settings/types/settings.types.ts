import type { LucideIcon } from "lucide-react";
import type { Atmosphere, BasemapId, BuildingStyle, CameraPreset, TimeOfDay } from "../../visualization/types/visualization.types";
import type { BimLayerKey, BimMode, BimSceneMode } from "../../bim/types/bim.types";

/**
 * Settings domain model (Step 18).
 *
 * One typed tree, one storage key, one provider. Nothing here duplicates a
 * preference that already lives in a module: the map / visualization / BIM
 * sections hold **defaults** that those modules read when a project has no
 * saved state of its own, so a project's own preferences always win.
 */

// ---------------------------------------------------------------------------
// Appearance
// ---------------------------------------------------------------------------

export type ThemePreference = "light" | "dark" | "system";
/** Only hues the design system already carries (brand blue, accent cyan, slate). */
export type AccentPreference = "blue" | "cyan" | "slate";

export interface AppearanceSettings {
  theme: ThemePreference;
  accent: AccentPreference;
}

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

export type UnitSystem = "metric" | "imperial";

/**
 * A single central switch. Distance, area, volume, elevation, speed and
 * temperature all follow it through `lib/units.ts` — modules format through
 * that library instead of carrying their own conversion maths.
 */
export interface UnitSettings {
  system: UnitSystem;
}

/** What a quantity is, so the formatter picks the right conversion. */
export type UnitKind = "length" | "area" | "volume" | "elevation" | "speed" | "temperature" | "siteArea";

// ---------------------------------------------------------------------------
// Map (2-D GIS) defaults
// ---------------------------------------------------------------------------

export interface MapSettings {
  /** View the GIS/3D workspace opens in when a project has no saved preference. */
  defaultMode: "2d" | "3d";
  defaultBasemap: BasemapId;
  /** Camera preset applied when the workspace first frames a project. */
  defaultCamera: CameraPreset;
  showGrid: boolean;
  showScale: boolean;
  showNorth: boolean;
  terrain: boolean;
}

// ---------------------------------------------------------------------------
// Visualization (Step 12/15) defaults
// ---------------------------------------------------------------------------

/** Renderer quality — the 3-D pixel-ratio cap. "high" is today's behaviour. */
export type RenderQuality = "performance" | "balanced" | "high";

export interface VisualizationPreferences {
  buildingStyle: BuildingStyle;
  buildingShadows: boolean;
  heightEmphasis: boolean;
  trees: boolean;
  labels: boolean;
  roadNetwork: boolean;
  atmosphere: Atmosphere;
  timeOfDay: TimeOfDay;
  quality: RenderQuality;
}

// ---------------------------------------------------------------------------
// BIM (Step 17) defaults
// ---------------------------------------------------------------------------

/** Which BIM layers a fresh workspace starts with. */
export type BimLayerPreset = "everything" | "model" | "architecture" | "structure" | "context-off";

export interface BimSettings {
  defaultMode: BimMode;
  defaultSceneMode: BimSceneMode;
  /** Right-hand panel the model workspace opens on. */
  defaultSidePanel: "properties" | "filters" | "layers";
  layerPreset: BimLayerPreset;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type NotificationCategory =
  | "projectUpdates"
  | "analysisCompleted"
  | "optimizationCompleted"
  | "reportGenerated"
  | "bimProcessing"
  | "system";

export type NotificationSettings = Record<NotificationCategory, boolean>;

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

/** `auto` follows the OS `prefers-reduced-motion` media query. */
export type MotionPreference = "auto" | "reduced";
/** `keyboard` is the browser default (`:focus-visible`); `always` also rings on click. */
export type FocusPreference = "keyboard" | "always";
export type ContrastPreference = "normal" | "high";
export type InterfaceScale = "default" | "large";

export interface AccessibilitySettings {
  motion: MotionPreference;
  contrast: ContrastPreference;
  focus: FocusPreference;
  scale: InterfaceScale;
}

// ---------------------------------------------------------------------------
// Privacy
// ---------------------------------------------------------------------------

export interface PrivacySettings {
  /** Reserved for a future product-analytics integration — nothing is sent today. */
  analytics: boolean;
  /** Reserved for server-side usage reporting — nothing is sent today. */
  usageData: boolean;
  /** When off, the app stops writing "last project" convenience keys. */
  personalization: boolean;
}

// ---------------------------------------------------------------------------
// The tree
// ---------------------------------------------------------------------------

export interface AppSettings {
  /** Bumped when the shape changes so old blobs can be migrated or discarded. */
  schemaVersion: number;
  appearance: AppearanceSettings;
  units: UnitSettings;
  map: MapSettings;
  visualization: VisualizationPreferences;
  bim: BimSettings;
  notifications: NotificationSettings;
  accessibility: AccessibilitySettings;
  privacy: PrivacySettings;
}

/** Profile fields the workspace owns locally (the account backend does not exist yet). */
export interface UserProfileExtension {
  organization?: string;
  location?: string;
  /** IANA name, e.g. "Asia/Calcutta". */
  timezone?: string;
}

// ---------------------------------------------------------------------------
// Presentation metadata (nav, labels, hints)
// ---------------------------------------------------------------------------

export type SettingsSectionId =
  | "profile"
  | "account"
  | "appearance"
  | "units"
  | "map"
  | "visualization"
  | "bim"
  | "notifications"
  | "accessibility"
  | "privacy"
  | "data"
  | "about"
  | "danger";

export interface SettingsSectionMeta {
  id: SettingsSectionId;
  label: string;
  /** One-line description shown in the nav and as the section's subtitle. */
  hint: string;
  icon: LucideIcon;
  /** Grouping used by the navigation ("You" / "Workspace" / "Data & privacy"). */
  group: "you" | "workspace" | "data";
}

/** Save state surfaced in the section footer (§19). */
export type SettingsSaveState = "idle" | "saving" | "saved" | "error";

/** A layer preset resolves to concrete BIM layer visibility. */
export type BimLayerPresetResult = Record<BimLayerKey, boolean>;
