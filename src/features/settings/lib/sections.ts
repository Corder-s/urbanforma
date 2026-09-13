import {
  Accessibility,
  AlertTriangle,
  Bell,
  Boxes,
  Building2,
  Database,
  EyeOff,
  Info,
  Map as MapIcon,
  Palette,
  Ruler,
  ShieldCheck,
  User,
} from "lucide-react";
import type { SettingsSectionId, SettingsSectionMeta } from "../types/settings.types";

/**
 * The settings navigation, in the order it is presented.
 *
 * Twelve panels plus a Danger Zone — every one of them maps onto a real piece
 * of state (the `AppSettings` tree, the auth session, or the local data
 * inventory), so there is no section that only exists to look complete.
 */
export const SETTINGS_SECTIONS: SettingsSectionMeta[] = [
  {
    id: "profile",
    label: "Profile",
    hint: "Name, organisation, location and time zone.",
    icon: User,
    group: "you",
  },
  {
    id: "account",
    label: "Account",
    hint: "Session, sign-in and password.",
    icon: ShieldCheck,
    group: "you",
  },
  {
    id: "accessibility",
    label: "Accessibility",
    hint: "Motion, contrast, focus and control size.",
    icon: Accessibility,
    group: "you",
  },
  {
    id: "appearance",
    label: "Appearance",
    hint: "Theme and accent colour.",
    icon: Palette,
    group: "workspace",
  },
  {
    id: "units",
    label: "Units",
    hint: "Metric or imperial, everywhere at once.",
    icon: Ruler,
    group: "workspace",
  },
  {
    id: "map",
    label: "Map & GIS",
    hint: "Default view, basemap, overlays and camera.",
    icon: MapIcon,
    group: "workspace",
  },
  {
    id: "visualization",
    label: "Visualization",
    hint: "Default scene, buildings, atmosphere and quality.",
    icon: Boxes,
    group: "workspace",
  },
  {
    id: "bim",
    label: "BIM",
    hint: "Default mode, scene, panel and layers.",
    icon: Building2,
    group: "workspace",
  },
  {
    id: "notifications",
    label: "Notifications",
    hint: "Which categories reach you.",
    icon: Bell,
    group: "workspace",
  },
  {
    id: "privacy",
    label: "Privacy",
    hint: "Analytics, usage data and personalization.",
    icon: EyeOff,
    group: "data",
  },
  {
    id: "data",
    label: "Data & storage",
    hint: "Export, inspect and clear local data.",
    icon: Database,
    group: "data",
  },
  {
    id: "about",
    label: "About",
    hint: "Version, stack and environment.",
    icon: Info,
    group: "data",
  },
  {
    id: "danger",
    label: "Danger Zone",
    hint: "Reset settings, reset data, sign out.",
    icon: AlertTriangle,
    group: "data",
  },
];

/** Nav groupings, in display order. */
export const SETTINGS_GROUPS: { id: SettingsSectionMeta["group"]; label: string }[] = [
  { id: "you", label: "You" },
  { id: "workspace", label: "Workspace defaults" },
  { id: "data", label: "Data, privacy & safety" },
];

/** Section shown when the URL carries no (or an unknown) `?section=`. */
export const DEFAULT_SETTINGS_SECTION: SettingsSectionId = "profile";

/** Sections of a given nav group. */
export function sectionsInGroup(group: SettingsSectionMeta["group"]): SettingsSectionMeta[] {
  return SETTINGS_SECTIONS.filter((section) => section.group === group);
}

/** Metadata for one section, or the default section when the id is unknown. */
export function getSectionMeta(id: SettingsSectionId): SettingsSectionMeta {
  return SETTINGS_SECTIONS.find((section) => section.id === id) ?? SETTINGS_SECTIONS[0];
}

/** Narrow a `?section=` query value; unknown or missing values fall back. */
export function toSectionId(value: string | null): SettingsSectionId {
  const match = SETTINGS_SECTIONS.find((section) => section.id === value);
  return match ? match.id : DEFAULT_SETTINGS_SECTION;
}
