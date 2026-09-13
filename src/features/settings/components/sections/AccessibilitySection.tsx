import { useSettings } from "../../hooks/useSettings";
import { usePrefersReducedMotion } from "../../lib/useMediaQuery";
import { ChoiceGroup, InlineNote, SettingRow, SettingsPanel, Switch } from "../controls";
import type { FocusPreference, InterfaceScale, MotionPreference } from "../../types/settings.types";

const MOTION_OPTIONS: { value: MotionPreference; label: string }[] = [
  { value: "auto", label: "Auto (follow system)" },
  { value: "reduced", label: "Reduced" },
];

const FOCUS_OPTIONS: { value: FocusPreference; label: string }[] = [
  { value: "keyboard", label: "Keyboard only" },
  { value: "always", label: "Always" },
];

const SCALE_OPTIONS: { value: InterfaceScale; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "large", label: "Large" },
];

/**
 * Accessibility (§11).
 *
 * Each preference layers on top of the operating system instead of arguing with
 * it: `auto` motion keeps the CSS `prefers-reduced-motion` media query in
 * charge, and the panel says out loud what the system is currently asking for.
 * All four are applied as `<html>` attributes by `applyPreferences` and picked
 * up by the design system's CSS — no component reads them individually, so they
 * cannot drift out of sync with the tokens.
 */
export function AccessibilitySection() {
  const { settings, patch } = useSettings();
  const accessibility = settings.accessibility;
  const prefersReducedMotion = usePrefersReducedMotion();
  const update = (next: Partial<typeof accessibility>) => patch({ accessibility: next });

  const motionHint =
    accessibility.motion === "reduced"
      ? "Animations and transitions are minimised everywhere, regardless of the system setting."
      : prefersReducedMotion
        ? "Following your system, which requests reduced motion — animations are off."
        : "Following your system, which allows motion — animations play.";

  return (
    <>
      <SettingsPanel title="Preferences" description="Motion, contrast, focus and control size.">
        <SettingRow label="Motion" hint={motionHint}>
          <ChoiceGroup
            ariaLabel="Motion preference"
            value={accessibility.motion}
            options={MOTION_OPTIONS}
            onChange={(next) => update({ motion: next })}
          />
        </SettingRow>

        <SettingRow
          label="High contrast"
          hint="Stronger text, borders and focus colours from the high-contrast token set."
        >
          <Switch
            checked={accessibility.contrast === "high"}
            onChange={(next) => update({ contrast: next ? "high" : "normal" })}
            label="High contrast"
          />
        </SettingRow>

        <SettingRow
          label="Focus rings"
          hint={
            accessibility.focus === "always"
              ? "Every focused control shows a ring, including after a click or tap."
              : "Browser default: rings appear for keyboard navigation."
          }
        >
          <ChoiceGroup
            ariaLabel="Focus ring visibility"
            value={accessibility.focus}
            options={FOCUS_OPTIONS}
            onChange={(next) => update({ focus: next })}
          />
        </SettingRow>

        <SettingRow label="Control size" hint="Large scales the interface up by 12.5% — text, spacing and hit areas.">
          <ChoiceGroup
            ariaLabel="Interface scale"
            value={accessibility.scale}
            options={SCALE_OPTIONS}
            onChange={(next) => update({ scale: next })}
          />
        </SettingRow>

        <InlineNote>
          These never override your system preferences against your will: Auto keeps the OS in charge, and
          the app also honours <code className="font-semibold">prefers-reduced-motion</code> in CSS for
          visitors who never open this page.
        </InlineNote>
      </SettingsPanel>

      <div className="mt-4">
        <SettingsPanel title="Also built in" description="Accessibility that is always on, not a preference.">
          <ul className="space-y-2 text-[13px] leading-relaxed text-muted">
            <li className="flex gap-2">
              <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Keyboard operation for the shell, workspaces, tables, dialogs and the map — with visible
              shortcuts in each module.
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              ARIA roles and live regions on menus, switches, radiogroups, tabs and progress.
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Focus trapping and restoration in every modal, via the shared dialog behaviour hook.
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Status is never colour alone — labels and icons accompany every tone.
            </li>
          </ul>
        </SettingsPanel>
      </div>
    </>
  );
}
