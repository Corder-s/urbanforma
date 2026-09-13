import type { LucideIcon } from "lucide-react";
import { Box, Boxes, Building2, Layers, Mountain, Ruler, TreePine, Waves, AlertTriangle } from "lucide-react";
import { formatArea, formatBytes, formatMetres, formatVolumeM3 } from "../data/bim.data";
import type { BimQuantities } from "../lib/bimModel";
import type { BimModel } from "../types/bim.types";

interface MetricsCardsProps {
  quantities: BimQuantities | null;
  model: BimModel | null;
  openIssues: number;
  /** Registered model records for the project (the "Models" card). */
  modelCount?: number;
  /** Compact variant for the dashboard sidebar. */
  compact?: boolean;
}

interface Tile {
  id: string;
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
}

/**
 * Model quantities — the numbers a BIM coordinator reads first. Every value is
 * computed from the derived element set (`computeQuantities`), so the cards and
 * the report section can never disagree.
 */
export function MetricsCards({ quantities, model, openIssues, modelCount, compact = false }: MetricsCardsProps) {
  if (!quantities) {
    return (
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-[74px] animate-pulse rounded-2xl border border-line bg-surface-2 motion-reduce:animate-none" />
        ))}
      </div>
    );
  }

  const tiles: Tile[] = [];
  if (modelCount !== undefined) {
    tiles.push({
      id: "models",
      label: "Models",
      value: String(modelCount),
      hint: modelCount === 1 ? "One registered model record" : "Registered model records",
      icon: Boxes,
    });
  }
  tiles.push(
    { id: "elements", label: "Elements", value: quantities.elements.toLocaleString("en-US"), hint: `${quantities.mappedPlanningObjects} mapped to planning objects`, icon: Box },
    {
      id: "buildings",
      label: "Buildings",
      value: String(quantities.buildings),
      hint: `${quantities.detailedBuildings} detailed (LOD 300) · ${Math.max(0, quantities.buildings - quantities.detailedBuildings)} massing`,
      icon: Building2,
    },
    { id: "gfa", label: "Gross floor area", value: formatArea(quantities.grossFloorAreaM2), hint: `${formatArea(quantities.footprintM2)} footprint`, icon: Ruler },
    { id: "volume", label: "Gross volume", value: formatVolumeM3(quantities.volumeM3), hint: "Sum of the modelled building volumes", icon: Mountain },
    { id: "levels", label: "Levels", value: String(quantities.levels), hint: `${quantities.walls} walls · ${quantities.floors} slabs`, icon: Layers },
    { id: "openings", label: "Openings", value: String(quantities.openings), hint: "Doors and windows in the detailed buildings", icon: Box },
    { id: "roads", label: "Road network", value: formatMetres(quantities.roadLengthM), hint: "Carriageways and paths in the model", icon: Waves },
    { id: "landscape", label: "Landscape", value: formatArea(quantities.landscapeM2), hint: "Green and open-space elements (water excluded)", icon: TreePine }
  );

  if (model) {
    tiles.push({ id: "size", label: "Model record", value: formatBytes(model.sizeBytes), hint: `${model.format} · ${model.schema} · ${model.versions.length} revisions`, icon: Box });
  }
  tiles.push({ id: "issues", label: "Open issues", value: String(openIssues), hint: openIssues === 0 ? "Nothing outstanding" : "Coordination findings to review", icon: AlertTriangle });

  return (
    <div className={`grid gap-2 ${compact ? "grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4"}`}>
      {tiles.map((t) => (
        <article key={t.id} className="rounded-2xl border border-line bg-surface p-3 shadow-soft">
          <div className="flex items-start gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
              <t.icon size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[11px] font-bold uppercase tracking-wide text-muted">{t.label}</h3>
              <p className="mt-0.5 truncate text-[19px] font-extrabold leading-none text-ink tabular-nums" title={t.value}>
                {t.value}
              </p>
            </div>
          </div>
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-muted">{t.hint}</p>
        </article>
      ))}
    </div>
  );
}
