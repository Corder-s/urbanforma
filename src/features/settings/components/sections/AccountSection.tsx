import { useEffect, useState } from "react";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { Input } from "../../../../components/ui/Input";
import { useAuth } from "../../../auth/AuthProvider";
import { SESSION_STORAGE_KEY, getStoredSession } from "../../../auth/auth.service";
import type { AuthSession } from "../../../auth/auth.types";
import { InlineNote, SettingRow, SettingsPanel } from "../controls";
import { ConfirmAction } from "../ConfirmAction";

/**
 * Account (§2).
 *
 * Shows what the session actually is — who is signed in, whether it survives a
 * browser restart, and when it started. Password change is presented as what it
 * is today: unavailable until the authentication API exists. There is no form
 * that would have to throw the password away, and nothing here ever writes a
 * credential to localStorage.
 */
export function AccountSection() {
  const { user, logout } = useAuth();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [remembered, setRemembered] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setSession(getStoredSession());
    setRemembered(window.localStorage.getItem(SESSION_STORAGE_KEY) !== null);
  }, [user]);

  const signedInSince = session ? new Date(session.issuedAt) : null;

  return (
    <>
      <SettingsPanel title="Session" description="Your sign-in on this device.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input id="settings-account-email" label="Signed in as" value={user?.email ?? "—"} readOnly />
          <div>
            <p className="text-[13px] font-bold text-ink">Role</p>
            <div className="mt-1.5">
              <Badge tone="blue">{user?.role ?? "Unknown"}</Badge>
            </div>
            <p className="mt-1 text-[12px] leading-snug text-muted">
              Roles gate the demo workspace. Real permissions arrive with the API.
            </p>
          </div>
        </div>

        <div className="mt-2">
          <SettingRow
            label="Session persistence"
            hint={
              remembered
                ? "Stored in local storage — you stay signed in after a browser restart."
                : "Stored for this browser session only — signing out happens when the tab closes."
            }
          >
            <Badge tone={remembered ? "green" : "neutral"} dot>
              {remembered ? "Remembered on this device" : "This session only"}
            </Badge>
          </SettingRow>

          <SettingRow label="Signed in since" hint="From the session issued-at timestamp.">
            <span className="text-[13px] font-semibold text-ink">
              {signedInSince ? signedInSince.toLocaleString() : "Unknown"}
            </span>
          </SettingRow>

          <SettingRow
            label="Authentication"
            hint="Mock sign-in with rate limiting and lockout — the shape of the real JWT flow."
          >
            <Badge tone="amber">Frontend prototype</Badge>
          </SettingRow>
        </div>
      </SettingsPanel>

      <div className="mt-4">
        <SettingsPanel title="Password" description="Changing a password needs a server that can verify the old one.">
          <InlineNote tone="warn">
            Not available in this build. Password changes, resets and MFA belong to the Java Spring Boot
            authentication service; until it exists there is nothing to verify against. UrbanForma never
            stores a password in the browser — the mock sign-in only checks its length.
          </InlineNote>
          <div className="mt-3">
            <Button size="sm" variant="secondary" disabled title="Requires the authentication API">
              Change password
            </Button>
          </div>
        </SettingsPanel>
      </div>

      <div className="mt-4">
        <SettingsPanel title="Sign out" description="Ends the session on this device. Projects and saved work stay in local storage.">
          <Button size="sm" variant="secondaryDanger" onClick={() => setConfirming(true)}>
            Sign out
          </Button>
        </SettingsPanel>
      </div>

      <ConfirmAction
        open={confirming}
        title="Sign out of UrbanForma?"
        description="Your session ends on this device. Local project data, saved views and settings are kept."
        confirmLabel="Sign out"
        tone="danger"
        onConfirm={() => {
          setConfirming(false);
          logout();
        }}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
