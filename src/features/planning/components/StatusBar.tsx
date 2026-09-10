import type { PlanningState } from "../hooks/usePlanningState";
import { TYPE_LABEL } from "../lib/factory";

interface StatusBarProps {
  state: PlanningState;
  scaleLabel: string;
}

function Item({ label, value, className = "" }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex min-w-0 items-baseline gap-1.5 ${className}`}>
      <span className="text-[10.5px] font-bold uppercase tracking-wider text-faint">{label}</span>
      <span className="truncate text-[12px] font-semibold text-ink">{value}</span>
    </span>
  );
}

/** Compact studio-only status strip. */
export function StatusBar({ state, scaleLabel }: StatusBarProps) {
  const { selection, selectedObject, objects, saveState, toolDef, notice } = state;
  const selectedLabel =
    selection === "site" ? "Site" : selectedObject ? (selectedObject.type === "building" ? `Building ${selectedObject.name}` : `${TYPE_LABEL[selectedObject.type]} · ${selectedObject.name}`) : "None";
  const status = saveState === "saving" ? "Saving…" : saveState === "dirty" ? "Unsaved" : saveState === "error" ? "Save failed" : "Saved";

  return (
    <div className="flex h-8 shrink-0 items-center gap-4 overflow-hidden border-t border-line bg-white px-3 text-xs sm:gap-5" aria-label="Studio status">
      <Item label="Selected" value={selectedLabel} className="min-w-0 max-w-[40%] shrink" />
      <Item label="Objects" value={objects.length.toLocaleString("en-US")} />
      <Item label="Scale" value={scaleLabel} className="hidden sm:inline-flex" />
      <Item label="Units" value="Metric" className="hidden md:inline-flex" />
      <Item label="Tool" value={toolDef.label} className="hidden lg:inline-flex" />
      <span className="ml-auto flex min-w-0 items-center gap-4">
        <span className="min-w-0 truncate text-[12px] font-semibold text-primary" role="status" aria-live="polite">
          {notice && <span className="animate-fade-in motion-reduce:animate-none">{notice}</span>}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${saveState === "dirty" ? "bg-warning" : saveState === "error" ? "bg-danger" : "bg-success"}`}
            aria-hidden="true"
          />
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-faint">Status</span>
          <span className="text-[12px] font-semibold text-ink">{status}</span>
        </span>
      </span>
    </div>
  );
}
