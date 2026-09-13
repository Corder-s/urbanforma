import { Monitor, Moon, Sun } from "lucide-react";
import { useSettings } from "../../hooks/useSettings";
import { usePrefersDark } from "../../lib/useMediaQuery";
import { ChoiceGroup, InlineNote, SettingRow, SettingsPanel } from "../controls";
import type { AccentPreference, ThemePreference } from "../../types/settings.types";

/**
 * Accent swatches. Only hues the design system already carries — the tokens are
 * the single source of truth (`[data-accent]` blocks in tokens.css); these hex
 * values are the preview dots, nothing more.
 */
const ACCENTS: { value: AccentPreference; label: string; swatch: string }[] = [
  { value: "blue", label: "Brand blue", swatch: "#2563EB" },
  { value: "cyan", label: "Teal cyan", swatch: "#0E7490" },
  { value: "slate", label: "Slate", swatch: "#334155" },
];

const THEME_OPTIONS = [
  { value: "light" as ThemePreference, label: "Light", icon: <Sun size={14} aria-hidden="true" /> },
  { value: "dark" as ThemePreference, label: "Dark", icon: <Moon size={14} aria-hidden="true" /> },
  { value: "system" as ThemePreference, label: "System", icon: <Monitor size={14} aria-hidden="true" /> },
];

/**
 * Appearance (§5).
 *
 * Theme and accent are applied by `applyPreferences`, which sets
 * `data-theme` / `data-accent` on `<html>`; the whole design system re-declares
 * the same token triplets under those selectors. There is no second theme
 * engine, no per-component colour overrides and no flash on load — the provider
 * applies stored preferences at import time, before the first paint.
 */
export function AppearanceSection() {
  const { settings, patch } = useSettings();
  const prefersDark = usePrefersDark();
  const { theme, accent } = settings.appearance;

  return (
    <>
      <SettingsPanel title="Theme & accent" description="Theme and accent colour for the whole workspace.">
        <SettingRow
          label="Theme"
          hint={
            theme === "system"
              ? `Following your system preference — currently ${prefersDark ? "dark" : "light"}.`
              : "Applies immediately, in every tab of this browser."
          }
        >
          <ChoiceGroup
            ariaLabel="Theme"
            value={theme}
            options={THEME_OPTIONS}
            onChange={(next) => patch({ appearance: { theme: next } })}
          />
        </SettingRow>

        <SettingRow label="Accent colour" hint="Recolours primary actions, links, focus rings and chart highlights.">
          <ChoiceGroup
            ariaLabel="Accent colour"
            value={accent}
            options={ACCENTS.map((option) => ({
              value: option.value,
              label: option.label,
              icon: (
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-full ring-1 ring-inset ring-scrim/20"
                  style={{ backgroundColor: option.swatch }}
                />
              ),
            }))}
            onChange={(next) => patch({ appearance: { accent: next } })}
          />
        </SettingRow>

        <InlineNote>
          Contrast, motion, focus rings and control size live in{" "}
          <span className="font-bold text-ink">Accessibility</span> — they are separate concerns and are
          applied from the same token set.
        </InlineNote>
      </SettingsPanel>

      <div className="mt-4">
        <SettingsPanel title="What themes cover" description="Honest scope of the dark and high-contrast palettes.">
          <ul className="space-y-2 text-[13px] leading-relaxed text-muted">
            <li className="flex gap-2">
              <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              App chrome, navigation, panels, tables, forms, dialogs and report screens all follow the
              theme and accent.
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
              The 2-D map, 3-D city, BIM model and analysis charts keep their light drawing surface: they
              are data illustrations whose palettes are calibrated for legibility on white, so inverting
              them would misrepresent the data. They are framed by themed chrome instead.
            </li>
          </ul>
        </SettingsPanel>
      </div>
    </>
  );
}
