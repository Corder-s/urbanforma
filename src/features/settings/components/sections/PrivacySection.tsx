import { useSettings } from "../../hooks/useSettings";
import { InlineNote, SettingRow, SettingsPanel, Switch } from "../controls";
import type { PrivacySettings } from "../../types/settings.types";

/**
 * Privacy (§12).
 *
 * Stated plainly rather than dressed up as a consent centre: this build has no
 * server, so nothing leaves the browser. Two switches are reservations for the
 * analytics and usage integrations that a backend would bring; the third has a
 * real effect today — with personalization off, modules stop writing the
 * "last project" convenience keys that reopen where you left off.
 */
export function PrivacySection() {
  const { settings, patch } = useSettings();
  const privacy = settings.privacy;
  const update = (next: Partial<PrivacySettings>) => patch({ privacy: next });

  return (
    <>
      <SettingsPanel title="Controls" description="What the workspace remembers, and what it would share.">
        <SettingRow
          label="Personalization"
          hint="Remembers the last project you opened in each module so it can reopen there."
        >
          <Switch
            checked={privacy.personalization}
            onChange={(next) => update({ personalization: next })}
            label="Personalization"
          />
        </SettingRow>

        <SettingRow
          label="Product analytics"
          hint="Reserved. No analytics library is loaded in this build, so nothing is collected."
        >
          <Switch
            checked={privacy.analytics}
            onChange={(next) => update({ analytics: next })}
            label="Product analytics"
            disabled
          />
        </SettingRow>

        <SettingRow
          label="Usage data"
          hint="Reserved. Server-side usage reporting begins when the API exists."
        >
          <Switch checked={privacy.usageData} onChange={(next) => update({ usageData: next })} label="Usage data" disabled />
        </SettingRow>

        <InlineNote tone="warn">
          Frontend-only: UrbanForma currently runs entirely in your browser. There is no telemetry, no
          third-party request and no cookie — so these switches control local behaviour, not data sharing.
          They are kept honest and disabled where they cannot yet do anything, rather than pretending to
          withhold data that was never collected.
        </InlineNote>
      </SettingsPanel>

      <div className="mt-4">
        <SettingsPanel title="What is stored locally" description="Everything this prototype writes, and where.">
          <ul className="space-y-2 text-[13px] leading-relaxed text-muted">
            <li className="flex gap-2">
              <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>
                <strong className="font-bold text-ink">Your session</strong> — user id, name, email, role and
                a placeholder token, in local or session storage depending on "remember me". No password is
                ever stored.
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>
                <strong className="font-bold text-ink">Your work</strong> — drawings, scenarios, analysis
                runs, saved views, reports, BIM records and settings, all under{" "}
                <code className="font-semibold">urbanforma.*</code> keys.
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>
                Inspect, export or delete any of it in{" "}
                <strong className="font-bold text-ink">Data &amp; storage</strong>.
              </span>
            </li>
          </ul>
        </SettingsPanel>
      </div>
    </>
  );
}
