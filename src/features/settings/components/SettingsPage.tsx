import type { ComponentType } from "react";
import { AlertTriangle } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { PageContainer } from "../../../components/layout/PageContainer";
import { PageHeader } from "../../../components/layout/PageHeader";
import { SettingsNav } from "./SettingsNav";
import { SaveIndicator } from "./controls";
import { getSectionMeta, toSectionId } from "../lib/sections";
import { useSettings } from "../hooks/useSettings";
import { AboutSection } from "./sections/AboutSection";
import { AccessibilitySection } from "./sections/AccessibilitySection";
import { AccountSection } from "./sections/AccountSection";
import { AppearanceSection } from "./sections/AppearanceSection";
import { BimSection } from "./sections/BimSection";
import { DangerSection } from "./sections/DangerSection";
import { DataSection } from "./sections/DataSection";
import { MapSection } from "./sections/MapSection";
import { NotificationsSection } from "./sections/NotificationsSection";
import { PrivacySection } from "./sections/PrivacySection";
import { ProfileSection } from "./sections/ProfileSection";
import { UnitsSection } from "./sections/UnitsSection";
import { VisualizationSection } from "./sections/VisualizationSection";
import type { SettingsSectionId } from "../types/settings.types";

/** Which panel a section id renders. Adding a section means adding one entry. */
const SECTION_COMPONENTS: Record<SettingsSectionId, ComponentType> = {
  profile: ProfileSection,
  account: AccountSection,
  accessibility: AccessibilitySection,
  appearance: AppearanceSection,
  units: UnitsSection,
  map: MapSection,
  visualization: VisualizationSection,
  bim: BimSection,
  notifications: NotificationsSection,
  privacy: PrivacySection,
  data: DataSection,
  about: AboutSection,
  danger: DangerSection,
};

/**
 * Settings (§16) — `/app/settings?section=<id>`.
 *
 * Two columns from `lg` up (navigation beside the active panel) and a
 * scrollable chip rail above the panel below that, so the controls stay usable
 * at 390 px without a hamburger inside a hamburger. The active section lives in
 * the URL, which makes every panel linkable, bookmarkable and restorable after
 * a reload — and means Back returns you to the section you came from.
 *
 * The whole route is lazy and pulls in no 3-D engine, GIS renderer, PDF writer
 * or BIM model: only the settings feature, the auth session and shared UI.
 */
export function SettingsPage() {
  const { saveState, recovered, status } = useSettings();
  const [searchParams] = useSearchParams();
  const section = toSectionId(searchParams.get("section"));
  const meta = getSectionMeta(section);
  const SectionIcon = meta.icon;
  const Section = SECTION_COMPONENTS[section];

  return (
    <PageContainer>
      <PageHeader
        icon={meta.icon}
        title="Settings"
        description="Appearance, units, workspace defaults, notifications, accessibility, privacy and your data."
        actions={<SaveIndicator state={saveState} />}
      />

      {recovered && (
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
          <p className="text-[13px] leading-relaxed text-ink">
            <strong className="font-bold">Saved settings could not be read</strong> — the stored copy was
            damaged or written by an incompatible version, so the defaults were restored. Nothing else in
            the workspace was affected.
          </p>
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(15rem,17rem)_minmax(0,1fr)] lg:gap-6">
        <SettingsNav active={section} />

        <div
          aria-busy={status === "loading"}
          role="region"
          aria-labelledby="settings-section-heading"
          className="min-w-0"
        >
          <header className="mb-3 flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <SectionIcon size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id="settings-section-heading" className="text-[17px] font-extrabold tracking-tight text-ink">
                {meta.label}
              </h2>
              <p className="mt-0.5 text-[13px] leading-snug text-muted">{meta.hint}</p>
            </div>
          </header>

          <Section />
        </div>
      </div>
    </PageContainer>
  );
}
