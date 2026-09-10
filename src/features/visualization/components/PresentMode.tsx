import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { getTheme, type ThemeDef } from "../data/presentation.data";
import type { VisualizationState } from "../hooks/useVisualizationState";
import { formatSiteArea } from "../../projects/project.service";
import { MetricStrip } from "./PresentationMetrics";
import { VisualizationLegend } from "./VisualizationLegend";

interface PresentModeProps {
  state: VisualizationState;
  location?: string;
  /** Slide navigation chrome (presentation view). */
  footer?: ReactNode;
  /** Slide caption shown in the presentation view. */
  caption?: { index: number; total: number; title: string; description: string } | null;
}

/**
 * Present-mode chrome laid over the shared viewport: title block, scenario
 * badge, metric strip, legend and north indicator, styled by the presentation
 * theme. Pointer events only land on the cards, so the visualization
 * underneath stays navigable. The darker "Presentation" theme tints only the
 * viewport (see VisualizationViewport), never the app.
 */
export function PresentMode({ state, location, footer, caption }: PresentModeProps) {
  const { presentation, viewMode, data, settings, selectedScenarioOption, currentPlanOption, scenarioLabel, selectedMetrics } = state;
  const p = presentation.presentation;
  const theme = getTheme(p?.theme ?? "urban");
  const ps = p?.settings;
  const option = selectedScenarioOption ?? currentPlanOption;

  // collapse the chrome on narrow viewports regardless of the window size
  const [narrow, setNarrow] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const measure = useCallback(() => {
    const w = boxRef.current?.clientWidth ?? 0;
    setNarrow(w > 0 && w < 640);
  }, []);
  useEffect(() => {
    measure();
    if (typeof ResizeObserver === "undefined" || !boxRef.current) return;
    const ro = new ResizeObserver(measure);
    ro.observe(boxRef.current);
    return () => ro.disconnect();
  }, [measure]);

  if (!data || !p || !ps) return null;

  const heading = ps.showTitle && (
    <div className={`${theme.card} max-w-[min(420px,100%)] px-4 py-2.5`}>
      <h2 className={`truncate text-[15px] font-extrabold leading-tight sm:text-[17px] ${theme.title}`}>{p.title || data.projectName}</h2>
      {p.subtitle && <p className={`mt-0.5 truncate text-[11.5px] font-semibold sm:text-[12.5px] ${theme.subtitle}`}>{p.subtitle}</p>}
      <p className={`mt-1 truncate text-[10.5px] font-semibold ${theme.caption}`}>
        {location ? `${location} · ` : ""}
        {formatSiteArea(data.summary.siteAreaHa)}
      </p>
    </div>
  );

  const scenario = ps.showScenario && option && (
    <div className={`${theme.card} inline-flex max-w-full items-center gap-2 px-3 py-1.5`} aria-label={`Scenario: ${scenarioLabel}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${option.id === null ? "bg-primary" : option.preferred ? "bg-success" : "bg-accent"}`} aria-hidden="true" />
      <span className={`truncate text-[12px] font-bold ${theme.value}`}>{scenarioLabel}</span>
      {option.id !== null && !narrow && <span className={`text-[10.5px] font-semibold ${theme.caption}`}>Generated planning scenario</span>}
    </div>
  );

  return (
    <div ref={boxRef} className="pointer-events-none absolute inset-0" data-theme={theme.id}>
      <div className={`grid h-full grid-rows-[auto_1fr_auto] gap-2 ${narrow ? "p-2" : "p-4 sm:p-5"}`}>
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="pointer-events-auto flex min-w-0 flex-col items-start gap-2">
            {heading}
            {narrow && scenario}
          </div>
          <div className="pointer-events-auto flex shrink-0 flex-col items-end gap-2">
            {!narrow && scenario}
            {ps.showNorthArrow && <NorthIndicator theme={theme} heading={viewMode === "3d" ? headingOf(state.pose3dValue) : 0} />}
          </div>
        </div>
        <div />
        <div className={`flex min-w-0 items-end justify-between gap-2 ${footer ? "pb-12" : ""}`}>
          <div className="pointer-events-auto flex min-w-0 flex-col items-start gap-2">
            {caption && (
              <div className={`${theme.card} max-w-[min(520px,100%)] px-4 py-2`}>
                <p className={`text-[10.5px] font-bold uppercase tracking-widest ${theme.caption}`}>
                  Slide {caption.index} of {caption.total}
                </p>
                <p className={`text-[14px] font-extrabold leading-tight ${theme.title}`}>{caption.title}</p>
                {caption.description && !narrow && <p className={`mt-0.5 line-clamp-2 text-[12px] leading-snug ${theme.subtitle}`}>{caption.description}</p>}
              </div>
            )}
            {ps.showMetrics && option && selectedMetrics.length > 0 && <MetricStrip option={option} ids={selectedMetrics} theme={theme} compact={narrow} />}
          </div>
          <div className="pointer-events-auto flex shrink-0 flex-col items-end gap-2">{ps.showLegend && !narrow && <VisualizationLegend buildingStyle={settings.buildingStyle} theme={theme} />}</div>
        </div>
      </div>
      {footer}
      <p className="sr-only" aria-live="polite">
        {`Present mode. ${p.title || data.projectName}. ${scenarioLabel}. ${viewMode === "3d" ? "3D city" : "2D plan"}.`}
      </p>
    </div>
  );
}

function headingOf(pose: { position: [number, number, number]; target: [number, number, number] } | null): number {
  if (!pose) return 0;
  const dx = pose.target[0] - pose.position[0];
  const dz = pose.target[2] - pose.position[2];
  if (Math.abs(dx) < 1e-3 && Math.abs(dz) < 1e-3) return 0;
  // camera look direction on the ground plane; north is −z (map north = −y)
  return (Math.atan2(dx, -dz) * 180) / Math.PI;
}

function NorthIndicator({ theme, heading }: { theme: ThemeDef; heading: number }) {
  return (
    <div className={`${theme.card} grid h-10 w-10 place-items-center`} role="img" aria-label={`North indicator${heading ? `, view rotated ${Math.round(heading)} degrees` : ""}`}>
      <svg width="24" height="24" viewBox="0 0 26 26" aria-hidden="true" style={{ transform: `rotate(${-heading}deg)` }} className="transition-transform duration-300 motion-reduce:transition-none">
        <path d="M13 3 L17 15 L13 12.5 L9 15 Z" fill="#2563EB" />
        <path d="M13 12.5 L17 15 L13 23 L9 15 Z" fill={theme.id === "presentation" ? "#94A3B8" : "#CBD5E1"} />
        <text x="13" y="9.5" textAnchor="middle" fontSize="6" fontWeight="800" fill="#FFFFFF" style={{ fontFamily: "Inter, sans-serif" }}>
          N
        </text>
      </svg>
    </div>
  );
}
