import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { Input } from "../../../../components/ui/Input";
import { FormSelect } from "../../../../components/ui/FormSelect";
import { Avatar } from "../../../../components/ui/Avatar";
import { useAuth } from "../../../auth/AuthProvider";
import { updateProfile } from "../../../auth/auth.service";
import { InlineNote, SettingsPanel } from "../controls";
import { TIMEZONE_OPTIONS } from "../../lib/labels";

interface ProfileForm {
  name: string;
  organization: string;
  location: string;
  timezone: string;
}

/** The browser's own IANA zone, without throwing in odd environments. */
function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Profile (§1).
 *
 * Name, organisation, location and time zone are editable and persisted with
 * the session by `auth.service.updateProfile` — no second profile store. Email
 * and role are shown read-only because they belong to authentication, and the
 * avatar is initials-only with an honest note: file uploads need object storage
 * and an API, so there is no button here that pretends otherwise.
 */
export function ProfileSection() {
  const { user, updateUser } = useAuth();
  const detectedZone = useMemo(detectTimezone, []);

  const [form, setForm] = useState<ProfileForm>({
    name: user?.name ?? "",
    organization: user?.organization ?? "",
    location: user?.location ?? "",
    timezone: user?.timezone ?? detectedZone,
  });
  const [notice, setNotice] = useState<string | null>(null);

  const zoneOptions = useMemo(() => {
    const zones = Array.from(new Set([...TIMEZONE_OPTIONS, form.timezone, detectedZone]))
      .filter((zone) => zone.length > 0)
      .sort();
    return zones.map((zone) => ({
      value: zone,
      label: zone === detectedZone ? `${zone} — this device` : zone,
    }));
  }, [form.timezone, detectedZone]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(id);
  }, [notice]);

  if (!user) {
    return (
      <SettingsPanel title="Your details" description="Your profile travels with your session.">
        <InlineNote tone="warn">Not signed in — there is no profile to edit right now.</InlineNote>
      </SettingsPanel>
    );
  }

  const set = (field: keyof ProfileForm) => (value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const dirty =
    form.name.trim() !== user.name ||
    form.organization.trim() !== (user.organization ?? "") ||
    form.location.trim() !== (user.location ?? "") ||
    form.timezone !== (user.timezone ?? detectedZone);

  /** Revert the form to what is stored — the Cancel half of §19. */
  const onCancel = () => {
    setForm({
      name: user.name,
      organization: user.organization ?? "",
      location: user.location ?? "",
      timezone: user.timezone ?? detectedZone,
    });
    setNotice(null);
  };

  const onSave = () => {
    const session = updateProfile({
      name: form.name,
      organization: form.organization,
      location: form.location,
      timezone: form.timezone,
    });
    if (session) {
      updateUser(session.user);
      setNotice("Profile saved in this browser.");
    } else {
      setNotice("Could not save — your session is no longer valid. Sign in again.");
    }
  };

  return (
    <>
      <SettingsPanel
        title="Profile"
        description="How you appear across the workspace. Saved with your session on this device."
      >
        <div className="flex flex-wrap items-center gap-4 border-b border-line pb-4">
          <Avatar user={user} size={56} />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-extrabold text-ink">{user.name}</p>
            <p className="truncate text-[13px] text-muted">{user.email}</p>
            <div className="mt-1.5">
              <Badge tone="blue">{user.role}</Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-3 py-4 sm:grid-cols-2">
          <Input
            id="settings-profile-name"
            label="Full name"
            value={form.name}
            maxLength={120}
            onChange={(event) => set("name")(event.target.value)}
            hint="Shown in the header, on report covers and in the session."
          />
          <Input
            id="settings-profile-email"
            label="Email"
            value={user.email}
            readOnly
            hint="Managed by authentication — changing it needs the account API."
          />
          <Input
            id="settings-profile-organization"
            label="Organisation"
            value={form.organization}
            maxLength={160}
            placeholder="e.g. Delhi Urban Planning Board"
            onChange={(event) => set("organization")(event.target.value)}
            hint="Optional. Appears on report covers."
          />
          <Input
            id="settings-profile-location"
            label="Location"
            value={form.location}
            maxLength={160}
            placeholder="e.g. New Delhi, IN"
            onChange={(event) => set("location")(event.target.value)}
            hint="Optional. City or office."
          />
          <div className="sm:col-span-2">
            <FormSelect
              id="settings-profile-timezone"
              label="Time zone"
              value={form.timezone}
              options={zoneOptions}
              onChange={set("timezone")}
            />
            {form.timezone !== detectedZone && (
              <button
                type="button"
                onClick={() => set("timezone")(detectedZone)}
                className="mt-2 text-[12px] font-bold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                Use this device's zone ({detectedZone})
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <Button size="sm" onClick={onSave} disabled={!dirty}>
            Save changes
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={!dirty}>
            Cancel
          </Button>
          {notice && (
            <p role="status" className="text-[12px] font-semibold text-muted">
              {notice}
            </p>
          )}
          {!dirty && !notice && (
            <p className="text-[12px] font-medium text-faint">No unsaved changes.</p>
          )}
        </div>

        <InlineNote tone="warn">
          Profile details are stored in this browser only — the Java Spring Boot account service will own
          them (and avatar uploads) when it lands. Nothing here is sent anywhere.
        </InlineNote>
      </SettingsPanel>
    </>
  );
}
