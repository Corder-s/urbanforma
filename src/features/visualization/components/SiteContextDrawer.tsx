import { X } from "lucide-react";
import type { VisualizationState } from "../hooks/useVisualizationState";

interface SiteContextDrawerProps {
  state: VisualizationState;
  onClose?: () => void;
  idPrefix?: string;
}

function num(n: number): string {
  return n.toLocaleString("en-US");
}

/** Site context summary (headline demo metrics of the whole site). */
export function SiteContextDrawer({ state, onClose, idPrefix = "sitectx" }: SiteContextDrawerProps) {
  const s = state.data?.summary;
  const source = state.data?.source;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-4">
        <h2 id={`${idPrefix}-title`} className="text-[11px] font-bold uppercase tracking-widest text-faint">
          Site context
        </h2>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close site context" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
            <X size={16} />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3" aria-labelledby={`${idPrefix}-title`}>
        {s ? (
          <>
            <p className="text-[15px] font-extrabold text-ink">{state.data?.projectName}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2">
              {[
                ["Site Area", `${s.siteAreaHa.toFixed(1)} ha`],
                ["Buildings", num(s.buildings)],
                ["Green Coverage", `${s.greenCoveragePct.toFixed(1)}%`],
                ["Road Network", `${s.roadNetworkKm.toFixed(1)} km`],
                ["Water Area", `${s.waterAreaHa.toFixed(1)} ha`],
                ["Population Capacity", num(s.populationCapacity)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-line bg-canvas px-3 py-2">
                  <dt className="text-[10.5px] font-bold uppercase tracking-wider text-faint">{k}</dt>
                  <dd className="mt-0.5 text-[15px] font-extrabold tabular-nums text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <dl className="mt-3 divide-y divide-line rounded-xl border border-line">
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <dt className="text-[12.5px] text-muted">Coordinates</dt>
                <dd className="text-right text-[12.5px] font-bold text-ink">Demo coordinates</dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <dt className="text-[12.5px] text-muted">Coordinate System</dt>
                <dd className="text-right text-[12.5px] font-bold text-ink">{s.coordinateSystem}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <dt className="text-[12.5px] text-muted">Data source</dt>
                <dd className="text-right text-[12.5px] font-bold text-ink">{source?.kind === "local-plan" ? "Local plan" : "Demo dataset"}</dd>
              </div>
            </dl>
            <p className="mt-3 text-[11px] leading-snug text-faint">{source?.note}. Values are indicative and not survey-grade.</p>
          </>
        ) : (
          <p className="text-[13px] text-muted">Load a project to see its site context.</p>
        )}
      </div>
    </div>
  );
}
