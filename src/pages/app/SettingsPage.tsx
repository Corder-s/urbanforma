import { SettingsPage as SettingsWorkspace } from "../../features/settings/components/SettingsPage";

/**
 * /app/settings?section=<id> — workspace settings.
 *
 * The page is a thin wrapper so the router stays the only place that knows
 * about URLs, while the settings feature owns its sections, state and storage.
 * Scrolling belongs to the shell's main element: this page is ordinary document
 * flow (unlike the full-height workspaces), which is what a long form of
 * preferences wants.
 */
export function SettingsPage() {
  return <SettingsWorkspace />;
}
