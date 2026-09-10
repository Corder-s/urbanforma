import { useId } from "react";
import type { AnalysisOverlay, OverlayLegend } from "../types/analysis.types";

interface AnalysisLegendProps {
  overlay: AnalysisOverlay;
  /** Compact variant for the map corner. */
  compact?: boolean;
  /** Whether the map marks a suggested zone (dashed outline) for this overlay. */
  showFocus?: boolean;
  className?: string;
}

/**
 * Legend for the active overlay. Ramps get a labelled gradient bar with min /
 * max text; class legends list every class with its label; symbols (arrows,
 * outlines, dots) are named. Colour is never the only carrier of meaning.
 */
export function AnalysisLegend({ overlay, compact = false, showFocus = false, className = "" }: AnalysisLegendProps) {
  const gradId = `${useId()}-legend`;
  const { legend } = overlay;
  const labelled = legend.stops.filter((s) => s.label);
  const symbols: NonNullable<OverlayLegend["symbols"]> = [...(legend.symbols ?? []), ...(showFocus && overlay.zones.length > 0 ? [{ swatch: "dashed" as const, label: "Suggested zone to inspect", color: "#0F172A" }] : [])];
  return (
    <div className={`rounded-xl border border-line bg-white/95 shadow-soft ${compact ? "px-3 py-2" : "p-3"} ${className}`} role="group" aria-label={`Legend: ${legend.title}`}>
      <p className={`font-bold text-ink ${compact ? "text-[11.5px]" : "text-xs"}`}>{legend.title}</p>
      {legend.kind === "ramp" ? (
        <div className="mt-1.5">
          <svg width="100%" height={compact ? 8 : 10} className="block rounded-full" aria-hidden="true">
            <defs>
              <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="0">
                {legend.stops.map((s) => (
                  <stop key={s.t} offset={`${s.t * 100}%`} stopColor={s.color} />
                ))}
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" rx={4} fill={`url(#${gradId})`} />
          </svg>
          <div className="mt-1 flex items-center justify-between gap-2 text-[10.5px] font-semibold text-muted">
            <span>{legend.minLabel ?? labelled[0]?.label ?? "Low"}</span>
            <span>{legend.maxLabel ?? labelled[labelled.length - 1]?.label ?? "High"}</span>
          </div>
          <ul className="sr-only">
            {legend.stops.map((s) => (
              <li key={s.t}>{s.label || `${Math.round(s.t * 100)}%`}</li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className={`mt-1.5 ${compact ? "flex flex-wrap gap-x-3 gap-y-1" : "grid gap-1"}`}>
          {legend.stops.map((s) => (
            <li key={`${s.t}-${s.label}`} className="flex items-center gap-1.5 text-[11px] font-semibold text-ink">
              <span className="h-2.5 w-3.5 shrink-0 rounded-[3px] ring-1 ring-black/10" style={{ background: s.color }} aria-hidden="true" />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      {symbols.length > 0 && (
        <ul className={`${compact ? "mt-1.5 flex flex-wrap gap-x-3 gap-y-1" : "mt-2 grid gap-1 border-t border-line pt-2"}`}>
          {symbols.map((sym) => (
            <li key={sym.label} className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
              <Swatch kind={sym.swatch} color={sym.color} />
              {sym.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Swatch({ kind, color }: { kind: "arrow" | "outline" | "dot" | "hatch" | "dashed"; color: string }) {
  if (kind === "dashed")
    return (
      <svg width="14" height="10" viewBox="0 0 14 10" aria-hidden="true" className="shrink-0">
        <rect x="0.75" y="0.75" width="12.5" height="8.5" rx="2" fill="none" stroke={color} strokeOpacity="0.6" strokeWidth="1.2" strokeDasharray="2.5 1.8" />
      </svg>
    );
  if (kind === "arrow")
    return (
      <svg width="16" height="10" viewBox="0 0 16 10" aria-hidden="true" className="shrink-0">
        <path d="M1 5 H13 M9 1.5 L13 5 L9 8.5" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (kind === "dot") return <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white" style={{ background: color }} aria-hidden="true" />;
  if (kind === "hatch")
    return (
      <svg width="14" height="10" viewBox="0 0 14 10" aria-hidden="true" className="shrink-0">
        <rect x="0.5" y="0.5" width="13" height="9" rx="2" fill="none" stroke={color} />
        <path d="M2 8 L8 2 M6 9 L12 3" stroke={color} strokeWidth="1" />
      </svg>
    );
  return <span className="h-2.5 w-3.5 shrink-0 rounded-[3px] border-[1.5px]" style={{ borderColor: color, background: `${color}22` }} aria-hidden="true" />;
}
