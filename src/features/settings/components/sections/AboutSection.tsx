import { version as reactVersion } from "react";
import { Badge } from "../../../../components/ui/Badge";
import { SETTINGS_SCHEMA_VERSION, SETTINGS_STORAGE_KEY } from "../../services/settings.service";
import { InlineNote, SettingsPanel } from "../controls";

/**
 * About (§14).
 *
 * Version comes from `package.json` at build time (`__APP_VERSION__`), the
 * environment from Vite's mode, and the React version from React itself — so
 * the panel cannot go stale or be hand-edited into a lie. No tokens, keys or
 * internal metadata are shown.
 */
export function AboutSection() {
  // Defensive: both of these are injected at build time (Vite `define` and
  // `import.meta.env`), so a dev server started before the config changed, or
  // any non-Vite host, would otherwise throw. About must never crash the page.
  const version = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev build";
  const mode = import.meta.env?.MODE ?? "development";
  const rows: { label: string; value: string; tone?: "neutral" | "amber" | "green" }[] = [
    { label: "Application", value: "UrbanForma" },
    { label: "Version", value: version },
    { label: "Environment", value: mode, tone: mode === "production" ? "green" : "amber" },
    { label: "Frontend", value: `React ${reactVersion} · Vite · TypeScript (strict)` },
    { label: "Rendering", value: "three.js (WebGL) for 3-D · SVG for the 2-D map" },
    { label: "Storage", value: "Browser localStorage — prototype, per device", tone: "amber" },
    { label: "Backend", value: "Not connected", tone: "amber" },
    { label: "Settings schema", value: `v${SETTINGS_SCHEMA_VERSION} · ${SETTINGS_STORAGE_KEY}` },
  ];

  return (
    <>
      <SettingsPanel title="About this build" description="What you are running, exactly.">
        <dl className="divide-y divide-line">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <dt className="text-[12.5px] font-bold text-muted">{row.label}</dt>
              <dd className="min-w-0 text-[13px] font-semibold text-ink sm:text-right">
                {row.tone ? <Badge tone={row.tone}>{row.value}</Badge> : row.value}
              </dd>
            </div>
          ))}
        </dl>
        <InlineNote>
          Authentication is a mock with rate limiting and lockout, and every dataset is generated or bundled
          in the frontend. No credentials, tokens or internal metadata are displayed or stored beyond the
          session placeholder.
        </InlineNote>
      </SettingsPanel>

      <div className="mt-4">
        <SettingsPanel title="Modules" description="What ships in this frontend today.">
          <ul className="grid gap-2 text-[13px] leading-relaxed text-muted sm:grid-cols-2">
            {[
              "Projects & dashboard",
              "Planning Studio (2-D drawing)",
              "GIS map & 3-D city visualization",
              "Analysis (sunlight, wind, noise, walkability)",
              "Scenario optimization",
              "Reports (screen, print and PDF-ready)",
              "BIM model workspace & coordination",
              "Settings, theming and units",
            ].map((module) => (
              <li key={module} className="flex gap-2">
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {module}
              </li>
            ))}
          </ul>
          <InlineNote tone="warn">
            Next after this frontend: a performance pass, then the Java Spring Boot + PostgreSQL backend that
            replaces the mock auth, the generated datasets and this browser-local storage.
          </InlineNote>
        </SettingsPanel>
      </div>
    </>
  );
}
