import { NOTIFICATION_CATEGORIES } from "../../services/settings.service";
import { useSettings } from "../../hooks/useSettings";
import { NOTIFICATION_LABELS } from "../../lib/labels";
import { Button } from "../../../../components/ui/Button";
import { InlineNote, SettingRow, SettingsPanel, Switch } from "../controls";
import type { NotificationSettings } from "../../types/settings.types";

/**
 * Notifications (§10).
 *
 * Six categories, one switch each. The header bell already filters its preview
 * items through these flags, so the preference has a visible effect today; when
 * a notification service exists the same categories decide what reaches the
 * user. No second notification system is introduced here.
 */
export function NotificationsSection() {
  const { settings, patch } = useSettings();
  const notifications = settings.notifications;
  const enabled = NOTIFICATION_CATEGORIES.filter((category) => notifications[category]).length;

  const setAll = (value: boolean) => {
    // Written out rather than built by casting an empty object: the compiler
    // checks every category is present, so a new one cannot be silently missed.
    const next: NotificationSettings = {
      projectUpdates: value,
      analysisCompleted: value,
      optimizationCompleted: value,
      reportGenerated: value,
      bimProcessing: value,
      system: value,
    };
    patch({ notifications: next });
  };

  return (
    <SettingsPanel
      title="Categories"
      description="Which categories are allowed to reach you."
      aside={
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
            {enabled} of {NOTIFICATION_CATEGORIES.length} on
          </span>
          <Button size="sm" variant="ghost" onClick={() => setAll(true)}>
            All on
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAll(false)}>
            All off
          </Button>
        </div>
      }
    >
      {NOTIFICATION_CATEGORIES.map((category) => {
        const copy = NOTIFICATION_LABELS[category];
        return (
          <SettingRow key={category} label={copy.label} hint={copy.hint}>
            <Switch
              checked={notifications[category]}
              onChange={(next) => patch({ notifications: { [category]: next } })}
              label={copy.label}
            />
          </SettingRow>
        );
      })}

      <InlineNote>
        UrbanForma has no notification service yet — the bell in the header shows preview items and hides
        the ones whose category is switched off here. Delivery (email, push, in-app) arrives with the
        backend, and these categories are the contract it will honour.
      </InlineNote>
    </SettingsPanel>
  );
}
