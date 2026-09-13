import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { VisualizationState } from "../hooks/useVisualizationState";
import { BuildingStyleControl } from "./BuildingStyleControl";
import { CameraPresets } from "./CameraPresets";
import { PanelHeader } from "./controls";
import { ScenarioSelector } from "./ScenarioSelector";
import { SceneSettings } from "./SceneSettings";
import { TimeOfDayControl } from "./TimeOfDayControl";

interface SceneControlsProps {
  state: VisualizationState;
  onClose?: () => void;
  idPrefix?: string;
  /** Section to expand first (deep links from the toolbar / phone bar). */
  initialOpen?: SectionId;
  /** Inside the tabbed side panel: no own header. */
  embedded?: boolean;
}

export type SectionId = "scenario" | "camera" | "time" | "style" | "settings";

const SECTIONS: { id: SectionId; title: string }[] = [
  { id: "scenario", title: "Scenario" },
  { id: "camera", title: "Camera Presets" },
  { id: "time", title: "Time of Day & Atmosphere" },
  { id: "style", title: "Building Appearance" },
  { id: "settings", title: "Scene Settings" },
];

/**
 * Explore-mode side panel: scenario, camera presets, time of day /
 * atmosphere, building appearance and scene settings as collapsible
 * sections so the column stays compact.
 */
export function SceneControls({ state, onClose, idPrefix = "scene", initialOpen = "scenario", embedded = false }: SceneControlsProps) {
  const uid = useId();
  const [open, setOpen] = useState<Record<SectionId, boolean>>({ scenario: true, camera: true, time: false, style: false, settings: false, [initialOpen]: true });
  const toggle = (id: SectionId) => setOpen((o) => ({ ...o, [id]: !o[id] }));
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      {embedded ? (
        <h2 id={`${idPrefix}-title-${uid}`} className="sr-only">
          Scene controls
        </h2>
      ) : (
        <PanelHeader id={`${idPrefix}-title-${uid}`} title="Scene" onClose={onClose} closeLabel="Close scene panel">
          <span className="mr-1 hidden max-w-[140px] truncate rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] font-bold text-muted sm:inline">{state.scenarioLabel}</span>
        </PanelHeader>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto" aria-labelledby={`${idPrefix}-title-${uid}`}>
        {SECTIONS.map((s) => {
          const expanded = open[s.id];
          const panelId = `${idPrefix}-${s.id}-panel-${uid}`;
          const btnId = `${idPrefix}-${s.id}-btn-${uid}`;
          return (
            <section key={s.id} className="border-b border-line" aria-labelledby={btnId}>
              <h3 className="m-0">
                <button id={btnId} type="button" aria-expanded={expanded} aria-controls={panelId} onClick={() => toggle(s.id)} className="flex h-10 w-full items-center justify-between gap-2 px-4 text-left text-[11px] font-bold uppercase tracking-widest text-faint hover:bg-surface-2/60 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/20">
                  {s.title}
                  <ChevronDown size={14} className={`shrink-0 transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
              </h3>
              {expanded && (
                <div id={panelId} className="px-4 pb-3">
                  {s.id === "scenario" && <ScenarioSelector state={state} />}
                  {s.id === "camera" && <CameraPresets state={state} />}
                  {s.id === "time" && <TimeOfDayControl state={state} idPrefix={`${idPrefix}-tod`} />}
                  {s.id === "style" && <BuildingStyleControl state={state} />}
                  {s.id === "settings" && <SceneSettings state={state} idPrefix={`${idPrefix}-settings`} />}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
