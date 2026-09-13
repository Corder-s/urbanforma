import { Box, Eye, Layers3, MousePointerClick } from "lucide-react";
import { formatArea } from "../data/bim.data";
import type { BimElement, BimModel, BimSceneMode, BimViewMode } from "../types/bim.types";

interface BimStatusBarProps {
  model: BimModel | null;
  elementCount: number;
  shownCount: number;
  sceneObjectCount: number;
  selectedElement: BimElement | null;
  viewMode: BimViewMode;
  sceneMode: BimSceneMode;
  scaleLabel: string;
  coordinateSystem: string;
  revision: number;
}

const SCENE_LABEL: Record<BimSceneMode, string> = { bim: "BIM view", city: "City context", combined: "Combined" };

/** Bottom status strip — the same information density as the other workspaces. */
export function BimStatusBar({
  model,
  elementCount,
  shownCount,
  sceneObjectCount,
  selectedElement,
  viewMode,
  sceneMode,
  scaleLabel,
  coordinateSystem,
  revision,
}: BimStatusBarProps) {
  return (
    <div className="flex h-8 shrink-0 items-center gap-2 overflow-hidden border-t border-line bg-surface px-2.5 text-[11px] text-muted sm:gap-3 sm:px-3">
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <Box size={12} className="shrink-0 text-faint" aria-hidden="true" />
        <span className="truncate font-bold text-ink">{model ? `${model.name} · v${model.version}` : "No model"}</span>
        {revision > 0 && revision < 3 && <span className="shrink-0 rounded-full bg-warning/15 px-1.5 font-bold text-warning">rev {revision}</span>}
      </span>

      <span className="hidden shrink-0 items-center gap-1.5 sm:inline-flex">
        <Layers3 size={12} className="shrink-0 text-faint" aria-hidden="true" />
        <span className="tabular-nums">
          {shownCount.toLocaleString("en-US")}/{elementCount.toLocaleString("en-US")} elements
        </span>
      </span>

      <span className="hidden shrink-0 items-center gap-1.5 md:inline-flex">
        <Eye size={12} className="shrink-0 text-faint" aria-hidden="true" />
        <span className="tabular-nums">{sceneObjectCount} objects drawn</span>
        <span className="text-faint">· {SCENE_LABEL[sceneMode]}</span>
      </span>

      <span className="ml-auto flex min-w-0 shrink items-center gap-2 sm:gap-3">
        {selectedElement && (
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MousePointerClick size={12} className="shrink-0 text-primary" aria-hidden="true" />
            <span className="max-w-[26ch] truncate font-bold text-primary" title={selectedElement.name}>
              {selectedElement.name}
            </span>
            {selectedElement.area !== undefined && <span className="hidden shrink-0 tabular-nums lg:inline">{formatArea(selectedElement.area)}</span>}
          </span>
        )}
        <span className="hidden shrink-0 tabular-nums lg:inline">{viewMode === "2d" ? scaleLabel : "3D perspective"}</span>
        <span className="hidden shrink-0 xl:inline">{coordinateSystem}</span>
        <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 font-bold text-faint">Demo derivation</span>
      </span>
    </div>
  );
}
