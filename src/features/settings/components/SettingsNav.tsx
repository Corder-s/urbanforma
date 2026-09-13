import { Link, useLocation } from "react-router-dom";
import { SETTINGS_GROUPS, sectionsInGroup } from "../lib/sections";
import type { SettingsSectionId } from "../types/settings.types";

interface SettingsNavProps {
  active: SettingsSectionId;
}

/**
 * Section navigation.
 *
 * Desktop: a sticky, grouped list beside the panel. Below `lg` the same
 * destinations collapse into a horizontally scrollable chip rail, which keeps
 * the panel — the thing the user came for — above the fold at 390 px. Both are
 * real links, so `?section=` stays shareable, bookmarkable and works with
 * middle-click / open-in-new-tab.
 */
export function SettingsNav({ active }: SettingsNavProps) {
  const { pathname } = useLocation();
  const hrefFor = (id: SettingsSectionId) => `${pathname}?section=${id}`;

  return (
    <nav aria-label="Settings sections" className="lg:sticky lg:top-4">
      {/* Mobile / tablet: chip rail */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:hidden">
        {SETTINGS_GROUPS.map((group) =>
          sectionsInGroup(group.id).map((section) => (
            <Link
              key={section.id}
              to={hrefFor(section.id)}
              aria-current={active === section.id ? "true" : undefined}
              className={[
                "inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-bold transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                active === section.id
                  ? "border-primary bg-primary text-on-brand shadow-soft"
                  : "border-line bg-surface text-muted hover:text-ink",
              ].join(" ")}
            >
              <section.icon size={14} aria-hidden="true" />
              {section.label}
            </Link>
          ))
        )}
      </div>

      {/* Desktop: grouped list */}
      <div className="hidden space-y-5 lg:block">
        {SETTINGS_GROUPS.map((group) => (
          <div key={group.id}>
            <p className="px-2 pb-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-faint">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {sectionsInGroup(group.id).map((section) => {
                const selected = active === section.id;
                return (
                  <li key={section.id}>
                    <Link
                      to={hrefFor(section.id)}
                      aria-current={selected ? "true" : undefined}
                      className={[
                        "flex items-start gap-2.5 rounded-xl px-2.5 py-2 transition",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                        selected ? "bg-primary/10 text-primary" : "text-muted hover:bg-surface-2 hover:text-ink",
                      ].join(" ")}
                    >
                      <section.icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-bold leading-snug">{section.label}</span>
                        <span className="mt-0.5 block text-[11.5px] leading-snug text-faint">{section.hint}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
