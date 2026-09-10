import type { SpatialDataset } from "../../../visualization/types/visualization.types";
import type { AnalysisOverlay } from "../../types/analysis.types";

/** Props every analysis overlay renderer receives from AnalysisMap. */
export interface OverlayProps {
  overlay: AnalysisOverlay;
  /** The shared spatial dataset (read-only; overlays never copy it). */
  data: SpatialDataset;
  selectedId: string | null;
  focusId: string | null;
  scale: number;
  onSelect: (id: string) => void;
}
