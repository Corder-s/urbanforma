import type { Camera2d, VisualizationState } from "../hooks/useVisualizationState";
import type { PanelId } from "./VisualizationToolbar";
import { AnnotationEditor } from "./AnnotationEditor";
import { BeforeAfterComparison } from "./BeforeAfterComparison";
import { InspectorPanel } from "./InspectorPanel";
import { PresentationStoryboard } from "./PresentationStoryboard";
import { SavedViews } from "./SavedViews";
import { SceneControls } from "./SceneControls";
import { SidePanel, type SidePanelTab } from "./SidePanel";

export type SideTab = "scene" | "inspector" | "views" | "annotations" | "compare" | "storyboard";

interface ViewManagerProps {
  state: VisualizationState;
  camera2d: Camera2d;
  tab: SideTab;
  onTab: (t: SideTab) => void;
  onClose?: () => void;
  onNotice: (text: string) => void;
  onPlay: (fromSlideId?: string) => void;
  activeAnnotation: string | null;
  onActiveAnnotation: (id: string | null) => void;
  idPrefix: string;
}

/**
 * Right-hand column: Explore → Scene · Inspector · Views · Annotate · Compare;
 * Present → Storyboard · Views · Annotate · Compare. One component so the
 * docked column and the drawer render exactly the same content.
 */
export function ViewManager({ state, camera2d, tab, onTab, onClose, onNotice, onPlay, activeAnnotation, onActiveAnnotation, idPrefix }: ViewManagerProps) {
  const present = state.mode === "present";
  const tabs: SidePanelTab<SideTab>[] = present
    ? [
        { id: "storyboard", label: "Storyboard", badge: state.presentation.slides.length },
        { id: "views", label: "Views", badge: state.savedViews.views.length },
        { id: "annotations", label: "Annotate", badge: state.annotations.length || undefined },
        { id: "compare", label: "Compare" },
      ]
    : [
        { id: "scene", label: "Scene" },
        { id: "inspector", label: "Inspector", badge: state.selectedObject ? "1" : undefined },
        { id: "views", label: "Views", badge: state.savedViews.views.length },
        { id: "annotations", label: "Annotate", badge: state.annotations.length || undefined },
        { id: "compare", label: "Compare" },
      ];
  const current = tabs.some((t) => t.id === tab) ? tab : tabs[0].id;
  return (
    <SidePanel tabs={tabs} active={current} onTab={onTab} onClose={onClose} label={present ? "Presentation panels" : "Workspace panels"} idPrefix={idPrefix}>
      {current === "scene" && <SceneControls state={state} idPrefix={`${idPrefix}-scene`} embedded />}
      {current === "inspector" && <InspectorPanel state={state} idPrefix={`${idPrefix}-inspector`} embedded />}
      {current === "views" && (
        <div className="p-3">
          <SavedViews state={state} camera2d={camera2d} onNotice={onNotice} />
        </div>
      )}
      {current === "annotations" && (
        <div className="p-3">
          <AnnotationEditor state={state} activeId={activeAnnotation} onActive={onActiveAnnotation} />
        </div>
      )}
      {current === "compare" && <BeforeAfterComparison state={state} />}
      {current === "storyboard" && <PresentationStoryboard state={state} camera2d={camera2d} onPlay={onPlay} onNotice={onNotice} idPrefix={`${idPrefix}-storyboard`} embedded />}
    </SidePanel>
  );
}

/** Maps toolbar panel ids to a side tab (drawer deep links). */
export function tabForPanel(p: PanelId | null): SideTab | null {
  switch (p) {
    case "scene":
      return "scene";
    case "inspector":
      return "inspector";
    case "views":
      return "views";
    case "compare":
      return "compare";
    case "storyboard":
      return "storyboard";
    default:
      return null;
  }
}
