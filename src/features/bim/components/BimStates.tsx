import { Box, Info, SearchX, UploadCloud } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { MODEL_STATUS_META } from "../data/bim.data";
import type { BimModel } from "../types/bim.types";

/**
 * BIM-specific empty / notice states. Loading and hard errors reuse the
 * visualization states (`SpatialLoading`, `SpatialError`, `ProjectNotFound`) so
 * the module reads like the rest of the app.
 */

const card = "w-full max-w-md rounded-3xl border border-line bg-surface p-6 text-center shadow-card sm:p-8";

/** Always-visible honesty notice: what this model actually is. */
export function DemoModelNote({ model, elementCount, className = "" }: { model: BimModel; elementCount: number; className?: string }) {
  const meta = MODEL_STATUS_META[model.status];
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-left ${className}`}>
      <Info size={15} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
      <p className="text-[11.5px] leading-relaxed text-muted">
        <span className="font-bold text-ink">Demo model</span> — {elementCount.toLocaleString("en-US")} elements derived from this
        project's geometry ({model.format} · {model.schema} record, {meta.label.toLowerCase()}). No IFC/RVT parser is connected in this
        release, so an imported file is registered but not processed.
      </p>
    </div>
  );
}

export function NoModelReady({ onImport, onSync, syncing }: { onImport: () => void; onSync: () => void; syncing?: boolean }) {
  return (
    <div className="grid h-full min-h-[320px] place-items-center bg-canvas p-6">
      <div className={card}>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true">
          <Box size={22} />
        </span>
        <h2 className="mt-3 text-[17px] font-extrabold text-ink">No usable model</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          This project has no model that can be opened. Derive one from the current project geometry, or register an IFC / RVT / glTF
          file — importing needs the BIM processing service, which is not connected yet.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button size="sm" variant="secondary" onClick={onSync} loading={syncing}>
            <Box size={15} aria-hidden="true" /> Derive from geometry
          </Button>
          <Button size="sm" variant="ghost" onClick={onImport}>
            <UploadCloud size={15} aria-hidden="true" /> Import file
          </Button>
        </div>
      </div>
    </div>
  );
}

export function NoElementsMatch({ query, filterCount, onReset }: { query: string; filterCount: number; onReset: () => void }) {
  return (
    <div className="grid place-items-center px-4 py-10 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-surface-2 text-muted" aria-hidden="true">
        <SearchX size={20} />
      </span>
      <p className="mt-3 text-[13.5px] font-bold text-ink">No elements match</p>
      <p className="mt-1 max-w-[34ch] text-[12px] leading-relaxed text-muted">
        {query ? `Nothing in this model matches “${query}”` : "The active filters exclude every element"}
        {filterCount > 0 ? ` · ${filterCount} filter${filterCount === 1 ? "" : "s"} active` : ""}.
      </p>
      <Button size="sm" variant="ghost" className="mt-3" onClick={onReset}>
        Clear search & filters
      </Button>
    </div>
  );
}
