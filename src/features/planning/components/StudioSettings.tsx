import { useEffect, useRef } from "react";
import { RotateCcw, X } from "lucide-react";
import { Checkbox } from "../../../components/ui/Checkbox";
import { Button } from "../../../components/ui/Button";
import { discardLocalPlan, hasLocalPlan } from "../services/planning.service";
import type { PlanningState } from "../hooks/usePlanningState";

interface StudioSettingsProps {
  state: PlanningState;
  projectId: string;
  onClose: () => void;
  onReload: () => void;
}

/** Small settings popover anchored under the toolbar (display + local data). */
export function StudioSettings({ state, projectId, onClose, onReload }: StudioSettingsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const local = hasLocalPlan(projectId);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("input, button")?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Studio settings"
      className="absolute right-3 top-2 z-30 w-72 max-w-[calc(100%-1.5rem)] rounded-2xl border border-line bg-surface p-3 shadow-float animate-pop motion-reduce:animate-none"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-faint">Studio settings</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close settings"
          className="grid h-7 w-7 place-items-center rounded-md text-faint hover:bg-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
        >
          <X size={15} />
        </button>
      </div>
      <ul className="grid gap-1">
        <li className="rounded-lg px-1.5 py-1.5 hover:bg-surface-2">
          <Checkbox id="st-grid" label="Show grid" checked={state.settings.showGrid} onChange={(v) => state.setSettings((s) => ({ ...s, showGrid: v }))} />
        </li>
        <li className="rounded-lg px-1.5 py-1.5 hover:bg-surface-2">
          <Checkbox id="st-snap" label="Snap to 5 m grid" checked={state.settings.snapToGrid} onChange={(v) => state.setSettings((s) => ({ ...s, snapToGrid: v }))} />
        </li>
        <li className="rounded-lg px-1.5 py-1.5 hover:bg-surface-2">
          <Checkbox id="st-labels" label="Show labels" checked={state.settings.showLabels} onChange={(v) => state.setSettings((s) => ({ ...s, showLabels: v }))} />
        </li>
      </ul>
      <div className="mt-3 border-t border-line pt-3">
        <p className="text-[12px] font-semibold text-ink">Local data</p>
        <p className="mt-0.5 text-[11.5px] leading-snug text-muted">
          {local ? "This plan has locally saved edits in this browser." : "No local edits saved yet — the demo plan is shown."}
        </p>
        <Button
          size="sm"
          variant="secondary"
          className="mt-2"
          fullWidth
          disabled={!local}
          onClick={() => {
            if (!window.confirm("Discard locally saved edits and reload the demo plan?")) return;
            discardLocalPlan(projectId);
            onClose();
            onReload();
          }}
        >
          <RotateCcw size={14} /> Reset to demo plan
        </Button>
        <p className="mt-2 text-[11px] text-faint">Future: PUT /api/projects/:id/plan</p>
      </div>
    </div>
  );
}
